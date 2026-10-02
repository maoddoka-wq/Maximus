const TILE_HOSTS = ['a', 'b', 'c'] as const;

export function getDriverMapTileUrls(zoom: number, tileX: number, tileY: number): string[] {
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 24) return [];

  const tileCount = 2 ** zoom;
  if (!Number.isInteger(tileX) || !Number.isInteger(tileY) || tileY < 0 || tileY >= tileCount) {
    return [];
  }

  const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
  const firstHost = ((tileX + tileY) % TILE_HOSTS.length + TILE_HOSTS.length) % TILE_HOSTS.length;
  const orderedHosts = [
    ...TILE_HOSTS.slice(firstHost),
    ...TILE_HOSTS.slice(0, firstHost),
  ];

  return orderedHosts.map(
    (host) => `https://${host}.tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
  );
}