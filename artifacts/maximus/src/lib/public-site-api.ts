import { requestJson } from './api-request';
import type { PublicShopBootstrap } from './ecommerce-api';

export type PublicSiteModule = {
  id: string;
  label: string;
  path: string;
};

export type PublicSiteDomain = {
  id: string;
  domain: string;
  status: string;
};

export type CompanyPublicSiteSettings = {
  authorized: boolean;
  enabled: boolean;
  moduleIds: string[];
  domains: PublicSiteDomain[];
  availableModules: PublicSiteModule[];
};

export type PublicSiteBootstrap =
  | { available: false }
  | {
      available: true;
      company: {
        name: string;
        logo?: string | null;
        currency?: PublicShopBootstrap['store']['currency'];
      };
      modules: PublicSiteModule[];
      domain?: string;
    };

export type PublicImmobilierBootstrap =
  | { available: false }
  | {
      available: true;
      company: { name: string };
      listings: PublicShopBootstrap['immobilierListings'];
    };

export const publicSiteApi = {
  company: () =>
    requestJson<CompanyPublicSiteSettings>('/company/public-site', undefined, {
      fallbackMessage: 'Les paramètres du site public sont indisponibles.',
    }),
  updateCompany: (input: { enabled: boolean; moduleIds: string[] }) =>
    requestJson<CompanyPublicSiteSettings>(
      '/company/public-site',
      { method: 'PATCH', body: JSON.stringify(input) },
      { fallbackMessage: 'Les paramètres du site public n’ont pas pu être enregistrés.' },
    ),
  authorization: (companyId: string) =>
    requestJson<{ authorized: boolean }>(
      `/companies/${encodeURIComponent(companyId)}/public-site-access`,
      undefined,
      { fallbackMessage: 'L’autorisation du site public est indisponible.' },
    ),
  setAuthorization: (companyId: string, authorized: boolean) =>
    requestJson<{ authorized: boolean }>(
      `/companies/${encodeURIComponent(companyId)}/public-site-access`,
      { method: 'PUT', body: JSON.stringify({ authorized }) },
      { fallbackMessage: 'L’autorisation du site public n’a pas pu être enregistrée.' },
    ),
  bootstrapDomain: () =>
    requestJson<PublicSiteBootstrap>('/public-site/bootstrap', undefined, {
      fallbackMessage: 'Le site public est indisponible.',
    }),
  bootstrapSlug: (slug: string) =>
    requestJson<PublicSiteBootstrap>(`/public-site/bootstrap/${encodeURIComponent(slug)}`, undefined, {
      fallbackMessage: 'Le site public est indisponible.',
    }),
  immobilierBootstrapDomain: () =>
    requestJson<PublicImmobilierBootstrap>('/shop-domain/immobilier/bootstrap', undefined, {
      fallbackMessage: 'La vitrine immobilière est indisponible.',
    }),
  immobilierBootstrapSlug: (slug: string) =>
    requestJson<PublicImmobilierBootstrap>(
      `/shop/${encodeURIComponent(slug)}/immobilier/bootstrap`,
      undefined,
      { fallbackMessage: 'La vitrine immobilière est indisponible.' },
    ),
};