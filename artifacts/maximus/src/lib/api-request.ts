type RequestErrorKind = 'http' | 'network' | 'timeout';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly kind: RequestErrorKind,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type RequestOptions = {
  fallbackMessage?: string;
  timeoutMs?: number;
  dedupe?: boolean;
};

const inflightGets = new Map<string, Promise<unknown>>();

function errorMessage(payload: unknown, fallbackMessage: string) {
  if (!payload || typeof payload !== 'object') return fallbackMessage;
  const body = payload as Record<string, unknown>;
  if (typeof body.error === 'string') return body.error;
  if (typeof body.message === 'string') return body.message;
  if (body.errors && typeof body.errors === 'object') {
    const messages = Object.values(body.errors)
      .flat()
      .filter((value): value is string => typeof value === 'string');
    if (messages.length > 0) return messages.join(' ');
  }
  return fallbackMessage;
}

async function executeRequest<T>(path: string, init: RequestInit, options: RequestOptions): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? (method === 'GET' ? 15_000 : 30_000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const formData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const headers = new Headers(init.headers);
  if (!formData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(`/api${path}`, {
      ...init,
      cache: 'no-store',
      credentials: 'include',
      headers,
      signal: controller.signal,
    });
    const body = response.status === 204 ? undefined : await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiRequestError(
        errorMessage(body, options.fallbackMessage ?? 'Une erreur est survenue.'),
        response.status,
        'http',
      );
    }
    return body as T;
  } catch (cause) {
    if (cause instanceof ApiRequestError) throw cause;
    if (controller.signal.aborted) {
      throw new ApiRequestError(
        'La requête prend trop de temps. Vérifiez votre connexion puis réessayez.',
        0,
        'timeout',
      );
    }
    throw new ApiRequestError(
      'La connexion réseau est indisponible. Vérifiez votre connexion puis réessayez.',
      0,
      'network',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function requestJson<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const shouldDedupe = method === 'GET' && options.dedupe !== false;
  if (!shouldDedupe) return executeRequest<T>(path, init, options);

  const existing = inflightGets.get(path);
  if (existing) return existing as Promise<T>;

  const request = executeRequest<T>(path, init, options);
  inflightGets.set(path, request);
  void request.then(
    () => {
      if (inflightGets.get(path) === request) inflightGets.delete(path);
    },
    () => {
      if (inflightGets.get(path) === request) inflightGets.delete(path);
    },
  );
  return request;
}