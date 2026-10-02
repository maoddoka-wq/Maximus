import assert from 'node:assert/strict';
import test from 'node:test';
import { getDriverMapTileUrls } from '../src/lib/map-tiles.ts';

test('uses OpenStreetMap first and CARTO as the fallback', () => {
  assert.deepEqual(getDriverMapTileUrls(2, 1, 1), [
    'https://tile.openstreetmap.org/2/1/1.png',
    'https://c.basemaps.cartocdn.com/light_all/2/1/1@2x.png',
  ]);
});

test('wraps tiles across the horizontal world edge', () => {
  assert.deepEqual(getDriverMapTileUrls(2, -1, 1), [
    'https://tile.openstreetmap.org/2/3/1.png',
    'https://a.basemaps.cartocdn.com/light_all/2/3/1@2x.png',
  ]);
});

test('rejects tiles outside the valid zoom and vertical world bounds', () => {
  assert.deepEqual(getDriverMapTileUrls(2, 0, -1), []);
  assert.deepEqual(getDriverMapTileUrls(2, 0, 4), []);
  assert.deepEqual(getDriverMapTileUrls(-1, 0, 0), []);
});