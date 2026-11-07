import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { mockQuizApi } from '../tests/fixtures';

test('three cold frontend loads compare Cloudflare with Vercel under identical throttling', async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const samples: Record<string, unknown>[] = [];
  const origins = ['https://hard-quiz.com', 'https://hard-quiz-staging.i-voschikov.workers.dev'];
  for (let run = 1; run <= 3; run++) for (const origin of run % 2 ? origins : [...origins].reverse()) {
    const context = await browser.newContext({
      viewport: testInfo.project.use.viewport,
      isMobile: testInfo.project.name === 'mobile',
      hasTouch: testInfo.project.name === 'mobile',
      serviceWorkers: 'block',
    });
    const blocked: string[] = [];
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() === 'GET' && (url.origin === origin ||
        (url.origin === 'https://hard-quiz.com' && url.pathname.startsWith('/blog-assets/')))
        && !/^\/(?:api|rest|auth|functions)\//.test(url.pathname)) return route.continue();
      blocked.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    await mockQuizApi(page);
    await page.addInitScript(() => {
      const metrics = { lcp: 0, cls: 0, longTasksMs: 0 };
      Object.defineProperty(window, '__acceptanceMetrics', { value: metrics });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!shift.hadRecentInput) metrics.cls += shift.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) metrics.longTasksMs += Math.max(0, entry.duration - 50);
      }).observe({ type: 'longtask', buffered: true });
    });
    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150,
      downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8 });
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const response = await page.goto(origin, { waitUntil: 'load' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Play Movies', exact: true })).toBeEnabled();
    await page.waitForTimeout(1500); // Fixed observation window, not a readiness check.
    const sample = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return {
        ...(window as unknown as { __acceptanceMetrics: object }).__acceptanceMetrics,
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
        ttfb: navigation.responseStart,
        domContentLoaded: navigation.domContentLoadedEventEnd,
        transferredBytes: navigation.transferSize + resources.reduce((sum, item) => sum + item.transferSize, 0),
        resources: resources.length,
      };
    });
    samples.push({ origin, run, viewport: testInfo.project.name, ...sample });
    expect(blocked, 'No performance run may send real API or analytics requests').toEqual([]);
    await context.close();
  }
  const path = testInfo.outputPath('performance.json');
  writeFileSync(path, JSON.stringify({ measuredAt: new Date().toISOString(), note: 'Lab comparison through managed proxy, mocked API, not field Core Web Vitals.', samples }, null, 2));
  await testInfo.attach('performance samples', { path, contentType: 'application/json' });
});
