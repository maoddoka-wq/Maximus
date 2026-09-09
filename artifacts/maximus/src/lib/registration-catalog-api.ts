import type { StoreData } from './store';

type RegistrationCatalog = Pick<
  StoreData,
  'sectorPresets' | 'moduleOverrides' | 'moduleStatuses' | 'removedModules' | 'catalogVersion'
>;

type RegistrationCatalogResponse = {
  version: number;
  catalog: Partial<RegistrationCatalog> & {
    sectorPresets: RegistrationCatalog['sectorPresets'] | null;
  };
};

export const registrationCatalogApi = {
  bootstrap: async (): Promise<RegistrationCatalogResponse> => {
    const response = await fetch('/api/registration-catalog', {
      credentials: 'include',
    });
    const body = (await response.json().catch(() => ({}))) as Partial<RegistrationCatalogResponse>;
    if (!response.ok) {
      throw new Error('Le catalogue d’inscription est indisponible.');
    }
    return {
      version: typeof body.version === 'number' ? body.version : 0,
      catalog: body.catalog ?? {},
    } as RegistrationCatalogResponse;
  },
};