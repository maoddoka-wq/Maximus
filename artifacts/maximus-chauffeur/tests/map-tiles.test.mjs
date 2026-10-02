import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DRIVER_MAP_TILE_HEADERS,
  getDriverMapTileUrls,
} from '../src/lib/map-tiles.ts';

test('uses the canonical OpenStreetMap tile host and identifies the app', () => {
  assert.deepEqual(getDriverMapTileUrls(2, 1, 1), [
    'https://tile.openstreetmap.org/2/1/1.png',
  ]);
  assert.equal(
    DRIVER_MAP_TILE_HEADERS['User-Agent'],
    'MAXIMUS Chauffeur (+https://github.com/maoddoka-wq/Maximus)',
  );
});

test('wraps tiles across the horizontal world edge without changing tile hosts', () => {
  assert.deepEqual(getDriverMapTileUrls(2, -1, 1), [
    'https://tile.openstreetmap.org/2/3/1.png',
  ]);
});

test('rejects tiles outside the valid zoom and vertical world bounds', () => {
  assert.deepEqual(getDriverMapTileUrls(2, 0, -1), []);
  assert.deepEqual(getDriverMapTileUrls(2, 0, 4), []);
  assert.deepEqual(getDriverMapTileUrls(-1, 0, 0), []);
});