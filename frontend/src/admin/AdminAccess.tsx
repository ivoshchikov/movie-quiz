import { useCallback } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useReadRequest } from "../hooks/useReadRequest";
import { checkAdminRights } from "./dailyApi";

export function AdminNavigation() {
  return (
    <nav className="hq-admin-nav" aria-label="Administration">
      <NavLink to="/admin/questions">Question bank</NavLink>
      <NavLink to="/admin/daily">Daily</NavLink>
    </nav>
  );
}
export default function AdminAccess({ children }: { children: ReactNode }) {
  const { user, loading, error, retrySession } = useAuth();
  const location = useLocation();
  const load = useCallback(
    (signal: AbortSignal) => checkAdminRights(signal),
    [],
  );
  const rights = useReadRequest(
    user?.id ?? "",
    load,
    !!user && !loading && !error,
  );
  if (error)
    return (
      <section className="hq-admin hq-admin-access">
        <h1>Check your account</h1>
        <p role="alert">Your sign-in status could not be checked.</p>
        <button className="hq-secondary" onClick={retrySession}>
          Retry account check
        </button>
      </section>
    );
  if (loading || rights.loading)
    return (
      <section className="hq-admin hq-admin-access">
        <h1>Question bank</h1>
        <p role="status">Checking administrator access…</p>
      </section>
    );
  if (!user)
    return (
      <section className="hq-admin hq-admin-access">
        <h1>Administration</h1>
        <p>Log in with the administrator account to continue.</p>
        <Link
          className="hq-primary"
          to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        >
          Log in to administration
        </Link>
      </section>
    );
  if (rights.error)
    return (
      <section className="hq-admin hq-admin-access">
        <h1>Administration</h1>
        <p role="alert">Administrator access could not be checked.</p>
        <button className="hq-secondary" onClick={rights.retry}>
          Retry access check
        </button>
      </section>
    );
  if (!rights.value)
    return (
      <section className="hq-admin hq-admin-access">
        <h1>Access denied</h1>
        <p>This section is available only to the site administrator.</p>
        <Link className="hq-secondary" to="/">
          Back to home
        </Link>
      </section>
    );
  return (
    <div key={user.id}>
      <AdminNavigation />
      {children}
    </div>
  );
}
