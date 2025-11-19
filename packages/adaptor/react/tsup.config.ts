import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['lib/index.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-router-dom', '@fire-shield/core'],
  sourcemap: true,
});
