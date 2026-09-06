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

export type ModuleId = (typeof moduleIds)[number];