import { describe, expect, it } from 'bun:test';

import { normalizeOptions, normalizeShadows, validateOptions } from '../src/box/config';
import { DiceError } from '../src/errors';

describe('validateOptions', () => {
  it('aceita options válidas', () => {
    expect(validateOptions({ theme: 'default', shadows: 'high' })).toMatchObject({
      theme: 'default',
      shadows: 'high',
    });
  });

  it('lança DiceError em options inválidas', () => {
    expect(() => validateOptions({ shadows: 'ultra' })).toThrow(DiceError);
    expect(() => validateOptions({ queueMode: 'random' })).toThrow(DiceError);
    expect(() => validateOptions({ assetPath: 42 })).toThrow(DiceError);
  });

  it('aceita customColorset com campos conhecidos', () => {
    const result = validateOptions({
      customColorset: { foreground: '#fff', background: '#000' },
    });
    expect(result.customColorset).toMatchObject({ foreground: '#fff' });
  });
});

describe('normalizeShadows', () => {
  it('mapeia booleanos e undefined', () => {
    expect(normalizeShadows(undefined)).toBe('medium');
    expect(normalizeShadows(true)).toBe('medium');
    expect(normalizeShadows(false)).toBe('none');
    expect(normalizeShadows('low')).toBe('low');
  });
});

describe('normalizeOptions', () => {
  it('aplica defaults', () => {
    const config = normalizeOptions({});
    expect(config.theme).toBe('default');
    expect(config.shadows).toBe('medium');
    expect(config.queueMode).toBe('serial');
    expect(config.sounds).toBe(false);
  });

  it('resolve aliases deprecated', () => {
    const config = normalizeOptions({ theme_colorset: 'bronze' });
    expect(config.theme).toBe('bronze');
  });
});
