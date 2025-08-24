// frontend/src/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
  user:    User | null;
  session: Session | null;
  loading: boolean;

  signInWithGoogle: (redirectToAbsUrl?: string) => Promise<void>;
  signInWithEmail:  (email: string) => Promise<void>;
  signOut:          () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user,    setUser]    = useState<User   | null>(null);
  const [loading, setLoading] = useState(true);

  // начальная сессия
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // подписка на изменения
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    loading,

    // Можно передать абсолютный redirect URL, иначе Supabase вернёт на Site URL
    signInWithGoogle: async (redirectToAbsUrl?: string) => {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: redirectToAbsUrl ? { redirectTo: redirectToAbsUrl } : undefined,
      });
      // Фактически произойдёт редирект вне SPA — дальше управление вернётся после логина.
    },

    signInWithEmail: async (email: string) => {
      await supabase.auth.signInWithOtp({ email });
    },

    // локальный logout
    signOut: async () => {
      await supabase.auth.signOut({ scope: "local" });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
