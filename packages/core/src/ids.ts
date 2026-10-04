// Canonical id generation for Diegesis: UUID v7 (time-ordered, URL-safe,
// database-friendly). Replaces ad-hoc Math.random/base36 id helpers in host
// apps — ids are opaque strings, so existing ids keep working.
import { v7 as uuidv7 } from 'uuid';

/** generates a new unique id (UUID v7) */
export function newId(): string {
  return uuidv7();
}

export { uuidv7 };
