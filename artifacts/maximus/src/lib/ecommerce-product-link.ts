export function buildPublicProductUrl(origin: string, storeSlug: string, productSlug: string): string {
  const path = `/shop/${encodeURIComponent(storeSlug)}/produit/${encodeURIComponent(productSlug)}`;
  return new URL(path, origin).toString();
}