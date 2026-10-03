export type MapPoint = { latitude: number; longitude: number };
export type MapPixel = { x: number; y: number };
export type MapCamera = { center: MapPixel; zoom: number };
export type MapSize = { width: number; height: number };

export const TILE_SIZE = 256;
export const MIN_MAP_ZOOM = 3;
export const MAX_MAP_ZOOM = 19;

export function project(point: MapPoint, zoom: number): MapPixel {
  const latitude = Math.max(-85.05112878, Math.min(85.05112878, point.latitude));
  const sin = Math.sin((latitude * Math.PI) / 180);
  const worldSize = TILE_SIZE * 2 ** zoom;
  return {
    x: ((point.longitude + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize,
  };
}

export function fitMapCamera(points: MapPoint[], size: MapSize): MapCamera | null {
  if (!points.length || size.width <= 0 || size.height <= 0) return null;
  const pixels = points.map((point) => project(point, 0));
  const minX = Math.min(...pixels.map((point) => point.x));
  const maxX = Math.max(...pixels.map((point) => point.x));
  const minY = Math.min(...pixels.map((point) => point.y));
  const maxY = Math.max(...pixels.map((point) => point.y));
  let zoom = 17;
  while (zoom > MIN_MAP_ZOOM) {
    if ((maxX - minX) * 2 ** zoom <= size.width - 56
      && (maxY - minY) * 2 ** zoom <= size.height - 56) break;
    zoom -= 1;
  }
  return {
    center: { x: (minX + maxX) / (2 * TILE_SIZE), y: (minY + maxY) / (2 * TILE_SIZE) },
    zoom,
  };
}

export function boundCamera(camera: MapCamera): MapCamera {
  return {
    center: {
      // Permit continuous panning across the antimeridian; tile URLs wrap X.
      x: camera.center.x,
      y: Math.max(0, Math.min(1, camera.center.y)),
    },
    zoom: Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, camera.zoom)),
  };
}

export function zoomCamera(camera: MapCamera, delta: number): MapCamera {
  return boundCamera({ ...camera, zoom: camera.zoom + delta });
}

function touchCenter(touches: MapPixel[]): MapPixel {
  const active = touches.slice(0, 2);
  return {
    x: active.reduce((sum, point) => sum + point.x, 0) / active.length,
    y: active.reduce((sum, point) => sum + point.y, 0) / active.length,
  };
}

function touchDistance(touches: MapPixel[]): number {
  return touches.length < 2 ? 0 : Math.hypot(
    touches[1].x - touches[0].x,
    touches[1].y - touches[0].y,
  );
}

export function gestureCamera(
  camera: MapCamera,
  size: MapSize,
  initialTouches: MapPixel[],
  currentTouches: MapPixel[],
): MapCamera {
  if (!initialTouches.length || !currentTouches.length) return camera;
  const start = touchCenter(initialTouches);
  const current = touchCenter(currentTouches);
  const initialDistance = touchDistance(initialTouches);
  const distance = touchDistance(currentTouches);
  const zoom = initialDistance > 0 && distance > 0
    ? zoomCamera(camera, Math.log2(distance / initialDistance)).zoom
    : camera.zoom;
  const oldWorldSize = TILE_SIZE * 2 ** camera.zoom;
  const newWorldSize = TILE_SIZE * 2 ** zoom;
  // Keep the world point under the initial fingers under their current midpoint.
  return boundCamera({
    zoom,
    center: {
      x: camera.center.x + (start.x - size.width / 2) / oldWorldSize
        - (current.x - size.width / 2) / newWorldSize,
      y: camera.center.y + (start.y - size.height / 2) / oldWorldSize
        - (current.y - size.height / 2) / newWorldSize,
    },
  });
}