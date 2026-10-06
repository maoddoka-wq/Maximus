export function buildPublicImmobilierUrl(origin: string, storeSlug: string, propertySlug: string): string {
  const path = `/shop/${encodeURIComponent(storeSlug)}/immobilier/${encodeURIComponent(propertySlug)}`;
  return new URL(path, origin).toString();
}
