import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'output/playwright/report' }],
    ['json', { outputFile: 'output/playwright/results.json' }],
  ],
  outputDir: 'output/playwright/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'msedge',
    trace: 'on',
    screenshot: 'only-on-failure',
    video: {
      mode: 'on',
      size: {
        width: 1280,
        height: 720,
      },
    },
  },
  webServer: {
    command: 'powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/node24.ps1 run dev:direct',
    url: 'http://127.0.0.1:4173',
    timeout: 60_000,
    reuseExistingServer: true,
  },
});
