import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  // Don't externalize graphql to avoid duplicate module issues
  ssr: {
    noExternal: ['graphql', '@graphql-tools/schema', '@graphql-tools/utils'],
  },
});
