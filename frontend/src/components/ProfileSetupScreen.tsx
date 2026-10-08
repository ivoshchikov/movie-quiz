import { useEffect } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../AuthContext";
import type { SiteOutletContext } from "./Layout";
import NicknameForm from "./NicknameForm";
import Seo from "./Seo";
import { loginReturnPath } from "../auth/redirect";
import { markNicknamePrompted, nicknameSetupDestination, withoutNicknameSetup } from "../profile/nickname";
import metadata from "../profileSetupMetadata.json";

export default function ProfileSetupScreen() {
  const { user, loading: authLoading, error: authError, retrySession } = useAuth();
  const { retryProfile, profileReady, profileError, nickname, confirmNickname } = useOutletContext<SiteOutletContext>();
  const navigate = useNavigate(), location = useLocation(), destination = withoutNicknameSetup(loginReturnPath(location));
  useEffect(() => {
    if (user) markNicknamePrompted(user.id);
  }, [user]);
  useEffect(() => {
    if (!authLoading && !authError && user && profileReady && nickname) navigate(destination, { replace: true });
  }, [authLoading, authError, user, profileReady, nickname, navigate, destination]);
  useEffect(() => {
    const search = destination === "/" ? "" : `?redirect=${encodeURIComponent(destination)}`;
    if (location.search !== search || location.hash) navigate({ pathname: "/setup-profile", search, hash: "" }, { replace: true, state: null });
  }, [destination, location.search, location.hash, navigate]);

  return <>
    <Seo title={metadata.title} description={metadata.description} url={metadata.url} noindex />
    <div className="hq-login-page"><section className="hq-login-card hq-panel" aria-labelledby="nickname-title">
      <div className="hq-login-intro"><h1 className="hq-page-heading" id="nickname-title">Choose your nickname</h1>
        <p>{authLoading || authError ? "Your public player name for leaderboards and Daily Challenge." : !user ? "Sign in first, then choose your public player name." : "You’re signed in. Pick your player name for leaderboards and Daily Challenge."}</p></div>
      {authError ? <div className="hq-nickname-message"><p role="alert">Your sign-in status could not be checked.</p><button className="hq-primary" onClick={retrySession}>Retry sign-in check</button></div>
        : authLoading ? <p role="status" className="hq-nickname-message">Checking your sign-in status…</p>
          : !user ? <div className="hq-nickname-guest"><p>A nickname is chosen once for your account. Log in to complete this step and continue.</p>
            <Link className="hq-primary" to={`/login?redirect=${encodeURIComponent(nicknameSetupDestination(destination))}`}>Log in to choose a nickname</Link>
            <Link className="hq-inline-action" to="/">Play a regular quiz as a guest</Link></div>
            : profileError ? <div className="hq-nickname-message"><p role="alert">Your account could not be checked.</p><button className="hq-primary" onClick={retryProfile}>Retry profile</button></div>
              : !profileReady || nickname ? <p role="status" className="hq-nickname-message">Checking your profile…</p>
                : <NicknameForm key={user.id} userId={user.id} destination={destination} onCancel={() => navigate(destination, { replace: true })}
                  onSaved={(nick, alreadyChosen) => { confirmNickname(nick, alreadyChosen); navigate(destination, { replace: true }); }} />}
    </section></div>
  </>;
}
