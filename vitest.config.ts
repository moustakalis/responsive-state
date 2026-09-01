import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
});
