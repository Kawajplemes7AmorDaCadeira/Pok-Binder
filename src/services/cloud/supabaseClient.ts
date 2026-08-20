/**
 * Supabase Client Initialization & Configuration Service
 * Provides safe client creation, connection checking, and auth session helpers.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Safe environment variable resolution across Vite and Node.js test runners
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    !supabaseUrl.includes('placeholder')
);

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return clientInstance;
}

export class SupabaseService {
  /**
   * Check if Supabase connection is active and reachable
   */
  public static async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { connected: false, error: 'Supabase não está configurado nas variáveis de ambiente (.env).' };
    }

    try {
      const { error } = await client.from('profiles').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        return { connected: false, error: error.message };
      }
      return { connected: true };
    } catch (err: any) {
      return { connected: false, error: err.message || 'Erro de conexão com o Supabase' };
    }
  }

  /**
   * Get current authenticated user
   */
  public static async getCurrentUser(): Promise<User | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data: { user } } = await client.auth.getUser();
      return user;
    } catch {
      return null;
    }
  }

  /**
   * Sign in with Google OAuth
   */
  public static async signInWithGoogle(redirectTo?: string): Promise<{ url?: string | null; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Supabase não está configurado.' };
    }

    try {
      const targetUrl = redirectTo || (typeof window !== 'undefined' ? window.location.origin : '');
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: targetUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) return { error: error.message };
      return { url: data.url };
    } catch (err: any) {
      return { error: err.message || 'Falha na autenticação Google' };
    }
  }

  /**
   * Sign out current user
   */
  public static async signOut(): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: true };

    try {
      const { error } = await client.auth.signOut();
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
