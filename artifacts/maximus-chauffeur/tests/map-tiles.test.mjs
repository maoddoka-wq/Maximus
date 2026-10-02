import assert from 'node:assert/strict';
import test from 'node:test';
import { getDriverMapTileUrls } from '../src/lib/map-tiles.ts';

test('uses the same public OpenStreetMap tiles as the customer map, without a keyed map API', () => {
  assert.deepEqual(getDriverMapTileUrls(2, 1, 1), [
    'https://c.tile.openstreetmap.org/2/1/1.png',
    'https://a.tile.openstreetmap.org/2/1/1.png',
    'https://b.tile.openstreetmap.org/2/1/1.png',
  ]);
});

test('rotates among OpenStreetMap subdomains and wraps tiles across the horizontal world edge', () => {
  assert.deepEqual(getDriverMapTileUrls(2, -1, 1), [
    'https://a.tile.openstreetmap.org/2/3/1.png',
    'https://b.tile.openstreetmap.org/2/3/1.png',
    'https://c.tile.openstreetmap.org/2/3/1.png',
  ]);
});

test('rejects tiles outside the valid zoom and vertical world bounds', () => {
  assert.deepEqual(getDriverMapTileUrls(2, 0, -1), []);
  assert.deepEqual(getDriverMapTileUrls(2, 0, 4), []);
  assert.deepEqual(getDriverMapTileUrls(-1, 0, 0), []);
});