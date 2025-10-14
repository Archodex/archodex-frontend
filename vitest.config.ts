import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    restoreMocks: true,
    maxConcurrency: 20,
    coverage: {
      exclude: [
        // shadcn/ui vendored components
        'src/components/ui/**',
      ],
      reporter: ['text', 'json-summary', 'json'],
    },
  },
  resolve: { alias: { '@': resolve(__dirname, './src') } },
});
