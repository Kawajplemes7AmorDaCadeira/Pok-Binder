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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);

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
        if (session?.user) {
          setUser(session.user);
          setIsGuest(false);
          SyncService.setUser(session.user.id, session.user.email || null);
          LocalMigrationService.migrateToCloud(session.user.id).catch(() => {});
          SyncService.syncNow().catch(() => {});
        } else {
          setUser(null);
          setIsGuest(true);
          SyncService.setUser(null);
        }

        // Listen for auth state changes (OAuth redirects, token refresh, logout)
        const { data: { subscription } } = client.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (newSession?.user) {
              setUser(newSession.user);
              setIsGuest(false);
              SyncService.setUser(newSession.user.id, newSession.user.email || null);
              LocalMigrationService.migrateToCloud(newSession.user.id).catch(() => {});
              SyncService.syncNow().catch(() => {});
            } else {
              setUser(null);
              setIsGuest(true);
              SyncService.setUser(null);
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
      SyncService.syncNow().catch(() => {});
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
      SyncService.syncNow().catch(() => {});
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
