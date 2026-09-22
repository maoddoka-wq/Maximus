export type TransportTabId = 'overview' | 'trips' | 'drivers' | 'vehicles' | 'historique' | 'parametres';

/**
 * Les URLs et les permissions Transport utilisent les identifiants anglais
 * canoniques. Les libellés internes historiques restent acceptés en lecture
 * pour ne pas casser les favoris et les anciennes sessions.
 */
export const transportTabByFeatureId: Record<string, TransportTabId> = {
  overview: 'overview',
  trips: 'trips',
  courses: 'trips',
  drivers: 'drivers',
  chauffeurs: 'drivers',
  vehicles: 'vehicles',
  vehicules: 'vehicles',
  historique: 'historique',
  history: 'historique',
  parametres: 'parametres',
  settings: 'parametres',
};

export function resolveTransportTab(value: string | null | undefined): TransportTabId | undefined {
  return value ? transportTabByFeatureId[value] : undefined;
}