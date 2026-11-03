import { defineConfig } from '@playwright/test';

const port = process.env['PLAYWRIGHT_PORT'] ?? '4173';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL,
    browserName: 'chromium',
  },
  webServer: {
    command: 'npm run preview',
    env: { PORT: port },
    url: baseURL,
  },
});
