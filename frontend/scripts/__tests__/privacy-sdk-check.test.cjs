const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { buildSync } = require('esbuild');
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');

const compiled = buildSync({ entryPoints: ['worker/index.ts'], bundle: true,
  platform: 'browser', format: 'cjs', write: false }).outputFiles[0].text;
const compiledModule = { exports: {} };
new Function('module', 'exports', compiled)(compiledModule, compiledModule.exports);
const worker = compiledModule.exports.default;
const env = { DEPLOYMENT_PROFILE: 'production', ASSETS: { fetch: async () => new Response('missing', { status: 404 }) } };
const request = (path = '/api/privacy/adsense-check', method = 'GET') => worker.fetch(new Request('https://hard-quiz.com' + path, { method }), env);
let server, origin, browser;
before(async () => {
  server = http.createServer(async (req, res) => {
    const response = await request(req.url, req.method);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

test('check routing is exact, read-only, no-store and never reflects query input', async () => {
  const response = await request('/api/privacy/adsense-check?secret=not-reflected');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(response.headers.get('strict-transport-security'), 'max-age=63072000');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  const html = await response.text();
  assert.doesNotMatch(html, /not-reflected|<script[^>]*src=|assets\/index-|supabase/);
  assert.equal(await (await request(undefined, 'HEAD')).text(), '');
  assert.equal((await request(undefined, 'POST')).status, 405);
  assert.equal((await request('/api/privacy/adsense-check/')).status, 404);
  assert.equal((await request('/api/privacy/other')).status, 404);
  assert.equal((await request('/privacy')).headers.get('content-security-policy'), require('../../security-policy.json').contentSecurityPolicy);
});

async function isolatedPage(context, { failSdk = false } = {}) {
  const transported = [], unexpected = [], errors = [];
  await context.routeWebSocket('**/*', socket => socket.close());
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.hostname === 'pagead2.googlesyndication.com' && url.pathname === '/pagead/js/adsbygoogle.js') {
      transported.push('sdk');
      if (failSdk) return route.abort('blockedbyclient');
      return route.fulfill({ contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: `
        window.__pauseAtSdkLoad=window.adsbygoogle.pauseAdRequests;
        fetch('https://googleads.g.doubleclick.net/pagead/ads?secret=not-copied').catch(()=>{});
        navigator.sendBeacon('https://www.google-analytics.com/g/collect?secret=not-copied','test');
        const img=new Image();img.src='https://example.test/pixel?secret=not-copied';
        const frame=document.createElement('iframe');frame.src='https://googleads.g.doubleclick.net/pagead/ads';document.body.append(frame);
        const script=document.createElement('script');script.src='https://pagead2.googlesyndication.com/pagead/js/rum.js';document.head.append(script);
      ` });
    }
    if (url.hostname === 'fundingchoicesmessages.google.com' && url.pathname === '/i/pub-7817531684692124') {
      transported.push('cmp');
      return route.fulfill({ contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: `
        const fc=window.googlefc;const waiting=fc.callbackQueue.splice(0);
        window.__tcfapi=(command,version,cb)=>cb({cmpId:300,cmpStatus:'loaded',gdprApplies:true,tcString:'secret-tcf',publisher:{consents:{1:true}}},true);
        fc.callbackQueue.push=(entry)=>{if(entry.CONSENT_API_READY)entry.CONSENT_API_READY();return 1;};
        waiting.forEach(entry=>{if(entry.CONSENT_API_READY)entry.CONSENT_API_READY();});
        fc.controlledMessagingFunction({proceed:allowed=>{window.__messageAllowed=allowed;}});
      ` });
    }
    unexpected.push({ host: url.hostname, path: url.pathname });
    return route.fulfill({ status: 204 });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto(origin + '/api/privacy/adsense-check?fc=alwaysshow&fctype=gdpr&private=not-copied');
  return { page, transported, unexpected, errors };
}
const read = async page => JSON.parse(await page.getByLabel('Consent integration result').innerText());

test('explicit start pauses before the SDK, permits messaging and blocks ad/measurement transports', async () => {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 320, height: 840 } });
  try {
    const { page, transported, unexpected, errors } = await isolatedPage(context);
    assert.deepEqual(transported, []);
    assert.equal((await read(page)).started, false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: 'Start paused AdSense check' }).click();
    await expect.poll(() => read(page)).toMatchObject({ cmpTagStatus: 'loaded', sdkStatus: 'loaded' });
    await page.clock.runFor(20500);
    const report = await read(page);
    assert.equal(await page.evaluate(() => window.__pauseAtSdkLoad), 1);
    assert.equal(await page.evaluate(() => window.__messageAllowed), true);
    assert.equal(report.pauseAdRequests, 1);
    assert.equal(report.complete, true);
    assert.equal(report.apiReady, true);
    assert.equal(report.modeReady, false);
    assert.deepEqual(report.native, { cmpId: 300, cmpStatus: 'loaded', gdprApplies: true, eventStatus: null });
    assert.equal(report.messagingGateCalls, 1); assert.equal(report.messagingProceedCalls, 1);
    assert.equal(report.advertisingSlots, 0); assert.equal(report.analyticsScriptElements, 0);
    assert.ok(report.blockedResources.some(x => x.directive === 'connect-src'));
    assert.ok(report.blockedResources.some(x => x.directive === 'img-src'));
    assert.ok(report.blockedResources.some(x => x.directive === 'frame-src'));
    assert.ok(report.blockedResources.some(x => x.directive === 'script-src-elem'));
    assert.doesNotMatch(JSON.stringify(report), /not-copied|secret-tcf|publisher|private/);
    assert.deepEqual(transported.sort(), ['cmp', 'sdk']); assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
    assert.equal(await page.getByRole('button', { name: 'Copy result' }).isEnabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Start paused AdSense check' }).isEnabled(), false);
    assert.equal(transported.length, 2);
  } finally { await context.close(); }
});

test('SDK load failure stays visible and never unpauses or loads the application', async () => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const { page, unexpected, errors } = await isolatedPage(context, { failSdk: true });
    await page.getByRole('button', { name: 'Start paused AdSense check' }).click();
    await expect.poll(() => read(page)).toMatchObject({ sdkStatus: 'failed' });
    await page.clock.runFor(20500);
    const report = await read(page);
    assert.equal(report.complete, true); assert.equal(report.sdkStatus, 'failed'); assert.equal(report.pauseAdRequests, 1);
    assert.equal(report.advertisingSlots, 0); assert.equal(report.analyticsScriptElements, 0);
    assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
