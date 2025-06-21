// frontend/src/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase, auth } from "./supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
  user:    User | null;
  session: Session | null;
  loading: boolean;

  signInWithGoogle: () => Promise<void>;
  signInWithEmail:  (email: string) => Promise<void>;
  signOut:          () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user,    setUser]    = useState<User   | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── начальная сессия ───────────────────────────────── */
  useEffect(() => {
    auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    /* ── подписка на изменения ───────────────────────── */
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  /* ── методы ─────────────────────────────────────────── */
  const value: AuthContextValue = {
    user,
    session,
    loading,

    signInWithGoogle: () => auth.signInWithGoogle(),
    signInWithEmail:  (email) => auth.signInWithEmail(email),
    signOut:          () => auth.signOut({ scope: "local" }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
