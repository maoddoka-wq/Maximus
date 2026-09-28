export const DRIVER_ANDROID_RELEASE_API_URL =
  'https://api.github.com/repos/maoddoka-wq/Maximus/releases/tags/android-latest';

export const DRIVER_ANDROID_APK_ASSET = 'maximus-chauffeur.apk';

export type DriverAndroidRelease = {
  version: string;
  downloadUrl: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasSemanticVersion(value: string): boolean {
  return /\bv?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)\b/i.test(value);
}

function semanticVersionParts(value: string): number[] | null {
  const match = value.match(/\bv?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)\b/i);
  return match ? match.slice(1).map(Number) : null;
}

export function parseDriverAndroidRelease(value: unknown): DriverAndroidRelease | null {
  if (!isRecord(value) || !Array.isArray(value.assets)) return null;

  const asset = value.assets.find(
    (candidate) => isRecord(candidate) && candidate.name === DRIVER_ANDROID_APK_ASSET,
  );
  if (!isRecord(asset) || typeof asset.browser_download_url !== 'string') return null;

  let downloadUrl: URL;
  try {
    downloadUrl = new URL(asset.browser_download_url);
  } catch {
    return null;
  }
  if (downloadUrl.protocol !== 'https:' || downloadUrl.hostname !== 'github.com') {
    return null;
  }

  const version =
    typeof value.name === 'string' && value.name.trim()
      ? value.name.trim()
      : typeof value.tag_name === 'string'
        ? value.tag_name
        : '';
  if (!hasSemanticVersion(version)) return null;

  return { version, downloadUrl: downloadUrl.toString() };
}

export function isDriverAndroidUpdateAvailable(
  installedVersion: string,
  publishedVersion: string,
): boolean {
  const installed = semanticVersionParts(installedVersion);
  const published = semanticVersionParts(publishedVersion);
  if (!installed || !published) return false;

  for (let index = 0; index < installed.length; index += 1) {
    if (published[index] !== installed[index]) {
      return published[index] > installed[index];
    }
  }

  return false;
}