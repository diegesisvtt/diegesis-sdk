import { describe, expect, test } from 'bun:test';
import { validate, version } from 'uuid';
import { newId } from '../src/ids';

describe('newId', () => {
  test('generates valid UUID v7', () => {
    const id = newId();
    expect(validate(id)).toBe(true);
    expect(version(id)).toBe(7);
  });

  test('ids are unique', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
  });

  test('ids are time-ordered', () => {
    const a = newId();
    const b = newId();
    expect(a <= b).toBe(true);
  });
});
