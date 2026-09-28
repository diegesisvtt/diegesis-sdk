import { createGridTypePlugin } from '@diegesis/canvas-plugin-grid';

/** Grid quadrado — registra a layer `grid-square` e sua configuração. */
export const gridSquarePlugin = createGridTypePlugin({
  type: 'square',
  name: 'Grid · Square',
  layerLabel: 'Grid · Square',
});
