import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function PrivateRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const outletContext = useOutletContext();

  if (loading) {
    return <div>Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ redirectTo: location.pathname + location.search }} />;
  }
  return <Outlet context={outletContext} />;
}
