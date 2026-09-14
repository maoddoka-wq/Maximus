export const ecommerceFeatureDefinitions = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'catalogue', label: 'Catalogue' },
  { id: 'vente-physique', label: 'Vente de produits physiques' },
  { id: 'vente-numerique', label: 'Vente de produits numériques' },
  { id: 'categories', label: 'Catégories' },
  { id: 'commandes', label: 'Commandes' },
  { id: 'clients', label: 'Clients' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'location', label: 'Location' },
  { id: 'livraisons', label: 'Livraisons' },
  { id: 'finances', label: 'Finances & retraits' },
  { id: 'parametres', label: 'Paramètres' },
] as const;

export const ecommerceFeatureDependencies: Partial<Record<string, string[]>> = {
  commandes: ['catalogue'],
  categories: ['catalogue'],
  promotions: ['catalogue'],
  location: ['catalogue'],
  'vente-physique': ['catalogue'],
  'vente-numerique': ['catalogue'],
  livraisons: ['commandes'],
};

export const ecommerceFeaturePacks = [
  {
    id: 'ecommerce-catalogue',
    name: 'Catalogue en ligne',
    description: 'Publier une boutique et présenter vos produits.',
    featureIds: ['dashboard', 'catalogue', 'vente-physique', 'categories', 'finances', 'parametres'],
    featurePermissions: {
      dashboard: ['voir'],
      catalogue: ['voir', 'créer', 'modifier'],
      categories: ['voir', 'créer', 'modifier'],
      finances: ['voir', 'modifier'],
      parametres: ['voir', 'modifier'],
    },
  },
  {
    id: 'ecommerce-gestion',
    name: 'Gestion e-commerce',
    description: 'Piloter le catalogue, les commandes et les clients.',
    featureIds: ['dashboard', 'catalogue', 'vente-physique', 'categories', 'commandes', 'clients', 'finances', 'parametres'],
    featurePermissions: {
      dashboard: ['voir'],
      catalogue: ['voir', 'créer', 'modifier'],
      categories: ['voir', 'créer', 'modifier'],
      commandes: ['voir', 'modifier'],
      clients: ['voir'],
      finances: ['voir', 'modifier'],
      parametres: ['voir', 'modifier'],
    },
  },
  {
    id: 'ecommerce-vente-numerique',
    name: 'Vente de produits numériques',
    description: 'Publier des fichiers numériques et les délivrer après paiement.',
    featureIds: ['dashboard', 'catalogue', 'vente-numerique', 'categories', 'commandes', 'clients', 'finances', 'parametres'],
    featurePermissions: {
      dashboard: ['voir'],
      catalogue: ['voir', 'créer', 'modifier'],
      'vente-numerique': ['voir', 'créer', 'modifier'],
      categories: ['voir', 'créer', 'modifier'],
      commandes: ['voir', 'modifier'],
      clients: ['voir'],
      finances: ['voir', 'modifier'],
      parametres: ['voir', 'modifier'],
    },
  },
  {
    id: 'ecommerce-vente-complete',
    name: 'Ventes physiques et numériques',
    description: 'Vendre les deux types de produits dans la même boutique.',
    featureIds: ['dashboard', 'catalogue', 'vente-physique', 'vente-numerique', 'categories', 'commandes', 'clients', 'finances', 'parametres'],
    featurePermissions: {
      dashboard: ['voir'],
      catalogue: ['voir', 'créer', 'modifier'],
      'vente-physique': ['voir', 'créer', 'modifier'],
      'vente-numerique': ['voir', 'créer', 'modifier'],
      categories: ['voir', 'créer', 'modifier'],
      commandes: ['voir', 'modifier'],
      clients: ['voir'],
      finances: ['voir', 'modifier'],
      parametres: ['voir', 'modifier'],
    },
  },
  {
    id: 'ecommerce-location',
    name: 'Location & réservation',
    description: 'Présenter et gérer les offres de location de maisons, bâches, véhicules et équipements.',
    featureIds: ['dashboard', 'catalogue', 'vente-physique', 'categories', 'location', 'commandes', 'clients', 'parametres'],
    featurePermissions: {
      dashboard: ['voir'],
      catalogue: ['voir', 'créer', 'modifier'],
      'vente-physique': ['voir', 'créer', 'modifier'],
      categories: ['voir', 'créer', 'modifier'],
      location: ['voir', 'créer', 'modifier'],
      commandes: ['voir', 'modifier'],
      clients: ['voir'],
      parametres: ['voir', 'modifier'],
    },
  },
  {
    id: 'ecommerce-supervision',
    name: 'Supervision boutique',
    description: 'Superviser les ventes physiques et numériques, les promotions et les livraisons.',
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