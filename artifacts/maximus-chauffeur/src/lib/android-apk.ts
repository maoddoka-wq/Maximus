const APK_MIME_TYPE = 'application/vnd.android.package-archive';

export interface ApkDownloadCheck {
  status: number;
  mimeType?: string | null;
  headers?: Record<string, string>;
  fileExists: boolean;
  fileSize: number;
  expectedSize?: number;
}

function responseHeader(
  headers: Record<string, string> | undefined,
  name: string,
): string | undefined {
  const entry = Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry?.[1];
}

export function getApkDownloadError(download: ApkDownloadCheck): string | null {
  if (download.status !== 200) {
    return `Le serveur a refusé le téléchargement (HTTP ${download.status}).`;
  }

  if (!download.fileExists || !Number.isFinite(download.fileSize) || download.fileSize < 1) {
    return 'Le fichier APK téléchargé est vide ou incomplet.';
  }

  const mimeType = (download.mimeType ?? responseHeader(download.headers, 'content-type') ?? '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (mimeType !== APK_MIME_TYPE) {
    return 'Le serveur n’a pas fourni un fichier APK valide. Vérifiez votre connexion et réessayez.';
  }

  const contentLength = Number(responseHeader(download.headers, 'content-length'));
  const expectedSize =
    download.expectedSize && download.expectedSize > 0
      ? download.expectedSize
      : Number.isFinite(contentLength) && contentLength > 0
        ? contentLength
        : null;

  if (expectedSize !== null && download.fileSize !== expectedSize) {
    return `Le téléchargement est incomplet (${download.fileSize} octets reçus sur ${expectedSize}).`;
  }

  return null;
}