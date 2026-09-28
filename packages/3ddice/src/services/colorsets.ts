import type { DiceColorData } from './dice-mesh';

export interface ColorSetSnapshot {
  colordata?: DiceColorData;
  labelColor: string | string[];
  diceColor: string | string[];
  labelOutline: string | string[];
  diceTexture: any;
  diceMaterial: string | string[];
  edgeColor: string | string[];
  diceFont: string;
  diceLabels: Record<string, any[]>;
  diceFontOffsetY: number;
  diceEmissive: boolean;
  materialOverrides: DiceColorData['materialOptions'];
}

export class DiceColorState {
  labelColor: string | string[] = '';
  diceColor: string | string[] = '';
  edgeColor: string | string[] = '';
  labelOutline: string | string[] = '';
  diceTexture: any = '';
  diceMaterial: string | string[] = '';
  diceFont = 'Arial';
  diceLabels: Record<string, any[]> = {};
  diceFontOffsetY = 0;
  diceEmissive = false;
  materialOverrides: DiceColorData['materialOptions'] = undefined;
  colordata?: DiceColorData;

  diceColorRand: any = '';
  labelColorRand = '';
  labelOutlineRand = '';
  diceTextureRand: any = '';
  diceMaterialRand = '';
  edgeColorRand = '';

  applyColorSet(colordata: DiceColorData): void {
    this.diceFont = 'Arial';
    this.diceLabels = {};
    this.assignColorData(colordata);
  }

  assignColorData(colordata: DiceColorData): void {
    this.colordata = colordata;
    this.labelColor = colordata.foreground;
    this.diceColor = colordata.background;
    this.labelOutline = colordata.outline;
    this.diceTexture = colordata.texture;
    this.diceMaterial = colordata.texture?.material || 'none';
    this.edgeColor = colordata.edge || colordata.background;
    if (colordata.font) {
      this.diceFont = colordata.font;
    }
    if (colordata.labels) {
      this.diceLabels = colordata.labels;
    }
    if (colordata.fontOffsetY !== undefined) {
      this.diceFontOffsetY = colordata.fontOffsetY;
    }
    this.diceEmissive = colordata.emissive ?? false;
    this.materialOverrides = colordata.materialOptions;
  }

  resetRandom(): void {
    this.diceColorRand = '';
    this.labelColorRand = '';
    this.labelOutlineRand = '';
    this.diceTextureRand = '';
    this.diceMaterialRand = '';
    this.edgeColorRand = '';
  }

  setRandomColors(): void {
    if (Array.isArray(this.diceColor)) {
      const colorindex = Math.floor(Math.random() * this.diceColor.length);

      if (
        Array.isArray(this.labelColor) &&
        this.labelColor.length == this.diceColor.length
      ) {
        this.labelColorRand = this.labelColor[colorindex];

        if (
          Array.isArray(this.labelOutline) &&
          this.labelOutline.length == this.labelColor.length
        ) {
          this.labelOutlineRand = this.labelOutline[colorindex];
        }
      }
      if (
        Array.isArray(this.diceTexture) &&
        this.diceTexture.length == this.diceColor.length
      ) {
        this.diceTextureRand = this.diceTexture[colorindex];
        this.diceMaterialRand = this.diceTextureRand.material;
      }

      if (
        Array.isArray(this.edgeColor) &&
        this.edgeColor.length == this.diceColor.length
      ) {
        this.edgeColorRand = this.edgeColor[colorindex];
      }

      this.diceColorRand = this.diceColor[colorindex];
    } else {
      this.diceColorRand = this.diceColor;
    }

    if (this.edgeColorRand === '') {
      if (Array.isArray(this.edgeColor)) {
        const colorindex = Math.floor(Math.random() * this.edgeColor.length);
        this.edgeColorRand = this.edgeColor[colorindex];
      } else {
        this.edgeColorRand = this.edgeColor as string;
      }
    }

    if (this.labelColorRand === '' && Array.isArray(this.labelColor)) {
      const colorindex = Math.floor(Math.random() * this.labelColor.length);

      if (
        Array.isArray(this.labelOutline) &&
        this.labelOutline.length == this.labelColor.length
      ) {
        this.labelOutlineRand = this.labelOutline[colorindex];
      }

      this.labelColorRand = this.labelColor[colorindex];
    } else if (this.labelColorRand === '') {
      this.labelColorRand = this.labelColor as string;
    }

    if (this.labelOutlineRand === '' && Array.isArray(this.labelOutline)) {
      const colorindex = Math.floor(Math.random() * this.labelOutline.length);
      this.labelOutlineRand = this.labelOutline[colorindex];
    } else if (this.labelOutlineRand === '') {
      this.labelOutlineRand = this.labelOutline as string;
    }

    if (this.diceTextureRand === '' && Array.isArray(this.diceTexture)) {
      this.diceTextureRand =
        this.diceTexture[
        Math.floor(Math.random() * this.diceTexture.length)
        ];
      this.diceMaterialRand =
        this.diceTextureRand.material || this.diceMaterial;
    } else if (this.diceTextureRand === '') {
      this.diceTextureRand = this.diceTexture;
      this.diceMaterialRand =
        this.diceTextureRand.material || this.diceMaterial;
    }

    if (this.diceMaterialRand === '' && Array.isArray(this.diceMaterial)) {
      this.diceMaterialRand =
        this.diceMaterial[
        Math.floor(Math.random() * this.diceMaterial.length)
        ];
    } else if (this.diceMaterialRand === '') {
      this.diceMaterialRand = this.diceMaterial as string;
    }
  }

  snapshot(): ColorSetSnapshot {
    return {
      colordata: this.colordata,
      labelColor: this.labelColor,
      diceColor: this.diceColor,
      labelOutline: this.labelOutline,
      diceTexture: this.diceTexture,
      diceMaterial: this.diceMaterial,
      edgeColor: this.edgeColor,
      diceFont: this.diceFont,
      diceLabels: this.diceLabels,
      diceFontOffsetY: this.diceFontOffsetY,
      diceEmissive: this.diceEmissive,
      materialOverrides: this.materialOverrides,
    };
  }

  restore(snapshot: ColorSetSnapshot): void {
    this.colordata = snapshot.colordata;
    this.labelColor = snapshot.labelColor;
    this.diceColor = snapshot.diceColor;
    this.labelOutline = snapshot.labelOutline;
    this.diceTexture = snapshot.diceTexture;
    this.diceMaterial = snapshot.diceMaterial;
    this.edgeColor = snapshot.edgeColor;
    this.diceFont = snapshot.diceFont;
    this.diceLabels = snapshot.diceLabels;
    this.diceFontOffsetY = snapshot.diceFontOffsetY;
    this.diceEmissive = snapshot.diceEmissive;
    this.materialOverrides = snapshot.materialOverrides;
  }
}

export function processDiceLabels(shape: string, faces: any[]): any[] {
  if (shape === 'd4') {
    const [a, b, c, d] = faces;
    return [
      [[], [0, 0, 0], [b, d, c], [a, c, d], [b, a, d], [a, b, c]],
      [[], [0, 0, 0], [b, c, d], [c, a, d], [b, d, a], [c, b, a]],
      [[], [0, 0, 0], [d, c, b], [c, d, a], [d, b, a], [c, a, b]],
      [[], [0, 0, 0], [d, b, c], [a, d, c], [d, a, b], [a, c, b]],
    ];
  }

  const targetArray = ['', ''];
  if (['d2', 'd10'].includes(shape)) {
    targetArray.pop();
  }
  return [...targetArray, ...faces];
}
