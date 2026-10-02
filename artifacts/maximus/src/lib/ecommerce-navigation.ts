export function isEcommerceTabVisible(
  tabId: string,
  allowedFeatureIds?: string[],
): boolean {
  if (tabId === 'rapport-ventes' || !allowedFeatureIds) return true;
  if (tabId === 'dashboard' || tabId === 'accueil') return true;
  if (allowedFeatureIds.includes(tabId)) return true;

  return tabId === 'categories' && allowedFeatureIds.includes('catalogue');
}