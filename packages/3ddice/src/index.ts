export { DiceBox, createDiceBox } from './box/dice-box';
export type {
  DiceBoxEvents,
  MaterialRegistryFacade,
  ModelRegistryFacade,
  TextureRegistryFacade,
  ThemeRegistryFacade,
} from './box/dice-box';
export {
  DiceBoxOptionsSchema,
  normalizeOptions,
  normalizeShadows,
  validateOptions,
} from './box/config';
export type { DiceBoxOptions, NormalizedConfig, QueueMode, ShadowQuality } from './box/config';
export type { DiceBoxDeps } from './box/deps';

export { DiceTermSchema, DiceTermsSchema, FacesSpecSchema, assertResultInRange, isTensDie } from './contract';
export type { DiceTerm, DieResultInput, FacesInput } from './contract';
export type { RerollRequest, RolledDie, RolledTerm, RollOutcome } from './results';

export { DicePreset } from './services/preset';
export { DicePresetRegistry, createDefaultPresetRegistry } from './services/preset-registry';
export { DiceColors } from './services/colors';
export type { ColorSet } from './services/colors';

export { DiceRegistries, createDiceRegistries } from './registries';
export type { DiceModelRegistration, DiceRegistriesSeeds } from './registries';

export { DiceError, RollCancelledError, AssetLoadError } from './errors';
export { createDiceBus, diceContract, RolledDieSchema, RolledTermSchema, RollOutcomeSchema } from './bus';
export type { DiceBus, DiceBusEvents } from './bus';
export { buildDiceManifest } from './assets';
export { termsFromRoll } from './terms-from-roll';

export { THEMES } from './constants/themes';
export type { DiceTheme, DiceStyle } from './constants/themes';
export { TEXTURELIST } from './constants/texturelist';
export type { TextureEntry } from './constants/texturelist';
export { MATERIALTYPES } from './constants/materialtypes';
export type { MaterialOptions, MaterialType } from './constants/materialtypes';
