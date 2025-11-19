import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['lib/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['svelte', 'svelte/store', '@fire-shield/core'],
  sourcemap: true,
});
