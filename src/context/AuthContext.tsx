/**
 * AuthContext.tsx
 * Supabase Authentication Provider supporting Google OAuth, Guest Mode, and Session Synchronization.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured, SupabaseService } from '../services/cloud/supabaseClient';
import { SyncService } from '../services/cloud/sync/SyncService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<{ error?: string }>;
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
        signOut,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
