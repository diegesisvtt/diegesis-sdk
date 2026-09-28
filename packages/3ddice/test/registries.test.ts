import { describe, expect, it } from 'bun:test';

import { createDiceRegistries } from '../src/registries';

describe('createDiceRegistries', () => {
  it('cria instâncias isoladas com seeds padrão', () => {
    const a = createDiceRegistries();
    const b = createDiceRegistries();

    a.registerTheme('custom', { name: 'Custom', surface: 'felt', colors: {} } as never);

    expect(a.hasTheme('custom')).toBe(true);
    expect(b.hasTheme('custom')).toBe(false);
  });

  it('faz fallback para o tema default', () => {
    const registries = createDiceRegistries();
    expect(registries.getTheme('inexistente')).toEqual(registries.getTheme('default'));
  });

  it('registra e lista texturas, materiais e modelos', () => {
    const registries = createDiceRegistries();
    registries.registerMaterial('glass', { name: 'Glass' } as never);
    registries.registerDiceModel({ type: 'd6', url: 'models/d6.glb' });

    expect(registries.getMaterial('glass')).toMatchObject({ name: 'Glass' });
    expect(registries.getDiceModel('d6')).toMatchObject({ url: 'models/d6.glb' });
    expect(Object.keys(registries.listDiceModels())).toContain('d6');
  });
});
