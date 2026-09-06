import type { ModuleAvailability } from './store';

export type ServerModuleAccess = {
  id: string;
  name: string;
  description: string;
  features: string[];
  status: ModuleAvailability;
  featureIds: string[];
  configuration: Record<string, unknown>;
};

type ModuleBootstrap = {
  companyId: string;
  modules: ServerModuleAccess[];
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Les accès modules sont indisponibles.');
  }
  return body as T;
}

export async function loadCompanyModuleAccess(companyId: string): Promise<ServerModuleAccess[]> {
  const query = new URLSearchParams({ companyId });
  const result = await request<ModuleBootstrap>(`/modules/bootstrap?${query.toString()}`);
  if (result.companyId !== companyId || !Array.isArray(result.modules)) {
    throw new Error('La réponse des accès modules ne correspond pas à cette entreprise.');
  }
  return result.modules;
}

export async function setCompanyModuleAccess(companyId: string, moduleId: string, status: ModuleAvailability): Promise<ServerModuleAccess> {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/access?companyId=${encodeURIComponent(companyId)}`, {
    method: 'PATCH',
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