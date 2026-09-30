import assert from 'node:assert/strict';
import test from 'node:test';
import { createTransportApi, transportMobileReleaseDownloadPath } from './transport-api';

test('loads the chauffeur release through the authenticated session without a client company id', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestCredentials: RequestCredentials | undefined;

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestCredentials = init?.credentials;
    return new Response(JSON.stringify({
      version: '1.0.7',
      name: 'MAXIMUS Chauffeur 1.0.7',
      publishedAt: '2026-09-30T00:00:00Z',
      sizeBytes: 116455518,
      sha256: null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const release = await createTransportApi('company-from-browser').latestMobileRelease();

    assert.equal(requestedUrl, '/api/transport/mobile/releases/latest');
    assert.equal(requestCredentials, 'include');
    assert.equal(release.version, '1.0.7');
    assert.equal(release.sizeBytes, 116455518);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('downloads the APK through the protected MAXIMUS API route', () => {
  assert.equal(
    transportMobileReleaseDownloadPath,
    '/api/transport/mobile/releases/latest/download',
  );
});