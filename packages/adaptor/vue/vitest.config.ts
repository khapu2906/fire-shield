import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/**/*.test.ts',
        'lib/**/__tests__/**',
        'lib/**/*.d.ts',
      ],
    },
    include: ['lib/**/*.test.ts', 'lib/**/__tests__/**/*.test.ts'],
  },
});
