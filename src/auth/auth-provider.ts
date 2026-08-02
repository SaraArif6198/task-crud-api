import { createClient, type User } from "@supabase/supabase-js";

export type AuthUser = Pick<User, "id" | "email" | "created_at" | "app_metadata" | "user_metadata">;

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

export interface AuthProvider {
  signUp(email: string, password: string): Promise<AuthUser>;
  login(email: string, password: string): Promise<AuthSession>;
  verifyToken(token: string): Promise<AuthUser>;
  logout(token: string): Promise<void>;
}

function credentials(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY must be configured");
  }

  return { url, key };
}

function client(token?: string) {
  const { url, key } = credentials();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

export const supabaseAuthProvider: AuthProvider = {
  async signUp(email, password) {
    const { data, error } = await client().auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Supabase did not return a user");
    return data.user;
  },

  async login(email, password) {
    const { data, error } = await client().auth.signInWithPassword({ email, password });
    if (error || !data.session) throw error ?? new Error("Invalid login credentials");
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  async verifyToken(token) {
    const { data, error } = await client().auth.getUser(token);
    if (error || !data.user) throw error ?? new Error("Invalid token");
    return data.user;
  },

  async logout(token) {
    const { error } = await client(token).auth.signOut();
    if (error) throw error;
  },
};
