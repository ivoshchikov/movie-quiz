// frontend/src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";

export const SUPABASE_URL =
  "https://vgjfbcihppxbtrjcxoci.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnamZiY2locHB4YnRyamN4b2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTE0MTUsImV4cCI6MjA2NTQ4NzQxNX0.lIhRN58OZJuhNBCkE1CRzzfEiU601rrKmlJIdqScHpA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Утилитарная обёртка над Supabase Auth.
 * Её и импортируем как `auth`.
 */
export const auth = {
  // Войти через Google OAuth
  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({ provider: "google" }),

  // Войти по email-ссылке
  signInWithEmail: (email: string) =>
    supabase.auth.signInWithOtp({ email }),

  // Выйти
  signOut: () => supabase.auth.signOut(),

  // Получить текущую сессию
  getSession: () => supabase.auth.getSession(),

  // Подписка на изменения сессии
  onAuthStateChange: (
    callback: (event: string, session: Session | null) => void
  ) => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;          // чтобы потом можно было отписаться
  },
};
