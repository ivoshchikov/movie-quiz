import { defineConfig } from '@playwright/test';

const baseURL = process.env.QUIZ_ACCEPTANCE_URL ?? 'https://hard-quiz-staging.i-voschikov.workers.dev';
const origin = new URL(baseURL).origin;
const profile = process.env.QUIZ_ACCEPTANCE_PROFILE ?? 'staging';
if (!['staging', 'production'].includes(profile) || (profile === 'production' && origin !== 'http://localhost:8787')) {
  throw new Error('Production-profile acceptance is isolated to the local preview.');
}
if (!['https://hard-quiz-staging.i-voschikov.workers.dev', 'http://localhost:8787'].includes(origin)) {
  throw new Error('Acceptance may only target the staging Worker or its local preview.');
}
process.env.QUIZ_TEST_SUPABASE_URL ??= 'https://vgjfbcihppxbtrjcxoci.supabase.co';

export default defineConfig({
  testDir: './acceptance',
  testMatch: process.env.QUIZ_PERFORMANCE ? 'performance.spec.ts' : 'staging.spec.ts',
  outputDir: process.env.QUIZ_PERFORMANCE ? 'test-results/performance' : 'test-results/acceptance',
  fullyParallel: true,
  workers: process.env.QUIZ_PERFORMANCE ? 1 : 3,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: origin,
    serviceWorkers: 'block',
    launchOptions: process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['line'], ['json', { outputFile: process.env.QUIZ_PERFORMANCE ? 'test-results/performance-report.json' : 'test-results/acceptance-report.json' }]],
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
