import { DICE } from '../constants/dice';
import { DiceError } from '../errors';
import type { DiceMaterial, DiceMesh, DiceObject } from './dice-mesh';

export interface FaceSwapDeps {
  getPreset: (type: string) => DiceObject;
  createMaterials: (
    diceobj: DiceObject,
    size: number,
    margin: number,
    allowcache: boolean,
    d4specialindex: number
  ) => Promise<DiceMaterial[]>;
}

export async function swapDiceFace(dicemesh: DiceMesh, result: number, deps: FaceSwapDeps): Promise<void> {
  const diceobj = deps.getPreset(dicemesh.throw.type);

  if (diceobj.shape == 'd4') {
    await swapDiceFaceD4(dicemesh, result, deps, diceobj);
    return;
  }

  let value = dicemesh.getFaceValue().value;
  let resultParsed = result;

  if (dicemesh.throw.type == 'd10' && value == 0) value = 10;
  if (dicemesh.throw.type == 'd100' && value == 0) value = 100;
  if (dicemesh.throw.type == 'd100' && value > 0 && value < 10) value *= 10;
  if (dicemesh.throw.type == 'd10' && resultParsed == 0) resultParsed = 10;
  if (dicemesh.throw.type == 'd100' && resultParsed == 0) resultParsed = 100;
  if (dicemesh.throw.type == 'd100' && resultParsed > 0 && resultParsed < 10) resultParsed *= 10;

  const valueindex = diceobj.values.indexOf(value);
  const resultindex = diceobj.values.indexOf(resultParsed);

  if (resultindex < 0) {
    throw new DiceError(
      `Result ${resultParsed} is not representable on a ${dicemesh.throw.type}`,
      'RESULT_OUT_OF_RANGE'
    );
  }
  if (valueindex < 0) return;
  if (valueindex == resultindex) return;

  const geom = dicemesh.geometry.clone();
  geom.userData.owned = true;

  const geomindexValue: number[] = [];
  const geomindexResult: number[] = [];

  let magic: number = DICE.MATERIAL_INDEX_DEFAULT;
  if (diceobj.shape == 'd10') magic = DICE.MATERIAL_INDEX_D10;

  let materialValue: number, materialResult: number;
  if (diceobj.shape != 'd2') {
    materialValue = valueindex + magic;
    materialResult = resultindex + magic;
  } else {
    materialValue = valueindex + 1;
    materialResult = resultindex + 1;
  }

  for (let i = 0, l = geom.groups.length; i < l; ++i) {
    const face = geom.groups[i];
    const matindex = face.materialIndex;

    if (matindex == materialValue) {
      geomindexValue.push(i);
      continue;
    }
    if (matindex == materialResult) {
      geomindexResult.push(i);
      continue;
    }
  }

  if (geomindexValue.length <= 0 || geomindexResult.length <= 0) return;

  for (let i = 0, l = geomindexResult.length; i < l; i++) {
    geom.groups[geomindexResult[i]].materialIndex = materialValue;
  }
  for (let i = 0, l = geomindexValue.length; i < l; i++) {
    geom.groups[geomindexValue[i]].materialIndex = materialResult;
  }

  dicemesh.geometry = geom;
}

export async function swapDiceFaceD4(
  dicemesh: DiceMesh,
  result: number,
  deps: FaceSwapDeps,
  diceobj?: DiceObject
): Promise<void> {
  const preset = diceobj ?? deps.getPreset(dicemesh.throw.type);
  const value = dicemesh.getFaceValue().value;

  if (!(value >= 1 && value <= 4)) return;

  let num = result - value;
  const geom = dicemesh.geometry.clone();
  geom.userData.owned = true;

  for (let i = 0, l = geom.groups.length; i < l; ++i) {
    const face = geom.groups[i];
    let matindex = face.materialIndex ?? 0;
    if (matindex == 0) continue;

    matindex += num - 1;
    while (matindex > 4) matindex -= 4;
    while (matindex < 1) matindex += 4;
    face.materialIndex = matindex + 1;
  }
  if (num != 0) {
    if (num < 0) num += 4;
    dicemesh.material = await deps.createMaterials(preset, 0, 0, false, num);
  }

  dicemesh.geometry = geom;
}
