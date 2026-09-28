import { describe, expect, it } from 'bun:test';

import { RollQueue } from '../src/box/roll-queue';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('RollQueue', () => {
  it('serializa tarefas no modo serial', async () => {
    const order: string[] = [];
    const queue = new RollQueue(() => 'serial', () => {});
    const first = deferred<string>();
    const second = deferred<string>();

    const p1 = queue.enqueue(async () => {
      order.push('start-1');
      const value = await first.promise;
      order.push('end-1');
      return value;
    });
    const p2 = queue.enqueue(async () => {
      order.push('start-2');
      const value = await second.promise;
      order.push('end-2');
      return value;
    });

    second.resolve('b');
    await Promise.resolve();
    first.resolve('a');

    expect(await p1).toBe('a');
    expect(await p2).toBe('b');
    expect(order).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
  });

  it('continua a fila após rejeição', async () => {
    const queue = new RollQueue(() => 'serial', () => {});
    const failing = queue.enqueue(async () => {
      throw new Error('boom');
    });
    const next = queue.enqueue(async () => 'ok');

    await expect(failing).rejects.toThrow('boom');
    expect(await next).toBe('ok');
  });

  it('executa imediatamente no modo parallel', async () => {
    const queue = new RollQueue(() => 'parallel', () => {});
    expect(await queue.enqueue(async () => 42)).toBe(42);
  });

  it('cancela a tarefa corrente no modo replace', async () => {
    let cancelled = 0;
    const queue = new RollQueue(() => 'replace', () => cancelled++);
    const blocker = deferred<void>();
    const p1 = queue.enqueue(() => blocker.promise);
    expect(cancelled).toBe(1);
    queue.enqueue(async () => 'next');
    expect(cancelled).toBe(2);
    blocker.resolve();
    await p1;
  });
});
