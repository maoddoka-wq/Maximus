export const commerceTabDefinitions = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'sales', label: 'Ventes & caisse' },
  { id: 'products', label: 'Produits & stock' },
  { id: 'clients', label: 'Clients' },
  { id: 'suppliers', label: 'Fournisseurs' },
  { id: 'purchases', label: 'Achats' },
  { id: 'expenses', label: 'Dépenses' },
  { id: 'cash', label: 'Comptes de caisse' },
  { id: 'credit', label: 'Crédit clients' },
  { id: 'invoices', label: 'Factures & reçus' },
  { id: 'returns', label: 'Retours & avoirs' },
  { id: 'reports', label: 'Rapports' },
  { id: 'activity', label: 'Journal d’activité' },
  { id: 'team', label: 'Équipe & droits' },
  { id: 'settings', label: 'Paramètres' },
] as const;

export type CommerceTabId = (typeof commerceTabDefinitions)[number]['id'];

export const commerceTabDependencies: Partial<Record<CommerceTabId, CommerceTabId[]>> = {
  sales: ['clients', 'products'],
  purchases: ['suppliers', 'products'],
  returns: ['sales'],
  reports: ['sales'],
};

const commerceTabLegacyKeys: Partial<Record<CommerceTabId, string[]>> = {
  dashboard: ['commerce:menu:chiffre-d-affaires'],
  sales: [
    'commerce:menu:devis-et-commandes',
    'ventes:menu:devis',
    'ventes:menu:commandes',
  ],
  clients: ['commerce:menu:clients'],
  invoices: ['ventes:menu:facturation'],
};

export const commerceTabPermissionKey = (tabId: CommerceTabId) => `commerce:menu:${tabId}`;

export const commerceTabPermissionKeys = (tabId: CommerceTabId) => [
  commerceTabPermissionKey(tabId),
  ...(commerceTabLegacyKeys[tabId] ?? []),
];

export const commerceTabIdForLegacyFeature: Record<string, CommerceTabId> = {
  clients: 'clients',
  'devis-et-commandes': 'sales',
  'chiffre-d-affaires': 'dashboard',
  devis: 'sales',
  commandes: 'sales',
  facturation: 'invoices',
};

export const commerceTabIds = commerceTabDefinitions.map(tab => tab.id);

export function hasCommerceTabPermission(modulePermissions: Record<string, string[]>, tabId: CommerceTabId, permission = 'voir') {
  return commerceTabPermissionKeys(tabId).some(key => modulePermissions[key]?.includes(permission));
}

export function hasDetailedCommercePermissions(modulePermissions: Record<string, string[]>) {
  return commerceTabDefinitions.some(tab => commerceTabPermissionKeys(tab.id).some(key => key in modulePermissions));
}