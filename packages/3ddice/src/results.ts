import type { FacesSpec } from '@diegesis/dice-core';

export interface RolledDie {
  id: string;
  value: number;
  faces: FacesSpec;
}

export interface RolledTerm {
  id: string;
  dice: RolledDie[];
}

export interface RollOutcome {
  id: string;
  terms: RolledTerm[];
  dice: RolledDie[];
}

export interface RerollRequest {
  id: string;
  value: number;
}
