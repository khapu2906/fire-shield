import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['lib/index.ts', 'lib/module.ts', 'lib/composables.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Manual .d.ts files provided in dist folder
  clean: false, // Keep manual .d.ts files
  external: ['nuxt', '@nuxt/kit', '@nuxt/schema', 'h3', '@fire-shield/core', 'vue', '#app'],
  sourcemap: true,
});
