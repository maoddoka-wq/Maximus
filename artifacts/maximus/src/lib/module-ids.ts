export const moduleIds = [
  'commerce',
  'ecommerce',
  'ventes',
  'achats',
  'stocks',
  'finance',
  'comptabilite',
  'rh',
  'presences',
  'paie',
  'crm',
  'fournisseurs',
  'logistique',
  'documents',
  'rapports',
] as const;

// Built-in ids remain listed above for menus and routing. Catalog-created
// modules use the same string contract after server validation.
export type ModuleId = string;