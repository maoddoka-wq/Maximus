export type ServerModuleAccess = {
  id: string;
  name: string;
  description: string;
  features: string[];
  status: 'ACTIF' | 'BETA' | 'INACTIF';
  featureIds: string[];
  configuration: Record<string, unknown>;
  featureCatalog: ServerModuleFeature[];
};

export type ServerModuleFeature = {
  id: string;
  key: string;
  label: string;
  description: string;
  actions: string[];
  dependencies: string[];
  status: 'ACTIF' | 'INACTIF';
};

export type ServerModuleCatalogModule = {
  id: string;
  name: string;
  description: string;
  features: string[];
  featureCatalog: ServerModuleFeature[];
};

type ModuleBootstrap = {
  companyId: string;
  modules: ServerModuleAccess[];
};

type ModuleCatalogResponse = {
  modules: ServerModuleCatalogModule[];
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
  return result.modules;
}

export async function loadModuleCatalog(): Promise<ServerModuleCatalogModule[]> {
  const result = await request<ModuleCatalogResponse>('/modules/catalog');
  return result.modules;
}

export async function createModuleFeature(moduleId: string, input: {
  key: string;
  label: string;
  description?: string;
  actions: string[];
  dependencies?: string[];
}): Promise<ServerModuleFeature> {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const validationError = body?.errors && typeof body.errors === 'object'
      ? Object.values(body.errors).flat().find(value => typeof value === 'string')
      : null;
    throw new Error(typeof validationError === 'string' ? validationError : typeof body.error === 'string' ? body.error : 'La fonctionnalité n’a pas pu être créée.');
  }
  return (body as { feature: ServerModuleFeature }).feature;
}

export async function setCompanyModuleAccess(companyId: string, moduleId: string, status: 'ACTIF' | 'INACTIF' | 'BETA'): Promise<ServerModuleAccess> {
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