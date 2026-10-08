import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function PrivateRoute() {
  const { user, loading, error, retrySession } = useAuth();
  const location = useLocation();
  const outletContext = useOutletContext();

  if (error) return <div className="hq-page hq-panel hq-page-panel"><h1 className="hq-page-heading">Check your account</h1><p className="hq-status" role="alert">{error}</p><button className="hq-primary" onClick={retrySession}>Retry sign-in check</button></div>;
  if (loading) return <div className="hq-page" role="status">Checking your sign-in status…</div>;
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`} replace />;
  }
  return <Outlet context={outletContext} />;
}
