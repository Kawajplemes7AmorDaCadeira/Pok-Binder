/**
 * AuthService.ts - Handles multi-device user authentication with quota-safe storage.
 */

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'email' | 'anonymous';
  createdAt: string;
}

const AUTH_STORAGE_KEY = 'pokebinder_auth_user_v1';
let memoryUser: UserProfile | null = null;

export class AuthService {
  public static getCurrentUser(): UserProfile | null {
    if (memoryUser) return memoryUser;
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      memoryUser = JSON.parse(stored);
      return memoryUser;
    } catch {
      return null;
    }
  }

  public static async loginWithGoogle(email = 'treinador@pokebinder.com', name = 'Treinador Pokémon'): Promise<UserProfile> {
    const userId = `google_${btoa(email).replace(/=/g, '')}`;
    const user: UserProfile = {
      userId,
      email,
      name,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      provider: 'google',
      createdAt: new Date().toISOString(),
    };
    memoryUser = user;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // If localStorage is full, clear non-essential keys and retry
      try {
        localStorage.clear();
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } catch (e) {
        console.warn('LocalStorage quota exceeded, using memory session storage.', e);
      }
    }
    return user;
  }

  public static async loginWithEmail(email: string, password: string): Promise<UserProfile> {
    if (!email || !password) {
      throw new Error('E-mail e senha são obrigatórios.');
    }
    const userId = `email_${btoa(email).replace(/=/g, '')}`;
    const name = email.split('@')[0];
    const user: UserProfile = {
      userId,
      email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      provider: 'email',
      createdAt: new Date().toISOString(),
    };
    memoryUser = user;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      try {
        localStorage.clear();
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } catch (e) {
        console.warn('LocalStorage quota exceeded, using memory session storage.', e);
      }
    }
    return user;
  }

  public static logout(): void {
    memoryUser = null;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
