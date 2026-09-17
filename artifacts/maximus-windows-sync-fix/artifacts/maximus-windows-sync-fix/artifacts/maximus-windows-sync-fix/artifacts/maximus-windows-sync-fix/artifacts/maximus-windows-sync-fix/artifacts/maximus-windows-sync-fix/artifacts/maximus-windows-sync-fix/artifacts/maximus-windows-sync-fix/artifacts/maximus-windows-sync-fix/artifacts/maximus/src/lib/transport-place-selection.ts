import type { PublicTransportPlace } from './transport-api';

export function isDestinationPlaceCommitted(query: string, place: PublicTransportPlace | null): boolean {
  return Boolean(place && query.trim() === place.label.trim());
}