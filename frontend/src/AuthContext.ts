import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  retrySession: () => void;
  callbackError: string | null;
  clearCallbackError: () => void;
  authReturned: boolean;
  finishAuthReturn: () => void;
  signInWithGoogle: (redirectTo?: string) => Promise<string>;
  signInWithEmail: (email: string, redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
