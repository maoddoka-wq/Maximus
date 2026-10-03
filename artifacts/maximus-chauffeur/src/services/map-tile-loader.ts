import * as FileSystem from 'expo-file-system/legacy';
import { createMapTileCache } from '../lib/map-tile-cache';

// A new namespace avoids reusing rejection images stored by the old image loader.
const directory = FileSystem.cacheDirectory
  ? `${FileSystem.cacheDirectory}verified-osm-tiles/`
  : null;
let temporaryFileNumber = 0;

function cacheDirectory(): string {
  if (!directory) throw new Error('Le cache de carte natif est indisponible.');
  return directory;
}

const tileCache = createMapTileCache({
  async read(key) {
    const uri = `${cacheDirectory()}${key}.png`;
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory || info.size === 0) return null;
    return { uri, modifiedAt: info.modificationTime * 1_000 };
  },
  async download(url, headers) {
    const root = cacheDirectory();
    await FileSystem.makeDirectoryAsync(root, { intermediates: true });
    const uri = `${root}pending-${Date.now()}-${temporaryFileNumber++}.png`;
    try {
      const result = await FileSystem.downloadAsync(url, uri, { headers });
      return { uri: result.uri, status: result.status, headers: result.headers };
    } catch (error) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      throw error;
    }
  },
  async publish(temporaryUri, key) {
    const info = await FileSystem.getInfoAsync(temporaryUri);
    if (!info.exists || info.isDirectory || info.size === 0) {
      throw new Error('La tuile téléchargée est vide.');
    }
    const uri = `${cacheDirectory()}${key}.png`;
    await FileSystem.deleteAsync(uri, { idempotent: true });
    await FileSystem.moveAsync({ from: temporaryUri, to: uri });
    return uri;
  },
  async discard(uri) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  },
});

export const loadDriverMapTile = tileCache.load;
export const invalidateDriverMapTile = tileCache.invalidate;