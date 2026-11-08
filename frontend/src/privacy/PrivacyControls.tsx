import { useState, useSyncExternalStore } from "react";
import { Dialog } from "@headlessui/react";
import { allowEuropeanChoiceAgain, dismissPrivacySettings, getConsent, getServerConsent, openPrivacySettings,
  saveOutsideEuropeChoice, subscribeConsent, withdrawAnalytics } from "./consent";
import type { ConsentState } from "./consent";
import SiteIcon from "../components/SiteIcon";
import "./privacy.css";

export function PrivacySettingsButton() {
  return <button type="button" className="hq-privacy-link" onClick={openPrivacySettings}>Privacy settings</button>;
}

export function GamePrivacyControls() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, getServerConsent);
  return <>
    <button type="button" className="hq-game-privacy" aria-label="Privacy settings" title="Privacy settings"
      aria-describedby={consent.deferred ? "hq-game-privacy-status" : undefined} onClick={openPrivacySettings}>
      <SiteIcon name={consent.deferred ? "check" : "shield"} />
    </button>
    {consent.deferred && <p id="hq-game-privacy-status" className="sr-only" role="status">Analytics is off. Privacy choices will open after this game.</p>}
  </>;
}

function ChoicePanel({ consent }: { consent: ConsentState }) {
  const [measurement, setMeasurement] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const outside = consent.status === "ready" && consent.region === "other";
  const decline = () => {
    if (outside) saveOutsideEuropeChoice(false, false);
    else { withdrawAnalytics(); dismissPrivacySettings(); }
  };
  const gpc = typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  return <Dialog open onClose={decline} className="hq-privacy-dialog">
    <div className="hq-privacy-backdrop" aria-hidden="true" />
    <div className="hq-privacy-position"><Dialog.Panel className="hq-privacy-panel">
      <Dialog.Title>Privacy settings</Dialog.Title>
      <Dialog.Description>Optional analytics is off until you give permission. Your choice never prevents you from playing. Advertising is currently off.</Dialog.Description>
      {gpc && <p role="status">Global Privacy Control is enabled. We keep optional analytics off in this browser.</p>}
      {outside ? <>
        <p>Choose how Hard Quiz may measure use of the site. You can change or withdraw your choice through Privacy settings at any time.</p>
        <label><input type="checkbox" checked={measurement} onChange={e => setMeasurement(e.target.checked)} disabled={gpc} /><span><strong>Site audience counters</strong><small>Random browser and page-view identifiers count visits and content use. No page URLs, emails or answers are stored in these counters.</small></span></label>
        <label><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} disabled={gpc} /><span><strong>Google Analytics</strong><small>Google measures navigation, referrals, device information and game interactions using analytics cookies and separate event identifiers. Advertising personalization stays off.</small></span></label>
        <div className="hq-privacy-actions">
          <button onClick={() => saveOutsideEuropeChoice(true, true)} disabled={gpc}>Accept analytics</button>
          <button onClick={decline}>Reject analytics</button>
          <button onClick={() => saveOutsideEuropeChoice(measurement, analytics)}>Save choices</button>
        </div>
      </> : <>
        {consent.region === "europe" ? <>
          <p>Google Privacy &amp; messaging manages the European consent choices. Review the purposes individually or decline them all. Our counters require device storage and content measurement; Google Analytics additionally requires audience analysis and an explicit analytics consent signal.</p>
          <button className="hq-privacy-primary" onClick={allowEuropeanChoiceAgain}>Manage Google privacy choices</button>
        </> : <p role="status">{consent.status === "loading" ? "Loading privacy controls. Analytics remains off while we wait." : "Privacy controls could not be loaded. Optional analytics remains off. You can keep playing and try again later."}</p>}
        <div className="hq-privacy-actions">
          <button onClick={decline}>Keep analytics off</button>
          {consent.status === "unavailable" && <button onClick={() => location.reload()}>Retry privacy controls</button>}
        </div>
      </>}
      <p className="hq-privacy-small">Sign-in, security and requested games use necessary processing separately. See our <a href="/privacy">Privacy Policy</a>. Google also provides a Do Not Sell or Share link where applicable.</p>
    </Dialog.Panel></div>
  </Dialog>;
}

export default function PrivacyControls() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, getServerConsent);
  return consent.settings ? <ChoicePanel consent={consent} /> : null;
}
