import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig, devices } from '@playwright/test';

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(__dirname, '../.env'));

const apiUrl = process.env.API_URL ?? 'http://localhost:3000/api';
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --dir ../backend start:dev',
      url: `${apiUrl.replace('/api', '')}/api/inventory`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DB_HOST: process.env.DB_HOST ?? 'localhost',
        DB_PORT: process.env.DB_PORT ?? '5432',
        DB_USER: process.env.DB_USER ?? 'postgres',
        DB_PASS: process.env.DB_PASS ?? 'postgres',
        DB_NAME: process.env.DB_NAME ?? 'inventario',
        CORS_ORIGIN: frontendUrl,
      },
    },
    {
      command: 'pnpm --dir ../frontend dev',
      url: frontendUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_API_URL: apiUrl,
      },
    },
  ],
});
