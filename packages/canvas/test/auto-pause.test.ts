import { afterAll, describe, expect, it } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

const { Canvas } = await import('../src/canvas');

afterAll(() => {
  GlobalRegistrator.unregister();
});

function setHidden(canvas: Canvas, host: boolean, doc: boolean): void {
  (canvas as any)._hostHidden = host;
  (canvas as any)._docHidden = doc;
}

describe('auto-pause do loop de render', () => {
  it('inicia rodando com host visível e aba em primeiro plano', () => {
    const canvas = new Canvas(document.createElement('div'));
    expect(canvas.paused).toBe(false);
    canvas.destroy();
  });

  it('pause()/resume() controlam o estado manual', () => {
    const canvas = new Canvas(document.createElement('div'));
    canvas.pause();
    expect(canvas.paused).toBe(true);
    canvas.resume();
    expect(canvas.paused).toBe(false);
    canvas.destroy();
  });

  it('host oculto (aba com display:none) pausa o loop por padrão', () => {
    const canvas = new Canvas(document.createElement('div'));
    setHidden(canvas, true, false);
    expect(canvas.paused).toBe(true);
    setHidden(canvas, false, false);
    expect(canvas.paused).toBe(false);
    canvas.destroy();
  });

  it('aba do navegador em segundo plano pausa o loop por padrão', () => {
    const canvas = new Canvas(document.createElement('div'));
    setHidden(canvas, false, true);
    expect(canvas.paused).toBe(true);
    canvas.destroy();
  });

  it('autoPause: false mantém o loop rodando mesmo oculto (render offscreen)', () => {
    const canvas = new Canvas(document.createElement('div'), { autoPause: false });
    setHidden(canvas, true, true);
    expect(canvas.paused).toBe(false);
    canvas.destroy();
  });

  it('pausa manual vence a visibilidade mesmo com autoPause: false', () => {
    const canvas = new Canvas(document.createElement('div'), { autoPause: false });
    canvas.pause();
    setHidden(canvas, true, true);
    expect(canvas.paused).toBe(true);
    canvas.resume();
    expect(canvas.paused).toBe(false);
    canvas.destroy();
  });
});
