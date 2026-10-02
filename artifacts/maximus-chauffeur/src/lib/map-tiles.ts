const TILE_BASE_URL = 'https://tile.openstreetmap.org';

export const DRIVER_MAP_TILE_HEADERS = {
  'User-Agent': 'MAXIMUS-Chauffeur/1.0.10 (+https://github.com/maoddoka-wq/Maximus)',
} as const;

export function getDriverMapTileUrls(zoom: number, tileX: number, tileY: number): string[] {
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 24) return [];

  const tileCount = 2 ** zoom;
  if (!Number.isInteger(tileX) || !Number.isInteger(tileY) || tileY < 0 || tileY >= tileCount) {
    return [];
  }

  const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;

  return [`${TILE_BASE_URL}/${zoom}/${wrappedX}/${tileY}.png`];
}