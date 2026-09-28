import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { resolveAssetPath } from '@diegesis/render3d';

export interface DiceLoadersOptions {
  assetPath: string;
  resolver: (url: string) => string;
  dracoPath?: string;
  loadBlob?: (url: string) => Promise<Blob>;
}

export class DiceAssetLoaders {
  #assetPath: string;
  #resolver: (url: string) => string;
  #loadBlob: (url: string) => Promise<Blob>;
  #gltf = new GLTFLoader();
  #draco?: DRACOLoader;

  constructor(options: DiceLoadersOptions) {
    this.#assetPath = options.assetPath;
    this.#resolver = options.resolver;
    this.#loadBlob = options.loadBlob ?? (async (url) => (await fetch(this.#resolver(url))).blob());
    if (options.dracoPath) {
      this.#draco = new DRACOLoader();
      this.#draco.setDecoderPath(resolveAssetPath(this.#assetPath, options.dracoPath));
      this.#gltf.setDRACOLoader(this.#draco);
    }
  }

  resolve(source: string): string {
    return this.#resolver(resolveAssetPath(this.#assetPath, source));
  }

  async loadModel(modelFile: string): Promise<THREE.Group | null> {
    const url = resolveAssetPath(this.#assetPath, modelFile);
    try {
      const blob = await this.#loadBlob(url);
      const buffer = await blob.arrayBuffer();
      const resourcePath = THREE.LoaderUtils.extractUrlBase(this.#resolver(url));
      return await new Promise<THREE.Group | null>((resolve) => {
        this.#gltf.parse(buffer, resourcePath, (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              mesh.geometry.center();
            }
          });
          resolve(model);
        }, (error) => {
          console.error('Failed to load dice model:', error);
          resolve(null);
        });
      });
    } catch (error) {
      console.error('Failed to load dice model:', error);
      return null;
    }
  }

  async loadTexture(source: string): Promise<THREE.Texture | null> {
    const url = resolveAssetPath(this.#assetPath, source);
    try {
      const blob = await this.#loadBlob(url);
      const bitmap = await createImageBitmap(blob);
      const texture = new THREE.Texture(bitmap);
      texture.needsUpdate = true;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    } catch (error) {
      console.warn(`Failed to load texture ${source}`, error);
      return null;
    }
  }

  dispose(): void {
    this.#draco?.dispose();
  }
}
