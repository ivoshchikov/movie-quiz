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
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
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
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://quiz-fixture.supabase.co',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'local-test-placeholder',
    },
    // если хотите, на CI можно не переиспользовать уже запущенный сервер
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  reporter: [['html', { open: 'never' }]],
});
