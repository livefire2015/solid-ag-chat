import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['solid-js', 'solid-js/web'],
  treeshake: false,
  splitting: false,
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = 'solid-js';
  },
});
