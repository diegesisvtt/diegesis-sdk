import * as THREE from 'three';
import type { FacesSpec } from '@diegesis/dice-core';

import type { DiceShape } from '../constants/dice';
import { computeFaceNormals, type DiceGeometryType } from './geometry';

export const BODY_TYPE_DYNAMIC = 1;
export const BODY_TYPE_KINEMATIC = 3;
export const BODY_SLEEP_STATE = 2;

export interface DieBodyState {
  quaternion: THREE.Quaternion;
  sleepState: number;
  type: number;
}

export function createDieBodyState(): DieBodyState {
  return { quaternion: new THREE.Quaternion(), sleepState: 0, type: BODY_TYPE_DYNAMIC };
}

export interface AxisPayload {
  x: number;
  y: number;
  z: number;
  a: number;
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface ThrowVector {
  type: string;
  colorset?: string;
  pos: Vector3Like;
  velocity: Vector3Like;
  angle: Vector3Like;
  axis: AxisPayload;
}

export function createEmptyThrowVector(type: string): ThrowVector {
  return {
    type,
    pos: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    angle: { x: 0, y: 0, z: 0 },
    axis: { x: 0, y: 0, z: 0, a: 0 },
  };
}

export interface DiceValues {
  value: number;
  label: string;
}

export interface DiceObject {
  shape: string;
  scale: number;
  mass: number;
  inertia: number;
  values: number[];
  labels: any[];
  color?: string;
  font?: string;
  normals?: any[];
  type?: string;
  modelFile?: string;
}

export interface DiceColorData {
  id?: string;
  foreground: string | string[];
  background: string | string[];
  outline?: string | string[];
  texture: any;
  edge?: string | string[];
  font?: string;
  fontOffsetY?: number;
  labels?: Record<string, any[]>;
  emissive?: boolean;
  materialOptions?: {
    color?: number;
    roughness?: number;
    metalness?: number;
    envMapIntensity?: number;
  };
}

export type DiceMaterial =
  | THREE.MeshStandardMaterial
  | THREE.MeshPhongMaterial
  | THREE.MeshPhysicalMaterial;

export interface DiceMeshBehavior {
  dieId: string;
  faces: FacesSpec;
  forcedValue: number;
  shape: DiceShape;
  mass: number;
  throw: ThrowVector;
  body?: DieBodyState;
  valueGeometry?: DiceGeometryType;
  getFaceValue: () => DiceValues;
}

export type DiceMesh = THREE.Mesh & DiceMeshBehavior;

const scratchFaceNormal = new THREE.Vector3();
const scratchUpVector = new THREE.Vector3();

function readFaceValue(mesh: DiceMesh, preset: DiceObject): DiceValues {
  const empty: DiceValues = { value: 0, label: '' };

  scratchUpVector.set(0, 0, mesh.shape === 'd4' ? -1 : 1);

  const geom = (mesh.valueGeometry ?? mesh.geometry) as DiceGeometryType | undefined;
  if (!geom?.groups) return empty;
  const faceNormals = computeFaceNormals(geom);

  const quaternion = mesh.body?.quaternion;
  if (!quaternion) return empty;

  let closestFace: THREE.GeometryGroup | undefined;
  let closestAngle = Math.PI * 2;

  for (let i = 0; i < geom.groups.length; ++i) {
    const face = geom.groups[i];
    if (!face || face.materialIndex === 0) continue;

    scratchFaceNormal.set(faceNormals[i * 3], faceNormals[i * 3 + 1], faceNormals[i * 3 + 2]);
    const angle = scratchFaceNormal.applyQuaternion(quaternion).angleTo(scratchUpVector);

    if (angle < closestAngle) {
      closestAngle = angle;
      closestFace = face;
    }
  }

  if (!closestFace?.materialIndex) return empty;

  const matindex = closestFace.materialIndex - 1;

  if (mesh.shape === 'd4') {
    const labelindex2 = matindex - 1 === 0 ? 5 : matindex;
    const labels = preset.labels[matindex - 1] as unknown[] | undefined;
    if (!labels) return empty;

    const labelArray = labels[labelindex2] as unknown[] | undefined;
    if (!labelArray) return empty;

    return {
      value: matindex,
      label: (labelArray[0] as string | undefined) || '',
    };
  }

  const isOffsetShape = mesh.shape === 'd10' || mesh.shape === 'd2';
  const offset = isOffsetShape ? 1 : 2;
  const adjustedMatindex = isOffsetShape ? matindex + 1 : matindex;

  const value = preset.values[(adjustedMatindex - 1) % preset.values.length];
  const labelIndex = ((adjustedMatindex - 1) % (preset.labels.length - 2)) + offset;
  const label = (preset.labels[labelIndex] as string | undefined) || '';

  return { value, label };
}

function attachDiceBehavior<T extends THREE.Object3D>(object: T, preset: DiceObject, type: string): T & DiceMeshBehavior {
  const target = object as T & DiceMeshBehavior;

  target.dieId = '';
  target.faces = { kind: 'number', value: 0 };
  target.forcedValue = 0;
  target.shape = preset.shape as DiceShape;
  target.mass = preset.mass;
  target.throw = createEmptyThrowVector(type);

  target.getFaceValue = () => readFaceValue(target as unknown as DiceMesh, preset);

  return target;
}

export function createDiceMesh(mesh: THREE.Mesh, preset: DiceObject, type: string): DiceMesh {
  return attachDiceBehavior(mesh, preset, type);
}

export function createDiceMeshFromModel(model: THREE.Object3D, preset: DiceObject, type: string): DiceMesh {
  const attached = attachDiceBehavior(model, preset, type);
  return attached as unknown as DiceMesh;
}
