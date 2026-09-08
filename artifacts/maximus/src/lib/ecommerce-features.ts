export const ecommerceFeatureDefinitions = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'catalogue', label: 'Catalogue' },
  { id: 'commandes', label: 'Commandes' },
  { id: 'clients', label: 'Clients' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'livraisons', label: 'Livraisons' },
  { id: 'finances', label: 'Finances & retraits' },
  { id: 'parametres', label: 'Paramètres' },
] as const;

export const ecommerceFeatureDependencies: Partial<Record<string, string[]>> = {
  commandes: ['catalogue'],
  promotions: ['catalogue'],
  livraisons: ['commandes'],
};

export const ecommerceFeaturePacks = [
  {
    id: 'ecommerce-catalogue',
    name: 'Catalogue en ligne',
    description: 'Publier une boutique et présenter vos produits.',
    featureIds: ['dashboard', 'catalogue', 'finances', 'parametres'],
    featurePermissions: {
      dashboard: ['voir'],
      catalogue: ['voir', 'créer', 'modifier'],
      finances: ['voir', 'modifier'],
      parametres: ['voir', 'modifier'],
    },
  },
  {
    id: 'ecommerce-gestion',
    name: 'Gestion e-commerce',
    description: 'Piloter le catalogue, les commandes et les clients.',
    featureIds: ['dashboard', 'catalogue', 'commandes', 'clients', 'finances', 'parametres'],
    featurePermissions: {
      dashboard: ['voir'],
      catalogue: ['voir', 'créer', 'modifier'],
      commandes: ['voir', 'modifier'],
      clients: ['voir'],
      finances: ['voir', 'modifier'],
      parametres: ['voir', 'modifier'],
    },
  },
  {
    id: 'ecommerce-supervision',
    name: 'Supervision boutique',
    description: 'Superviser la boutique, les promotions et les livraisons.',
    featureIds: ecommerceFeatureDefinitions.map(feature => feature.id),
    featurePermissions: Object.fromEntries(
      ecommerceFeatureDefinitions.map(feature => [
        feature.id,
        feature.id === 'dashboard' || feature.id === 'clients'
          ? ['voir']
          : ['voir', 'créer', 'modifier'],
      ]),
    ),
  },
] as const;