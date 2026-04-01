import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1000, height: 700 },
  },
  webServer: {
    command: 'yarn start',
    url: 'http://localhost:5173/popup.html',
    reuseExistingServer: true,
    timeout: 30000,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
