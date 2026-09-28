import { Canvas, type CanvasOptions, type CanvasPlugin } from '@diegesis/canvas';
import { gridNonePlugin } from '@diegesis/canvas-plugin-grid';
import { gridSquarePlugin } from '@diegesis/canvas-plugin-grid-square';
import { gridHexVerticalPlugin, gridHexHorizontalPlugin } from '@diegesis/canvas-plugin-grid-hex';
import { gridIsometricPlugin } from '@diegesis/canvas-plugin-grid-isometric';
import { mapsPlugin } from '@diegesis/canvas-plugin-maps';
import { tilesPlugin } from '@diegesis/canvas-plugin-tiles';
import { drawingsPlugin } from '@diegesis/canvas-plugin-drawings';
import { wallsPlugin } from '@diegesis/canvas-plugin-walls';
import { templatesPlugin } from '@diegesis/canvas-plugin-templates';
import { tokensPlugin } from '@diegesis/canvas-plugin-tokens';
import { ringsPlugin } from '@diegesis/canvas-plugin-rings';
import { lightsPlugin } from '@diegesis/canvas-plugin-lights';
import { measurePlugin } from '@diegesis/canvas-plugin-measure';
import { rangesPlugin } from '@diegesis/canvas-plugin-ranges';
import { lightingPlugin } from '@diegesis/canvas-plugin-lighting';
import { fogPlugin } from '@diegesis/canvas-plugin-fog';
import { windowsPlugin } from '@diegesis/canvas-plugin-window';
import { imageEditorPlugin } from '@diegesis/canvas-plugin-image-editor';

export { gridNonePlugin, createGridTypePlugin, GridLayer } from '@diegesis/canvas-plugin-grid';
export { gridSquarePlugin } from '@diegesis/canvas-plugin-grid-square';
export { gridHexVerticalPlugin, gridHexHorizontalPlugin } from '@diegesis/canvas-plugin-grid-hex';
export { gridIsometricPlugin } from '@diegesis/canvas-plugin-grid-isometric';
export { mapsPlugin, MapsPlugin, MapPlaceable } from '@diegesis/canvas-plugin-maps';
export { tilesPlugin } from '@diegesis/canvas-plugin-tiles';
export { drawingsPlugin } from '@diegesis/canvas-plugin-drawings';
export { wallsPlugin, WallsPlugin } from '@diegesis/canvas-plugin-walls';
export { templatesPlugin } from '@diegesis/canvas-plugin-templates';
export { tokensPlugin } from '@diegesis/canvas-plugin-tokens';
export { ringsPlugin, RingsPlugin } from '@diegesis/canvas-plugin-rings';
export { lightsPlugin } from '@diegesis/canvas-plugin-lights';
export { measurePlugin } from '@diegesis/canvas-plugin-measure';
export { rangesPlugin, RangesPlugin } from '@diegesis/canvas-plugin-ranges';
export { lightingPlugin } from '@diegesis/canvas-plugin-lighting';
export { fogPlugin, defineFogElements } from '@diegesis/canvas-plugin-fog';
export { windowsPlugin, WindowsPlugin } from '@diegesis/canvas-plugin-window';
export { imageEditorPlugin, ImageEditorPlugin, ImageEditor, defineImageEditorElements } from '@diegesis/canvas-plugin-image-editor';

/** Plugins do preset padrão, na ordem de instalação recomendada. */
export const standardPlugins: CanvasPlugin[] = [
  gridSquarePlugin,
  gridHexVerticalPlugin,
  gridHexHorizontalPlugin,
  gridIsometricPlugin,
  gridNonePlugin,
  mapsPlugin,
  tilesPlugin,
  drawingsPlugin,
  wallsPlugin,
  templatesPlugin,
  tokensPlugin,
  ringsPlugin,
  lightsPlugin,
  measurePlugin,
  rangesPlugin,
  lightingPlugin,
  windowsPlugin,
  fogPlugin,
  imageEditorPlugin,
];

/**
 * Cria um canvas com o preset padrão completo (tiles, drawings, walls,
 * templates, tokens, rings, lights, measure, lighting, fog). Para um canvas
 * enxuto, use `new Canvas()` + `canvas.use(plugin)` seletivamente.
 */
export function createStandardCanvas(container: HTMLElement, options: Omit<CanvasOptions, 'plugins'> = {}): Canvas {
  return new Canvas(container, { ...options, plugins: standardPlugins });
}
