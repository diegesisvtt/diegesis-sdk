import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['three', 'cannon-es', 'valibot', '@diegesis/assets', '@diegesis/dice-core', '@diegesis/dice-notation', '@diegesis/events', '@diegesis/physics', '@diegesis/render3d'],
});
