import { requestJson } from './api-request';

export type CompanyNavigationMode = 'menu' | 'horizontal';

export type CompanyNavigationSettings = {
  companyId: string;
  mode: CompanyNavigationMode;
  customAllowed: boolean;
};

export type CompanyNavigationPatch = {
  mode?: CompanyNavigationMode;
  customAllowed?: boolean;
};

export type CompanyNavigationSaveResult = CompanyNavigationSettings & { ok: true };

const base = (companyId: string) =>
  `/companies/${encodeURIComponent(companyId)}/navigation-settings`;

export function parseNavigationSettings(value: unknown, companyId: string): CompanyNavigationSettings {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    companyId: typeof raw.companyId === 'string' ? raw.companyId : companyId,
    mode: raw.mode === 'horizontal' ? 'horizontal' : 'menu',
    customAllowed: raw.customAllowed === true,
  };
}

export async function loadCompanyNavigationSettings(companyId: string): Promise<CompanyNavigationSettings> {
  const body = await requestJson<unknown>(base(companyId), undefined, {
    fallbackMessage: 'Les réglages de navigation sont indisponibles.',
    dedupe: false,
  });
  return parseNavigationSettings(body, companyId);
}

export async function saveCompanyNavigationSettings(
  companyId: string,
  patch: CompanyNavigationPatch,
): Promise<CompanyNavigationSaveResult> {
  const body = await requestJson<unknown>(
    base(companyId),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
    { fallbackMessage: 'Les réglages de navigation n’ont pas pu être enregistrés.' },
  );
  if (!body || typeof body !== 'object' || (body as Record<string, unknown>).ok !== true) {
    throw new Error('Le serveur n’a pas confirmé l’enregistrement des réglages de navigation.');
  }
  return { ...parseNavigationSettings(body, companyId), ok: true };
}
