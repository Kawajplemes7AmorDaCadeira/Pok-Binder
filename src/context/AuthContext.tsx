/**
 * AuthContext.tsx
 * Supabase Authentication Provider supporting Google OAuth, Guest Mode, and Session Synchronization.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured, SupabaseService } from '../services/cloud/supabaseClient';
import { SyncService } from '../services/cloud/sync/SyncService';
import { LocalMigrationService } from '../services/cloud/sync/LocalMigrationService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  isGuest: boolean;
  syncCode: string;
  setSyncCodeAndConnect: (code: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signInWithOtp: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const getStoredSyncCode = (): string => {
  if (typeof localStorage !== 'undefined') {
    const code = localStorage.getItem('POKEBINDER_SYNC_CODE');
    if (code && code.trim()) return code.trim().toUpperCase();
  }
  return 'MEU-BINDER-PRO';
};

const autoLoginSyncAccount = async (client: any, customCode?: string): Promise<User | null> => {
  const rawCode = customCode || getStoredSyncCode();
  const cleanCode = rawCode.replace(/[^A-Z0-9]/gi, '').toLowerCase() || 'meubinderpro';
  const autoEmail = `binder_${cleanCode}@pokebinder.app`;
  const autoPassword = `Pokebinder_${cleanCode}_2026!Pass`;

  try {
    // 1. Try sign in first
    const { data: signInData } = await client.auth.signInWithPassword({
      email: autoEmail,
      password: autoPassword,
    });

    if (signInData?.user) {
      return signInData.user;
    }

    // 2. If sign in failed, try sign up
    const { data: signUpData } = await client.auth.signUp({
      email: autoEmail,
      password: autoPassword,
    });

    if (signUpData?.user) {
      return signUpData.user;
    }

    // 3. Fallback to default user if needed
    const { data: fallbackData } = await client.auth.signInWithPassword({
      email: 'kawajplemes7@gmail.com',
      password: 'Pokebinder123!',
    });

    return fallbackData?.user || null;
  } catch (err) {
    console.warn('Auto-login exception:', err);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [syncCode, setSyncCode] = useState<string>(getStoredSyncCode());

  useEffect(() => {
    const initAuth = async () => {
      await SyncService.init();

      if (!isSupabaseConfigured) {
        setLoading(false);
        setIsGuest(true);
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        setLoading(false);
        return;
      }

      try {
        // Fetch current session
        const { data: { session } } = await client.auth.getSession();
        let currentUser = session?.user || null;

        // If no user session, auto-login silently without asking user for credentials!
        if (!currentUser) {
          currentUser = await autoLoginSyncAccount(client, syncCode);
        }

        if (currentUser) {
          setUser(currentUser);
          setIsGuest(false);
          SyncService.setUser(currentUser.id, currentUser.email || null);
          LocalMigrationService.migrateToCloud(currentUser.id).catch(() => {});
          SyncService.syncNow().catch(() => {});
        } else {
          setUser(null);
          setIsGuest(true);
          SyncService.setUser(null);
        }

        // Listen for auth state changes
        const { data: { subscription } } = client.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (newSession?.user) {
              setUser(newSession.user);
              setIsGuest(false);
              SyncService.setUser(newSession.user.id, newSession.user.email || null);
              LocalMigrationService.migrateToCloud(newSession.user.id).catch(() => {});
              SyncService.syncNow().catch(() => {});
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const setSyncCodeAndConnect = async (newCode: string): Promise<{ error?: string }> => {
    const formatted = newCode.trim().toUpperCase();
    if (!formatted) {
      return { error: 'Por favor, insira um código válido.' };
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('POKEBINDER_SYNC_CODE', formatted);
    }
    setSyncCode(formatted);

    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase não inicializado.' };

    setLoading(true);
    try {
      const newUser = await autoLoginSyncAccount(client, formatted);
      if (newUser) {
        setUser(newUser);
        setIsGuest(false);
        SyncService.setUser(newUser.id, newUser.email || null);
        await LocalMigrationService.migrateToCloud(newUser.id).catch(() => {});
        await SyncService.syncNow().catch(() => {});
        return {};
      }
      return { error: 'Não foi possível conectar com esse código.' };
    } catch (e: any) {
      return { error: e?.message || 'Erro ao conectar.' };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase não configurado. Verifique as credenciais no .env' };
    }
    const res = await SupabaseService.signInWithGoogle();
    if (res.error) return { error: res.error };
    return {};
  };

  const signInWithPassword = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase não configurado.' };
    }
    const res = await SupabaseService.signInWithPassword(email, password);
    if (res.error) return { error: res.error };
    if (res.user) {
      setUser(res.user);
      setIsGuest(false);
      SyncService.setUser(res.user.id, res.user.email || null);
      await LocalMigrationService.migrateToCloud(res.user.id).catch(() => {});
      await SyncService.syncNow().catch(() => {});
    }
    return {};
  };

  const signUp = async (email: string, password: string, displayName?: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase não configurado.' };
    }
    const res = await SupabaseService.signUp(email, password, displayName);
    if (res.error) return { error: res.error };
    if (res.user) {
      setUser(res.user);
      setIsGuest(false);
      SyncService.setUser(res.user.id, res.user.email || null);
      await LocalMigrationService.migrateToCloud(res.user.id).catch(() => {});
      await SyncService.syncNow().catch(() => {});
    }
    return {};
  };

  const signInWithOtp = async (email: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase não configurado.' };
    }
    return SupabaseService.signInWithOtp(email);
  };

  const signOut = async () => {
    await SupabaseService.signOut();
    setUser(null);
    setIsGuest(true);
    SyncService.setUser(null);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isSupabaseConfigured,
        isGuest,
        syncCode,
        setSyncCodeAndConnect,
        signInWithGoogle,
        signInWithPassword,
        signUp,
        signInWithOtp,
        signOut,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
