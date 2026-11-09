/** Standalone, opt-in integration check. No application bundle or ad placements. */
export function privacySdkCheck(request: Request, inheritedHeaders: Headers): Response {
  const headers = new Headers(inheritedHeaders);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  // Keep the ordinary site's advertising exclusion intact. Only these static
  // scripts are available here; fetch/beacon, remote images and remote frames
  // remain blocked, including Google's ad and measurement endpoints.
  headers.set("Content-Security-Policy", [
    "default-src 'none'",
    "script-src 'unsafe-inline' https://fundingchoicesmessages.google.com/i/ https://fundingchoicesmessages.google.com/f/ https://fundingchoicesmessages.google.com/_/mss/ https://www.gstatic.com https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js https://pagead2.googlesyndication.com/pagead/managed/js/adsense/",
    "style-src 'unsafe-inline'", "img-src data:", "font-src data:",
    "connect-src 'none'", "frame-src 'self'", "worker-src 'none'",
    "base-uri 'none'", "form-action 'none'", "object-src 'none'", "frame-ancestors 'none'",
  ].join("; "));
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Hard Quiz — consent integration check</title>
<style>body{font:16px/1.5 system-ui,sans-serif;color:#ececf4;background:#111218;margin:0;padding:24px}main{max-width:850px;margin:auto}h1{font-size:1.6rem}button,a{min-height:44px;display:inline-flex;align-items:center;padding:0 14px;margin:4px 8px 4px 0;border:1px solid #888;border-radius:8px;background:#242532;color:inherit;font:inherit}button:disabled{opacity:.5}button:focus-visible,a:focus-visible{outline:3px solid #a99cff;outline-offset:3px}pre{font:13px/1.5 monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#1c1d26;padding:16px;border-radius:10px}a{box-sizing:border-box}*{box-sizing:border-box}</style></head>
<body><main><h1>Consent integration check</h1>
<p>This separate check loads Google's AdSense and privacy scripts only after you press Start. Advertising requests stay paused. Games and analytics do not load here.</p>
<p>Google receives the script requests from this browser. Network requests for ads and measurement are restricted. These restrictions may also prevent a privacy message from rendering; this check cannot prove normal regional delivery on its own.</p>
<p role="status" id="status">Ready to start.</p>
<button type="button" id="start">Start paused AdSense check</button><button type="button" id="copy" disabled>Copy result</button><a href="/">Return to Hard Quiz</a>
<pre aria-label="Consent integration result" id="result"></pre></main>
<script>
(()=>{
  const output=document.getElementById('result'),status=document.getElementById('status');
  const start=document.getElementById('start'),copy=document.getElementById('copy');
  const report={version:1,integration:'paused-adsense',started:false,complete:false,
    sdkStatus:'not-started',cmpTagStatus:'not-started',apiReady:false,modeReady:false,pauseRequestedBeforeSdk:false,
    native:null,messagingGateCalls:0,messagingProceedCalls:0,blockedResources:[]};
  let interval,finish;
  const render=()=>{
    const pause=Object.getOwnPropertyDescriptor(window.adsbygoogle||{},'pauseAdRequests');
    output.textContent=JSON.stringify({...report,
      pauseControlReadback:window.adsbygoogle?.pauseAdRequests??null,
      pauseControlIsWriteOnly:typeof pause?.set==='function'&&typeof pause.get!=='function',
      declaredAdSlotElements:document.querySelectorAll('ins.adsbygoogle[data-ad-slot]').length,
      sdkAdLikeElements:document.querySelectorAll('ins.adsbygoogle').length,
      analyticsScriptElements:document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').length},null,2);
  };
  document.addEventListener('securitypolicyviolation',event=>{
    let origin;try{origin=new URL(event.blockedURI).origin;}catch{return;}
    const entry={directive:event.effectiveDirective,origin};
    if(report.blockedResources.length<12&&!report.blockedResources.some(x=>x.directive===entry.directive&&x.origin===origin))report.blockedResources.push(entry);
    render();
  });
  const tag=(src,key)=>{
    report[key]='loading';const script=document.createElement('script');
    script.async=true;script.crossOrigin='anonymous';script.src=src;
    script.onload=()=>{report[key]='loaded';render();};
    script.onerror=()=>{report[key]='failed';render();};
    document.head.append(script);
  };
  start.addEventListener('click',()=>{
    if(report.started)return;report.started=true;start.disabled=true;
    status.textContent='Checking consent integration. Please wait 20 seconds.';
    // Set the documented pause BEFORE inserting any Google script. Never
    // resume it, create slots, or push an ad request, even after a consent choice.
    window.adsbygoogle=window.adsbygoogle||[];window.adsbygoogle.pauseAdRequests=1;
    report.pauseRequestedBeforeSdk=window.adsbygoogle.pauseAdRequests===1;
    const fc=window.googlefc=window.googlefc||{callbackQueue:[]};
    fc.callbackQueue=fc.callbackQueue||[];
    fc.controlledMessagingFunction=message=>{report.messagingGateCalls++;message.proceed(true);report.messagingProceedCalls++;render();};
    fc.callbackQueue.push({CONSENT_API_READY:()=>{
      report.apiReady=true;
      if(typeof window.__tcfapi==='function')window.__tcfapi('addEventListener',0,(data,success)=>{
        if(success&&data)report.native={cmpId:data.cmpId??null,cmpStatus:data.cmpStatus??null,
          gdprApplies:data.gdprApplies??null,eventStatus:data.eventStatus??null};render();
      });render();
    }});
    fc.callbackQueue.push({CONSENT_MODE_DATA_READY:()=>{report.modeReady=true;render();}});
    const signal=document.createElement('iframe');signal.name='googlefcPresent';signal.title='Google privacy controls';signal.hidden=true;document.body.append(signal);
    tag('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7817531684692124','sdkStatus');
    tag('https://fundingchoicesmessages.google.com/i/pub-7817531684692124?ers=1','cmpTagStatus');
    interval=setInterval(render,500);finish=setTimeout(()=>{
      clearInterval(interval);report.complete=true;copy.disabled=false;
      status.textContent='Check complete. Copy the result or take a screenshot.';render();
    },20000);render();
  });
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(output.textContent);status.textContent='Result copied.';}catch{status.textContent='Select and copy the result below.';}});
  window.addEventListener('pagehide',()=>{clearInterval(interval);clearTimeout(finish);});
  render();
})();
</script></body></html>`;
  return new Response(request.method === "HEAD" ? null : html, { headers });
}
