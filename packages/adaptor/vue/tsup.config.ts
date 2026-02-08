import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['lib/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['vue', 'vue-router', '@fire-shield/core'],
  sourcemap: true,
});
