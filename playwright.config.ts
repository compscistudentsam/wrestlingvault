import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.WV_CHROMIUM_PATH
      ? { executablePath: process.env.WV_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: 'npm run dev:web',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
});
