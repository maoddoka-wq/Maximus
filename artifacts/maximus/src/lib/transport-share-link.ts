export type PublicTransportShareLocation = {
  tripId: string;
  shareToken: string;
};

const shareTokenPattern = /^[a-f0-9]{64}$/;

export function buildPublicTransportShareUrl(currentUrl: string, tripId: string, shareToken: string): string {
  if (!tripId.trim() || tripId.length > 180 || !shareTokenPattern.test(shareToken)) {
    throw new Error('Les informations du lien de suivi sont invalides.');
  }

  const url = new URL(currentUrl);
  url.searchParams.set('taxiTripId', tripId);
  url.hash = new URLSearchParams({ taxiShare: shareToken }).toString();
  return url.toString();
}

export function parsePublicTransportShareUrl(currentUrl: string): PublicTransportShareLocation | null {
  try {
    const url = new URL(currentUrl);
    const tripId = url.searchParams.get('taxiTripId')?.trim() ?? '';
    const shareToken = new URLSearchParams(url.hash.slice(1)).get('taxiShare') ?? '';

    if (!tripId || tripId.length > 180 || !shareTokenPattern.test(shareToken)) return null;
    return { tripId, shareToken };
  } catch {
    return null;
  }
}