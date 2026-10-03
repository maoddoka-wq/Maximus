import assert from 'node:assert/strict';
import test from 'node:test';
import { createMapTileCache } from '../src/lib/map-tile-cache.ts';
import { DRIVER_MAP_TILE_HEADERS } from '../src/lib/map-tiles.ts';

const url = 'https://tile.openstreetmap.org/12/1849/1878.png';
const now = 1_800_000_000_000;

function fixture({ cached = null, status = 200, contentType = 'image/png' } = {}) {
  const calls = { downloads: [], published: [], discarded: [] };
  const storage = {
    async read() { return cached; },
    async download(uri, headers) {
      calls.downloads.push({ uri, headers });
      return { uri: 'file:///pending.png', status, headers: { 'Content-Type': contentType } };
    },
    async publish(uri, key) {
      calls.published.push({ uri, key });
      return 'file:///verified.png';
    },
    async discard(uri) { calls.discarded.push(uri); },
  };
  return { cache: createMapTileCache(storage, () => now), calls };
}

test('downloads with the explicit app identity and only displays a verified local tile', async () => {
  const { cache, calls } = fixture();
  assert.equal(await cache.load(url), 'file:///verified.png');
  assert.deepEqual(calls.downloads, [{ uri: url, headers: DRIVER_MAP_TILE_HEADERS }]);
  assert.deepEqual(calls.published, [{ uri: 'file:///pending.png', key: '12-1849-1878' }]);
});

test('rejects and deletes a 403 image instead of displaying or caching it', async () => {
  const { cache, calls } = fixture({ status: 403 });
  await assert.rejects(cache.load(url), /403.*GPS/);
  assert.equal(calls.published.length, 0);
  assert.deepEqual(calls.discarded, ['file:///pending.png']);
});

test('rejects server errors and non-PNG responses', async () => {
  for (const options of [{ status: 503 }, { contentType: 'text/html' }]) {
    const { cache, calls } = fixture(options);
    await assert.rejects(cache.load(url));
    assert.equal(calls.published.length, 0);
    assert.equal(calls.discarded.length, 1);
  }
});

test('reuses cached tiles for seven days without another request', async () => {
  const { cache, calls } = fixture({
    cached: { uri: 'file:///cached.png', modifiedAt: now - 6 * 24 * 60 * 60 * 1_000 },
  });
  assert.equal(await cache.load(url), 'file:///cached.png');
  assert.equal(calls.downloads.length, 0);
});

test('refreshes an expired tile using normal request headers, not no-cache', async () => {
  const { cache, calls } = fixture({
    cached: { uri: 'file:///cached.png', modifiedAt: now - 7 * 24 * 60 * 60 * 1_000 },
  });
  assert.equal(await cache.load(url), 'file:///verified.png');
  assert.equal(calls.downloads.length, 1);
  assert.equal(calls.downloads[0].headers['Cache-Control'], undefined);
});

test('shares simultaneous downloads of the same visible tile', async () => {
  const { cache, calls } = fixture();
  const results = await Promise.all([cache.load(url), cache.load(url), cache.load(url)]);
  assert.deepEqual(results, Array(3).fill('file:///verified.png'));
  assert.equal(calls.downloads.length, 1);
});

test('allows an explicit retry after a refused tile', async () => {
  const { cache, calls } = fixture({ status: 403 });
  await assert.rejects(cache.load(url));
  await assert.rejects(cache.load(url));
  assert.equal(calls.downloads.length, 2);
});

test('does not bypass a block by switching to another host', () => {
  const { cache, calls } = fixture();
  assert.throws(() => cache.load('https://a.tile.openstreetmap.org/12/1849/1878.png'));
  assert.equal(calls.downloads.length, 0);
});

test('discards a cached tile that the native image decoder cannot read', async () => {
  const { cache, calls } = fixture({
    cached: { uri: 'file:///cached.png', modifiedAt: now },
  });
  await cache.invalidate(url);
  assert.deepEqual(calls.discarded, ['file:///cached.png']);
});