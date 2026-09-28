import { createGridTypePlugin } from '@diegesis/canvas-plugin-grid';

/** Grid isométrico — registra a layer `grid-isometric`. */
export const gridIsometricPlugin = createGridTypePlugin({
  type: 'isometric',
  name: 'Grid · Isometric',
  layerLabel: 'Grid · Isometric',
});
