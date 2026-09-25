export const commerceTabGroups = [
  { id: 'pilotage', label: 'Pilotage' },
  { id: 'ventes', label: 'Ventes' },
  { id: 'referentiels', label: 'Référentiels' },
  { id: 'approvisionnement', label: 'Approvisionnement' },
  { id: 'tresorerie', label: 'Trésorerie' },
  { id: 'administration', label: 'Administration' },
] as const;

export type CommerceTabGroupId = (typeof commerceTabGroups)[number]['id'];

export const commerceTabDefinitions = [
  { id: 'dashboard', label: 'Tableau de bord', groupId: 'pilotage' },
  { id: 'sales', label: 'Ventes', groupId: 'ventes' },
  { id: 'products', label: 'Catalogue produits', groupId: 'referentiels' },
  { id: 'clients', label: 'Clients', groupId: 'referentiels' },
  { id: 'suppliers', label: 'Fournisseurs', groupId: 'referentiels' },
  { id: 'purchases', label: 'Commandes fournisseurs', groupId: 'approvisionnement' },
  { id: 'expenses', label: 'Dépenses', groupId: 'tresorerie' },
  { id: 'cash', label: 'Comptes de caisse', groupId: 'tresorerie' },
  { id: 'credit', label: 'Créances clients', groupId: 'ventes' },
  { id: 'invoices', label: 'Factures & reçus', groupId: 'ventes' },
  { id: 'returns', label: 'Retours & avoirs', groupId: 'ventes' },
  { id: 'reports', label: 'Rapports', groupId: 'pilotage' },
  { id: 'activity', label: 'Journal d’activité', groupId: 'pilotage' },
  { id: 'team', label: 'Équipe & droits', groupId: 'administration' },
  { id: 'settings', label: 'Paramètres', groupId: 'administration' },
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