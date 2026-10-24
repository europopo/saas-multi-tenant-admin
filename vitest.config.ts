import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@saas/shared': fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url)),
      '@saas/api-client': fileURLToPath(
        new URL('./packages/api-client/src/index.ts', import.meta.url),
      ),
      '@saas/mock': fileURLToPath(new URL('./packages/mock/src/index.ts', import.meta.url)),
      '@saas/ui': fileURLToPath(new URL('./packages/ui/src/index.ts', import.meta.url)),
      '@saas/layouts': fileURLToPath(new URL('./packages/layouts/src/index.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/__tests__/**/*.spec.ts', 'apps/**/__tests__/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/**/src/**/*.ts'],
      exclude: ['**/index.ts', '**/mock/**'],
    },
  },
});
