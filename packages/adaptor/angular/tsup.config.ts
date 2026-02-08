import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['lib/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['@angular/core', '@angular/common', '@angular/router', 'rxjs', '@fire-shield/core'],
  sourcemap: true,
});
