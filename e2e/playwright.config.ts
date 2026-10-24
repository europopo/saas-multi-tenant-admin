import { defineConfig } from '@playwright/test';

/**
 * Playwright E2E 配置
 * 针对构建产物（dist）通过 SPA 静态服务器预览，
 * 验证登录、SSO、核心页面导航等功能可用。
 */
export default defineConfig({
  testDir: './',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
