const TILE_HOSTS = ['a', 'b', 'c', 'd'] as const;

export function getDriverMapTileUrls(zoom: number, tileX: number, tileY: number): string[] {
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 24) return [];

  const tileCount = 2 ** zoom;
  if (!Number.isInteger(tileX) || !Number.isInteger(tileY) || tileY < 0 || tileY >= tileCount) {
    return [];
  }

  const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
  const host = TILE_HOSTS[Math.abs(tileX + tileY) % TILE_HOSTS.length];

  return [
    `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
    `https://${host}.basemaps.cartocdn.com/light_all/${zoom}/${wrappedX}/${tileY}@2x.png`,
  ];
}