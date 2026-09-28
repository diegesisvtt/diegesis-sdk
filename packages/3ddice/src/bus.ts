import * as v from 'valibot';
import { createBus } from '@diegesis/events';

import { FacesSpecSchema } from './contract';

export const RolledDieSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  value: v.number(),
  faces: FacesSpecSchema,
});

export const RolledTermSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  dice: v.array(RolledDieSchema),
});

export const RollOutcomeSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  terms: v.array(RolledTermSchema),
  dice: v.array(RolledDieSchema),
});

export const diceContract = {
  namespace: 'dice',
  events: {
    ready: v.optional(v.object({})),
    'roll:start': v.object({ id: v.pipe(v.string(), v.uuid()) }),
    'roll:finish': RollOutcomeSchema,
    'roll:cancel': v.looseObject({ id: v.optional(v.string()) }),
    'die:click': v.object({ id: v.pipe(v.string(), v.uuid()), value: v.number() }),
    'theme:change': v.object({ theme: v.string() }),
    error: v.custom<Error>((input) => input instanceof Error),
  },
};

export function createDiceBus() {
  return createBus(diceContract, { validate: 'warn' });
}

export type DiceBus = ReturnType<typeof createDiceBus>;
export type DiceBusEvents = typeof diceContract.events;
