import { NotationErrorBase, type NotationErrorOptions } from '@diegesis/dice-notation-core';

export type FoundryNotationErrorOptions = NotationErrorOptions;

export class FoundryNotationError extends NotationErrorBase {
  constructor(message: string, options: FoundryNotationErrorOptions = {}) {
    super('FoundryNotationError', message, options);
  }
}
