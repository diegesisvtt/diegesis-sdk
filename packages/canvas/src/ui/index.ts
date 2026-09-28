import { CONTEXT_MENU_TAG, DiegesisContextMenu } from './context-menu';
import { LAYER_PANEL_TAG, DiegesisLayerPanel } from './layer-panel';

export { DiegesisContextMenu, CONTEXT_MENU_TAG } from './context-menu';
export { DiegesisLayerPanel, LAYER_PANEL_TAG } from './layer-panel';

/**
 * Registra os Web Components do core do canvas (`<diegesis-layer-panel>`,
 * `<diegesis-context-menu>`). Plugins podem expor os seus próprios
 * componentes (ex.: fog panel do @diegesis/canvas-plugin-fog).
 * Idempotente e side-effect free até ser chamada.
 */
export function defineCanvasElements(): void {
  if (!customElements.get(LAYER_PANEL_TAG)) customElements.define(LAYER_PANEL_TAG, DiegesisLayerPanel);
  if (!customElements.get(CONTEXT_MENU_TAG)) customElements.define(CONTEXT_MENU_TAG, DiegesisContextMenu);
}
