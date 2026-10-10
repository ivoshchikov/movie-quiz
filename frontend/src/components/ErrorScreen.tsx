import { useEffect, useRef } from "react";
import Seo from "./Seo";

export default function ErrorScreen({ standalone }: { standalone?: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const card = <section className="hq-panel hq-fallback-card" aria-labelledby="page-error-title">
    <Seo title="Page couldn't load | Hard Quiz" description="Reload this page to try again, or return to quiz selection." noindex />
    <h1 id="page-error-title" className="hq-page-heading" ref={heading} tabIndex={-1}>This page couldn't load</h1>
    <p className="hq-page-copy" role="alert">We couldn't display this page. Reload to try again, or return to quiz selection.</p>
    <div className="hq-fallback-actions"><button className="hq-primary" onClick={() => window.location.reload()}>Reload page</button><a className="hq-secondary" href="/">Back to home</a></div>
  </section>;
  return standalone ? <div className="hq-site"><main id="main-content" className="hq-shell hq-fallback-main" tabIndex={-1}>{card}</main></div> : card;
}
