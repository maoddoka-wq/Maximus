import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCompanyModuleAccess, synchronizeCompanyModuleAccess } from './module-api';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('refuse une réponse modules provenant d’une autre entreprise', async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      companyId: 'autre-entreprise',
      modules: [],
    });

  await assert.rejects(
    () => loadCompanyModuleAccess('ana'),
    /ne correspond pas à cette entreprise/,
  );
});

test('refuse un accès attendu absent ou inactif', async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      companyId: 'ana',
      modules: [
        {
          id: 'stocks',
          name: 'Gestion de stock',
          description: '',
          features: [],
          status: 'INACTIF',
          featureIds: [],
          configuration: {},
        },
      ],
    });

  await assert.rejects(
    () => loadCompanyModuleAccess('ana', ['stocks']),
    /accès serveur sont incomplets/,
  );
});

test('synchronise tous les modules et confirme leur activation', async () => {
  const requests: string[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push(`${init?.method ?? 'GET'} ${String(input)}`);
    const moduleId = new URL(String(input), 'http://localhost').pathname.split('/').at(-2);
    return jsonResponse({
      companyId: 'ana',
      module: {
        id: moduleId,
        name: moduleId,
        description: '',
        features: [],
        status: 'ACTIF',
        featureIds: [],
        configuration: {},
      },
    });
  };

  await synchronizeCompanyModuleAccess('ana', ['stocks', 'commerce']);

  assert.equal(requests.length, 2);
  assert.ok(requests.some((request) => request.includes('/stocks/access?companyId=ana')));
  assert.ok(requests.some((request) => request.includes('/commerce/access?companyId=ana')));
});