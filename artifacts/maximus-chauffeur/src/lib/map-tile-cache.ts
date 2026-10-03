import { DRIVER_MAP_TILE_HEADERS } from './map-tiles.ts';

const CACHE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

type CachedTile = { uri: string; modifiedAt: number };
type DownloadedTile = {
  uri: string;
  status: number;
  headers: Record<string, string>;
};

export interface MapTileStorage {
  read: (key: string) => Promise<CachedTile | null>;
  download: (url: string, headers: Record<string, string>) => Promise<DownloadedTile>;
  publish: (temporaryUri: string, key: string) => Promise<string>;
  discard: (uri: string) => Promise<void>;
}

function tileKey(url: string): string {
  const match = /^https:\/\/tile\.openstreetmap\.org\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(url);
  if (!match) throw new Error('Adresse de tuile OpenStreetMap invalide.');
  return match.slice(1).join('-');
}

export function createMapTileCache(storage: MapTileStorage, now = Date.now) {
  const inFlight = new Map<string, Promise<string>>();

  async function loadTile(url: string, key: string): Promise<string> {
    const cached = await storage.read(key);
    if (cached && now() - cached.modifiedAt >= 0 && now() - cached.modifiedAt < CACHE_LIFETIME_MS) {
      return cached.uri;
    }

    const downloaded = await storage.download(url, DRIVER_MAP_TILE_HEADERS);
    try {
      if (downloaded.status !== 200) {
        throw new Error(
          downloaded.status === 403
            ? 'OpenStreetMap refuse le fond de carte (403). Cette erreur ne concerne pas le GPS.'
            : `Tuile OpenStreetMap indisponible (${downloaded.status}).`,
        );
      }
      const contentType = Object.entries(downloaded.headers)
        .find(([name]) => name.toLowerCase() === 'content-type')?.[1];
      if (contentType?.split(';')[0].trim().toLowerCase() !== 'image/png') {
        throw new Error('La réponse OpenStreetMap ne contient pas une tuile PNG.');
      }
      return await storage.publish(downloaded.uri, key);
    } catch (error) {
      await storage.discard(downloaded.uri);
      throw error;
    }
  }

  return {
    load(url: string): Promise<string> {
      const key = tileKey(url);
      const existing = inFlight.get(key);
      if (existing) return existing;
      const operation = loadTile(url, key).finally(() => inFlight.delete(key));
      inFlight.set(key, operation);
      return operation;
    },
    async invalidate(url: string): Promise<void> {
      const cached = await storage.read(tileKey(url));
      if (cached) await storage.discard(cached.uri);
    },
  };
}