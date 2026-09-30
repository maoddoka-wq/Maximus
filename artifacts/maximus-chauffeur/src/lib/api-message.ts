const HTTP_ERROR_PREFIX = /^HTTP\s+(\d{3})\s+[^:]*:\s*/i;
const HTML_RESPONSE_MARKUP = /<(?:!doctype\s+html\b|html\b|head\b|body\b|title\b)/i;

export function formatApiMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const prefix = HTTP_ERROR_PREFIX.exec(error.message);
  const status = prefix ? Number(prefix[1]) : null;
  const message = error.message.replace(HTTP_ERROR_PREFIX, '').trim();

  if (HTML_RESPONSE_MARKUP.test(message)) {
    if (status === 502 || status === 503 || status === 504) {
      return 'Le service de transport est temporairement indisponible. Réessayez dans quelques instants.';
    }

    return 'Le serveur a renvoyé une réponse inattendue. Réessayez ou contactez votre responsable.';
  }

  return message || fallback;
}