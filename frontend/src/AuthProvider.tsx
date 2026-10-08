import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { authReturnAtBoot, callbackErrorAtBoot, callbackMessage, cleanCallbackErrorUrl } from "./auth/redirect";
import { withAuthTimeout } from "./auth/requests";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue } from "./AuthContext";
import { supabase } from "./supabase";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<{ session: Session | null; pending: boolean; error: string | null }>({ session: null, pending: true, error: null });
  const [retry, setRetry] = useState(0);
  const [callbackError, setCallbackError] = useState(callbackErrorAtBoot);
  const [authReturned, setAuthReturned] = useState(authReturnAtBoot);
  const retrySession = useCallback(() => setRetry(value => value + 1), []);
  const clearCallbackError = useCallback(() => setCallbackError(null), []);
  const finishAuthReturn = useCallback(() => setAuthReturned(false), []);

  useEffect(() => {
    let active = true, reading = true, revision = 0;
    let lastUserId: string | null = null;
    setState(previous => ({ ...previous, pending: true, error: null }));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION cannot distinguish a failed read from a confirmed guest.
      if (!active || event === "INITIAL_SESSION" || reading && event === "SIGNED_OUT") return;
      const newSignIn = event === "SIGNED_IN" && !reading && session?.user.id !== lastUserId;
      lastUserId = session?.user.id ?? null;
      revision++;
      setState({ session, pending: false, error: null });
      if (newSignIn) { setCallbackError(null); setAuthReturned(true); }
    });
    const initialRevision = revision;
    const read = async () => {
      const initialized = await supabase.auth.initialize();
      if (initialized.error && authReturnAtBoot) {
        if (active) setCallbackError(callbackMessage(initialized.error.code || ""));
        cleanCallbackErrorUrl();
      } else if (initialized.error && !callbackErrorAtBoot && retry === 0) throw initialized.error;
      const result = await supabase.auth.getSession();
      if (result.error) throw result.error;
      return result.data.session;
    };
    void withAuthTimeout(read()).then(session => {
      if (active && revision === initialRevision) { lastUserId = session?.user.id ?? null; setState({ session, pending: false, error: null }); }
    }).catch(() => {
      if (active && revision === initialRevision) setState(previous => ({ ...previous, pending: false, error: "Your sign-in status could not be checked. Try checking again." }));
    }).finally(() => {
      reading = false;
      if (active && callbackErrorAtBoot) cleanCallbackErrorUrl();
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [retry]);

  const value: AuthContextValue = {
    user: state.session?.user ?? null,
    session: state.session,
    // Keep game/account consumers gated until guest or account is confirmed.
    loading: state.pending || !!state.error,
    error: state.error, retrySession, callbackError, clearCallbackError, authReturned, finishAuthReturn,

    signInWithGoogle: async (redirectTo?: string) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error("missing-auth-url");
      return data.url;
    },

    signInWithEmail: async (email: string, redirectTo?: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      if (error) throw error;
    },

    // Preserve local-only logout; do not revoke other sessions.
    signOut: async () => {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) setState(previous => ({ ...previous, error: "Sign-out could not be confirmed. Check your account before trying again." }));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
