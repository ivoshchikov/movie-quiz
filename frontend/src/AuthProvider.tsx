import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue } from "./AuthContext";
import { supabase } from "./supabase";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

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

    signInWithGoogle: async (redirectTo?: string) => {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: redirectTo ? { redirectTo } : undefined,
      });
    },

    signInWithEmail: async (email: string, redirectTo?: string) => {
      await supabase.auth.signInWithOtp({
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
    },

    // Preserve local-only logout; do not revoke other sessions.
    signOut: async () => {
      await supabase.auth.signOut({ scope: "local" });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
