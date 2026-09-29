export const CAMERA_START_TIMEOUT_MS = 15_000;
export const CAMERA_START_TIMEOUT_ERROR = 'CAMERA_START_TIMEOUT';

export function withCameraStartupTimeout<T>(
  startup: Promise<T>,
  timeoutMs = CAMERA_START_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(CAMERA_START_TIMEOUT_ERROR)),
      timeoutMs,
    );
  });

  return Promise.race([startup, timeout]).finally(() => clearTimeout(timeoutId));
}

export function getCameraStartupErrorMessage(cause: unknown): string {
  const name = cause && typeof cause === 'object' && 'name' in cause
    ? String((cause as { name?: unknown }).name ?? '')
    : '';
  const message = cause instanceof Error ? cause.message : String(cause ?? '');

  if (message === CAMERA_START_TIMEOUT_ERROR) {
    return 'Le navigateur n’a pas démarré la caméra. Vérifiez l’autorisation de ce site, puis réessayez.';
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Accès caméra refusé. Autorisez la caméra pour ce site dans les réglages du navigateur, puis réessayez.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Aucune caméra n’a été détectée sur cet appareil.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return 'La caméra est peut-être utilisée par une autre application. Fermez-la puis réessayez.';
  }
  if (name === 'SecurityError') {
    return 'La caméra nécessite une connexion sécurisée en HTTPS.';
  }

  return 'Impossible de démarrer la caméra. Vérifiez son autorisation dans le navigateur, puis réessayez.';
}

export function stopCameraStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach(track => track.stop());
}