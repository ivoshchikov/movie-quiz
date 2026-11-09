import { useEffect, useState } from "react";
import { getConsentDiagnostics } from "./consent";

export default function PrivacyDiagnostics() {
  const [sample, setSample] = useState(getConsentDiagnostics);
  const [complete, setComplete] = useState(false);
  const [blockedOrigins, setBlockedOrigins] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  useEffect(() => {
    const sampleNow = () => setSample(getConsentDiagnostics());
    const interval = window.setInterval(sampleNow, 500);
    const finish = window.setTimeout(() => {
      window.clearInterval(interval); sampleNow(); setComplete(true);
    }, 20000);
    const blocked = (event: SecurityPolicyViolationEvent) => {
      if (!event.effectiveDirective.startsWith("script-src")) return;
      let origin: string;
      try { origin = new URL(event.blockedURI).origin; } catch { return; }
      setBlockedOrigins(current => current.includes(origin) ? current : [...current, origin].slice(0, 8));
    };
    document.addEventListener("securitypolicyviolation", blocked);
    return () => {
      window.clearInterval(interval); window.clearTimeout(finish);
      document.removeEventListener("securitypolicyviolation", blocked);
    };
  }, []);
  const report = JSON.stringify({ ...sample, complete, optionalMeasurementBlocked: true,
    advertisingScriptElements: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
    analyticsScriptElements: document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').length,
    blockedScriptOrigins: blockedOrigins }, null, 2);
  const copy = async () => {
    try { await navigator.clipboard.writeText(report); setCopyStatus("Result copied."); }
    catch { setCopyStatus("Select and copy the result below."); }
  };
  return <section className="hq-privacy-diagnostics" aria-labelledby="privacy-diagnostics-title">
    <h2 id="privacy-diagnostics-title">Privacy diagnostics</h2>
    <p>This check shows how Google privacy controls load in this browser. Optional analytics is off during the check.</p>
    <p role="status">{complete ? "Check complete. Copy the result or take a screenshot." : "Checking privacy controls. Please wait 20 seconds."}</p>
    <div className="hq-privacy-actions">
      <button type="button" disabled={!complete} onClick={() => { void copy(); }}>Copy result</button>
      <button type="button" onClick={() => location.reload()}>Run again</button>
      <a href="/">Exit diagnostics</a>
    </div>
    {copyStatus && <p role="status">{copyStatus}</p>}
    <pre aria-label="Privacy diagnostic result">{report}</pre>
  </section>;
}
