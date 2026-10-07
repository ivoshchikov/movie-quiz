import { useCallback, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getProfile } from "../api";
import { useReadRequest } from "../hooks/useReadRequest";
import type { SiteOutletContext } from "./Layout";
import NicknameForm from "./NicknameForm";
import Seo from "./Seo";

export default function ProfileSetupScreen() {
  const { user, loading: authLoading } = useAuth();
  const { retryProfile } = useOutletContext<SiteOutletContext>();
  const navigate = useNavigate(), owner = user?.id ?? "";
  const load = useCallback((signal: AbortSignal) => getProfile(owner, signal), [owner]);
  const account = useReadRequest(owner, load, !authLoading && !!owner);
  useEffect(() => {
    if (!authLoading && (!owner || !account.loading && !account.error && account.value?.nickname)) navigate("/", { replace: true });
  }, [authLoading, owner, account.loading, account.error, account.value, navigate]);

  return <div className="hq-page hq-panel hq-page-panel">
    <Seo title="Profile setup | Hard Quiz" noindex />
    <h1 className="hq-page-heading">Choose your nickname</h1>
    {authLoading || account.loading || account.value?.nickname ? <p role="status" className="hq-status">Checking your profile…</p>
      : account.error ? <p role="alert" className="hq-status">Your account could not be checked. <button className="hq-inline-action" onClick={account.retry}>Retry profile</button></p>
      : owner && <NicknameForm key={owner} userId={owner} onSaved={() => { retryProfile(); navigate("/", { replace: true }); }} />}
  </div>;
}
