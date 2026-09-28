import * as THREE from 'three';
import type { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

import type { DiceMesh } from '../services/dice-mesh';

export interface SelectionDeps {
  getDice: () => DiceMesh[];
  getCamera: () => THREE.Camera | undefined;
  getOutlinePass: () => OutlinePass | undefined;
  requestRender: () => void;
  onDieClick: (id: string, value: number) => void;
}

export class SelectionController {
  #raycaster = new THREE.Raycaster();
  #pointer = new THREE.Vector2();
  #listener?: (event: MouseEvent) => void;
  #canvas?: HTMLCanvasElement;

  selectedIds = new Set<string>();

  constructor(private deps: SelectionDeps) {}

  attach(canvas: HTMLCanvasElement): void {
    this.detach();
    this.#canvas = canvas;
    this.#listener = (event) => this.#handleClick(event);
    canvas.addEventListener('click', this.#listener);
  }

  detach(): void {
    if (this.#canvas && this.#listener) {
      this.#canvas.removeEventListener('click', this.#listener);
    }
    this.#canvas = undefined;
    this.#listener = undefined;
  }

  select(ids: string[]): void {
    this.selectedIds = new Set(ids);
    this.#syncOutline();
    this.deps.requestRender();
  }

  clear(): void {
    this.selectedIds.clear();
    this.#syncOutline();
    this.deps.requestRender();
  }

  #syncOutline(): void {
    const outline = this.deps.getOutlinePass();
    if (!outline) return;
    const dice = this.deps.getDice();
    outline.selectedObjects = dice.filter((die) => this.selectedIds.has(die.dieId));
  }

  #handleClick(event: MouseEvent): void {
    const dice = this.deps.getDice();
    const camera = this.deps.getCamera();
    if (dice.length === 0 || !camera || !this.#canvas) return;

    const rect = this.#canvas.getBoundingClientRect();
    this.#pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.#raycaster.setFromCamera(this.#pointer, camera);
    const intersects = this.#raycaster.intersectObjects(dice, true);
    if (intersects.length === 0) return;

    let target: THREE.Object3D | null = intersects[0].object;
    while (target && !dice.includes(target as DiceMesh)) {
      target = target.parent;
    }
    if (!target) return;

    const die = target as DiceMesh;
    if (!die.dieId) return;
    this.deps.onDieClick(die.dieId, die.forcedValue);
  }
}
