import { modules, type ModuleAvailability, type ModuleFeaturePack } from './store';

export type ServerModuleAccess = {
  id: string;
  name: string;
  description: string;
  features: string[];
  featurePacks: ModuleFeaturePack[];
  featureDependencies: Partial<Record<string, string[]>>;
  status: ModuleAvailability;
  featureIds: string[];
  configuration: Record<string, unknown>;
};

type ModuleBootstrap = {
  companyId: string;
  modules: ServerModuleAccess[];
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Les accès modules sont indisponibles.');
  }
  return body as T;
}

export async function loadCompanyModuleAccess(companyId: string, expectedModuleIds: string[] = []): Promise<ServerModuleAccess[]> {
  const query = new URLSearchParams({ companyId });
  const result = await request<ModuleBootstrap>(`/modules/bootstrap?${query.toString()}`);
  if (result.companyId !== companyId || !Array.isArray(result.modules)) {
    throw new Error('La réponse des accès modules ne correspond pas à cette entreprise.');
  }
  const knownModuleIds = new Set(modules.map(module => module.id));
  const missing = expectedModuleIds.filter((moduleId) => {
    if (!knownModuleIds.has(moduleId as (typeof modules)[number]['id'])) return false;
    const module = result.modules.find((item) => item.id === moduleId);
    return !module || module.status === 'INACTIF';
  });
  if (missing.length > 0) {
    throw new Error(`Les accès serveur sont incomplets pour : ${missing.join(', ')}.`);
  }
  return result.modules;
}

export async function setCompanyModuleAccess(companyId: string, moduleId: string, status: ModuleAvailability): Promise<ServerModuleAccess> {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/access?companyId=${encodeURIComponent(companyId)}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'La configuration du module est indisponible.');
  }
  return (body as { module: ServerModuleAccess }).module;
}

export async function synchronizeCompanyModuleAccess(companyId: string, moduleIds: string[]) {
  const synchronized = await Promise.all(moduleIds.map(moduleId => setCompanyModuleAccess(companyId, moduleId, 'ACTIF')));
  const missing = moduleIds.filter((moduleId) => {
    const module = synchronized.find((item) => item.id === moduleId);
    return !module || module.status === 'INACTIF';
  });
  if (missing.length > 0) {
    throw new Error(`Les accès serveur n’ont pas été confirmés pour : ${missing.join(', ')}.`);
  }
}