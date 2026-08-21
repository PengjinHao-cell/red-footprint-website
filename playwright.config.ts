import { defineConfig, devices } from '@playwright/test';

const port = 47_123;
const baseURL = `http://127.0.0.1:${port}/tests/e2e/harness/`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Pixel Mobile Chromium',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'iPhone Mobile WebKit',
      use: { ...devices['iPhone 15'] },
    },
  ],
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
