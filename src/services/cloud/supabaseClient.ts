/**
 * Supabase Client Initialization & Configuration Service
 * Provides safe client creation, connection checking, and auth session helpers.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Safe environment variable resolution across Vite, Node.js test runners and localStorage overrides
export const getSupabaseConfig = (): { url: string; anonKey: string } => {
  let url = '';
  let anonKey = '';

  if (typeof localStorage !== 'undefined') {
    url = localStorage.getItem('POKEBINDER_SUPABASE_URL') || '';
    anonKey = localStorage.getItem('POKEBINDER_SUPABASE_ANON_KEY') || '';
  }

  if (!url) {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_URL) {
      url = (import.meta as any).env.VITE_SUPABASE_URL;
    } else if (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) {
      url = process.env.VITE_SUPABASE_URL;
    }
  }

  if (!url || url === 'https://your-project.supabase.co') {
    url = 'https://hefrdbyqchvvvqyacbkm.supabase.co';
  }

  if (!anonKey) {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_ANON_KEY) {
      anonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
    } else if (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) {
      anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    }
  }

  if (!anonKey || anonKey === 'your-anon-public-key' || anonKey === 'your-anon-public-key-here') {
    anonKey = 'sb_publishable_nNOtomjofTIbkBvMFcpDIA_q4ZNwi6k';
  }

  return { url, anonKey };
};

const initialConfig = getSupabaseConfig();
export const supabaseUrl = initialConfig.url;
export const supabaseAnonKey = initialConfig.anonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    !supabaseUrl.includes('placeholder') &&
    supabaseAnonKey !== 'your-anon-public-key' &&
    supabaseAnonKey !== 'your-anon-public-key-here'
);

let clientInstance: SupabaseClient | null = null;

export function setCustomSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('POKEBINDER_SUPABASE_URL', url.trim());
    localStorage.setItem('POKEBINDER_SUPABASE_ANON_KEY', anonKey.trim());
  }
  clientInstance = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  const configured = Boolean(
    url &&
    anonKey &&
    url !== 'https://your-project.supabase.co' &&
    !url.includes('placeholder') &&
    anonKey !== 'your-anon-public-key' &&
    anonKey !== 'your-anon-public-key-here'
  );

  if (!configured) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(url, anonKey, {
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
   * Sign in with Email and Password
   */
  public static async signInWithPassword(email: string, password: string): Promise<{ user?: User | null; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Supabase não está configurado.' };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) return { error: error.message };
      return { user: data.user };
    } catch (err: any) {
      return { error: err.message || 'Falha ao autenticar com email/senha.' };
    }
  }

  /**
   * Sign up with Email and Password
   */
  public static async signUp(email: string, password: string, displayName?: string): Promise<{ user?: User | null; session?: any; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Supabase não está configurado.' };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });

      if (error) return { error: error.message };
      return { user: data.user, session: data.session };
    } catch (err: any) {
      return { error: err.message || 'Falha ao criar conta.' };
    }
  }

  /**
   * Sign in with Magic Link / OTP
   */
  public static async signInWithOtp(email: string, redirectTo?: string): Promise<{ error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Supabase não está configurado.' };
    }

    try {
      const targetUrl = redirectTo || (typeof window !== 'undefined' ? window.location.origin : '');
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: targetUrl,
        },
      });

      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Falha ao enviar Magic Link.' };
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
