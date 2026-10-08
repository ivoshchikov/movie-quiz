import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { loginReturnPath } from "../auth/redirect";
import metadata from "../loginMetadata.json";
import LoginForm from "./LoginForm";
import Seo from "./Seo";

export default function LoginScreen() {
  const location = useLocation(), navigate = useNavigate();
  const { user, loading, error } = useAuth();
  const destination = loginReturnPath(location);
  useEffect(() => {
    if (loading) return;
    const search = destination === "/" ? "" : `?redirect=${encodeURIComponent(destination)}`;
    if (location.search !== search) navigate({ pathname: "/login", search, hash: /[=&]/.test(location.hash) ? "" : location.hash }, { replace: true, state: null });
  }, [destination, location.search, location.hash, navigate, loading]);
  if (user && !loading && !error) return <Navigate to={destination} replace />;
  return <>
    <Seo title={metadata.title} description={metadata.description} url={metadata.url} noindex />
    <div className="hq-login-page"><section className="hq-login-card hq-panel" aria-labelledby="login-title">
      <div className="hq-login-intro"><h1 className="hq-page-heading" id="login-title">Log in to Hard Quiz</h1><p>Save your personal bests and play Daily Challenge.</p></div>
      <LoginForm returnPath={destination} />
    </section></div>
  </>;
}
