import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fitMapCamera, gestureCamera, project, zoomCamera,
  MIN_MAP_ZOOM, MAX_MAP_ZOOM, TILE_SIZE,
} from '../src/lib/map-camera.ts';

const size = { width: 400, height: 600 };
const camera = { center: { x: 0.5, y: 0.5 }, zoom: 12 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9);

test('fits real route coordinates and rejects an empty or unmeasured map', () => {
  assert.equal(fitMapCamera([], size), null);
  assert.equal(fitMapCamera([{ latitude: 14.7, longitude: -17.4 }], { width: 0, height: 600 }), null);
  const points = [{ latitude: 14.7, longitude: -17.4 }, { latitude: 14.75, longitude: -17.45 }];
  const fitted = fitMapCamera(points, size);
  for (const point of points) {
    const pixel = project(point, fitted.zoom);
    assert.ok(Math.abs(pixel.x - fitted.center.x * TILE_SIZE * 2 ** fitted.zoom) <= size.width / 2);
    assert.ok(Math.abs(pixel.y - fitted.center.y * TILE_SIZE * 2 ** fitted.zoom) <= size.height / 2);
  }
});

test('one finger moves the map without changing zoom', () => {
  const moved = gestureCamera(camera, size, [{ x: 100, y: 100 }], [{ x: 180, y: 160 }]);
  near(moved.center.x, camera.center.x - 80 / (TILE_SIZE * 2 ** camera.zoom));
  near(moved.center.y, camera.center.y - 60 / (TILE_SIZE * 2 ** camera.zoom));
  assert.equal(moved.zoom, camera.zoom);
});

test('pinching zooms continuously around the fingers rather than the screen center', () => {
  const initial = [{ x: 50, y: 100 }, { x: 150, y: 100 }];
  const current = [{ x: 25, y: 120 }, { x: 175, y: 120 }];
  const moved = gestureCamera(camera, size, initial, current);
  near(moved.zoom, camera.zoom + Math.log2(1.5));
  const anchorX = camera.center.x + (100 - size.width / 2) / (TILE_SIZE * 2 ** camera.zoom);
  const anchorY = camera.center.y + (100 - size.height / 2) / (TILE_SIZE * 2 ** camera.zoom);
  near((anchorX - moved.center.x) * TILE_SIZE * 2 ** moved.zoom + size.width / 2, 100);
  near((anchorY - moved.center.y) * TILE_SIZE * 2 ** moved.zoom + size.height / 2, 120);
});

test('zoom controls respect tile bounds and preserve the selected center', () => {
  assert.equal(zoomCamera(camera, 100).zoom, MAX_MAP_ZOOM);
  assert.equal(zoomCamera(camera, -100).zoom, MIN_MAP_ZOOM);
  assert.deepEqual(zoomCamera(camera, 1).center, camera.center);
});

test('gesture completion and coincident fingers never introduce invalid coordinates', () => {
  assert.deepEqual(gestureCamera(camera, size, [], []), camera);
  const moved = gestureCamera(camera, size, [{ x: 10, y: 10 }, { x: 10, y: 10 }], [{ x: 10, y: 10 }, { x: 20, y: 20 }]);
  assert.ok(Number.isFinite(moved.center.x));
  assert.equal(moved.zoom, camera.zoom);
});

test('panning permits world wrapping horizontally and clamps at the poles', () => {
  const moved = gestureCamera(camera, size, [{ x: 0, y: 0 }], [{ x: 1e9, y: -1e9 }]);
  assert.ok(moved.center.x < 0);
  assert.equal(moved.center.y, 1);
});