/**
 * AuthContext.tsx
 * Authenticated Device & Account Provider using official Supabase Authentication (auth.users).
 * Supports standard email/password user creation, Google OAuth, and multi-device Sync Code login.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured, SupabaseService } from '../services/cloud/supabaseClient';
import { SyncService } from '../services/cloud/sync/SyncService';
import { LocalMigrationService } from '../services/cloud/sync/LocalMigrationService';
import { RealtimeSyncService } from '../services/cloud/sync/RealtimeSyncService';

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
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
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

/**
 * Ensures that any device sync code is registered in official Supabase Authentication (auth.users)
 */
const authenticateSyncCodeUser = async (client: any, code: string): Promise<User | null> => {
  const cleanCode = (code || 'MEU-BINDER-PRO').trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'meubinderpro';
  const autoEmail = `binder_${cleanCode}@pokebinder.app`;
  const autoPassword = `Pokebinder_${cleanCode}_2026!Pass`;

  try {
    // 1. Attempt Sign In first
    const { data: signInData } = await client.auth.signInWithPassword({
      email: autoEmail,
      password: autoPassword,
    });

    if (signInData?.user) return signInData.user;

    // 2. If Sign In failed, create account in official auth.users
    const { data: signUpData } = await client.auth.signUp({
      email: autoEmail,
      password: autoPassword,
      options: {
        data: {
          display_name: `Binder (${code.toUpperCase()})`,
        },
      },
    });

    if (signUpData?.user) return signUpData.user;

    return null;
  } catch (err) {
    console.warn('Sync code auto-auth exception:', err);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [syncCode, setSyncCode] = useState<string>(getStoredSyncCode());

  useEffect(() => {
    const initAuth = async () => {
      const client = getSupabaseClient();
      if (!client) {
        setLoading(false);
        return;
      }

      try {
        // Fetch existing session
        const { data: { session } } = await client.auth.getSession();
        let activeUser = session?.user || null;

        // If no user, automatically register/login using the active sync code
        if (!activeUser) {
          activeUser = await authenticateSyncCodeUser(client, syncCode);
        }

        if (activeUser) {
          setUser(activeUser);
          setIsGuest(false);
          SyncService.setUser(activeUser.id, activeUser.email || null);
          LocalMigrationService.migrateToCloud(activeUser.id).catch(() => {});
          SyncService.syncNow().catch(() => {});
        }

        // Listen for session changes (OAuth, password login, logout)
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
    const formatted = newCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
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
      const authUser = await authenticateSyncCodeUser(client, formatted);
      if (authUser) {
        setUser(authUser);
        setIsGuest(false);
        SyncService.setUser(authUser.id, authUser.email || null);
        await LocalMigrationService.migrateToCloud(authUser.id).catch(() => {});
        await SyncService.syncNow().catch(() => {});
        RealtimeSyncService.notifyChange('all', 'SYNC_COMPLETE', null);
        return {};
      }
      return { error: 'Não foi possível conectar com este código.' };
    } catch (e: any) {
      return { error: e?.message || 'Erro ao conectar com código.' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Creates a user in the official Supabase Authentication table (auth.users)
   */
  const signUp = async (email: string, password: string, displayName?: string): Promise<{ error?: string }> => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  /**
   * Signs in an existing user from the official Supabase Authentication table (auth.users)
   */
  const signInWithPassword = async (email: string, password: string): Promise<{ error?: string }> => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  const signInWithOtp = async (email: string): Promise<{ error?: string }> => {
    return SupabaseService.signInWithOtp(email);
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    const res = await SupabaseService.signInWithGoogle();
    if (res.error) return { error: res.error };
    if (res.url && typeof window !== 'undefined') {
      window.location.href = res.url;
    }
    return {};
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await SupabaseService.signOut();
      const defaultCode = 'MEU-BINDER-PRO';
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('POKEBINDER_SYNC_CODE');
      }
      setSyncCode(defaultCode);
      const client = getSupabaseClient();
      if (client) {
        const syncUser = await authenticateSyncCodeUser(client, defaultCode);
        if (syncUser) {
          setUser(syncUser);
          SyncService.setUser(syncUser.id, syncUser.email || null);
          SyncService.syncNow().catch(() => {});
        }
      }
    } finally {
      setLoading(false);
    }
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
