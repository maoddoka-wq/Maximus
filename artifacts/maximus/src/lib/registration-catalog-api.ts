import { requestJson } from './api-request';
import type { StoreData } from './store';

type RegistrationCatalog = Pick<
  StoreData,
  'sectorPresets' | 'moduleOverrides' | 'moduleStatuses' | 'customModules' | 'removedModules' | 'catalogVersion'
>;

type RegistrationCatalogResponse = {
  version: number;
  catalog: Partial<RegistrationCatalog> & {
    sectorPresets: RegistrationCatalog['sectorPresets'] | null;
  };
};

export const registrationCatalogApi = {
  bootstrap: async (): Promise<RegistrationCatalogResponse> => {
    const body = await requestJson<Partial<RegistrationCatalogResponse>>('/registration-catalog', undefined, {
      fallbackMessage: 'Le catalogue d’inscription est indisponible.',
    });
    return {
      version: typeof body.version === 'number' ? body.version : 0,
      catalog: body.catalog ?? {},
    } as RegistrationCatalogResponse;
  },
};