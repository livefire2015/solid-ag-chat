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
    options.jsx = 'transform';
    options.jsxFactory = '_$createElement';
    options.jsxFragment = '_$Fragment';
  },
  // Inject SolidJS helpers
  banner: {
    js: `import { createElement as _$createElement, Fragment as _$Fragment } from 'solid-js/web';`,
  },
});
