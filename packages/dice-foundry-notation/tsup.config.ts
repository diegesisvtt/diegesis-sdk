import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['@diegesis/dice-core', '@diegesis/dice-notation-core', '@diegesis/formula', 'valibot'],
});
