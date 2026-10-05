import { afterEach, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ApiRequestError, requestJson, setApiDatasetMode } from './api-request';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  setApiDatasetMode('real');
});

describe('api-request', () => {
  test('partage une même requête GET en cours', async () => {
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    globalThis.fetch = async () => {
      calls += 1;
      await gate;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const first = requestJson<{ ok: boolean }>('/slow-bootstrap');
    const second = requestJson<{ ok: boolean }>('/slow-bootstrap');

    assert.strictEqual(first, second);
    release();
    assert.deepEqual(await first, { ok: true });
    assert.equal(calls, 1);
  });

  test('transforme une requête bloquée en erreur explicite', async () => {
    globalThis.fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });

    await assert.rejects(
      requestJson('/never-responds', undefined, { timeoutMs: 5 }),
      (error: unknown) =>
        error instanceof ApiRequestError &&
        error.kind === 'timeout' &&
        error.message.includes('trop de temps'),
    );
  });

  test('transmet le jeu de données actif et change de jeu sans réutiliser la requête', async () => {
    const datasets: string[] = [];
    globalThis.fetch = async (_input, init) => {
      datasets.push(new Headers(init?.headers).get('X-Maximus-Dataset') ?? '');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    setApiDatasetMode('real');
    await requestJson('/dataset-real', undefined, { dedupe: false });
    setApiDatasetMode('demo');
    await requestJson('/dataset-demo', undefined, { dedupe: false });

    assert.deepEqual(datasets, ['real', 'demo']);
  });
});