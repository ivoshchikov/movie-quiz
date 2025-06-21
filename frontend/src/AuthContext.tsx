// src/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth } from "./supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

/* ---- тип контекста ---- */
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/* ---- контекст ---- */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ---- провайдер ---- */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* начальная сессия и подписка на изменения */
  useEffect(() => {
    // 1) получить текущую сессию
    auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2) слушать изменения
    const subscription = auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* методы */
  const value: AuthContextValue = {
    user,
    session,
    loading,
    signInWithGoogle: () => auth.signInWithGoogle(),
    signInWithEmail: (email) => auth.signInWithEmail(email),
    signOut: () => auth.signOut(), // scope: "local" уже задано в supabaseClient
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ---- хук удобного доступа ---- */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
