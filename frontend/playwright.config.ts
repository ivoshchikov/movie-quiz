import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // СЕРВЕР ВСЕГДА ПОДНИМАЕМ перед тестами
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    env: {
      // Lifecycle tests can send keepalive requests after the page closes.
      // Always use an isolated fixture origin, including CI with production secrets.
      VITE_SUPABASE_URL: 'https://quiz-fixture.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'local-test-placeholder',
      VITE_GA_ID: 'G-QUIZFIXTURE',
      VITE_GA_MEASUREMENT_ID: '',
    },
    // если хотите, на CI можно не переиспользовать уже запущенный сервер
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  reporter: [['line'], ['html', { open: 'never' }]],
});
