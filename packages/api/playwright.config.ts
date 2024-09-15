import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 5000,
  },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:7071/api',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
});
