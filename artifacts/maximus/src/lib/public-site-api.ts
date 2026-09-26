import { requestJson } from './api-request';
import type { PublicShopBootstrap } from './ecommerce-api';

export type PublicSiteModule = {
  id: string;
  label: string;
  path: string;
};

export type PublicSiteFeature = {
  id: string;
  label: string;
  path: string;
};

export type PublicSiteDomain = {
  id: string;
  domain: string;
  targetHost: string;
  verificationName: string;
  verificationValue: string;
  status: string;
  lastError: string;
  verifiedAt: string | null;
};

export type CompanyPublicSiteBrand = {
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  heroImages: string[];
};

export type CompanyPublicSiteSettings = {
  authorized: boolean;
  enabled: boolean;
  moduleIds: string[];
  brand: CompanyPublicSiteBrand;
  domains: PublicSiteDomain[];
  availableModules: PublicSiteModule[];
};

export type PublicSiteBrand = {
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  heroImages: string[];
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
      brand: PublicSiteBrand;
      modules: PublicSiteModule[];
      features: PublicSiteFeature[];
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
  updateCompany: (input: {
    enabled: boolean;
    moduleIds: string[];
    brand: Pick<CompanyPublicSiteBrand, 'name' | 'slug' | 'description' | 'primaryColor' | 'accentColor'>;
  }) =>
    requestJson<CompanyPublicSiteSettings>(
      '/company/public-site',
      { method: 'PATCH', body: JSON.stringify(input) },
      { fallbackMessage: 'Les paramètres du site public n’ont pas pu être enregistrés.' },
    ),
  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return requestJson<CompanyPublicSiteSettings>('/company/public-site/logo', {
      method: 'POST',
      body: formData,
    }, { fallbackMessage: 'Le logo du site public n’a pas pu être envoyé.', timeoutMs: 90_000 });
  },
  uploadHeroImages: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images[]', file));
    return requestJson<CompanyPublicSiteSettings>('/company/public-site/hero-images', {
      method: 'POST',
      body: formData,
    }, { fallbackMessage: 'Les images d’accueil n’ont pas pu être envoyées.', timeoutMs: 120_000 });
  },
  deleteHeroImage: (imageId: string) =>
    requestJson<CompanyPublicSiteSettings>(
      `/company/public-site/hero-images/${encodeURIComponent(imageId)}`,
      { method: 'DELETE' },
      { fallbackMessage: 'L’image d’accueil n’a pas pu être supprimée.' },
    ),
  createDomain: (domain: string) =>
    requestJson<PublicSiteDomain>(
      '/company/public-site/domains',
      { method: 'POST', body: JSON.stringify({ domain }) },
      { fallbackMessage: 'Le domaine n’a pas pu être ajouté.' },
    ),
  verifyDomain: (id: string) =>
    requestJson<PublicSiteDomain>(
      `/company/public-site/domains/${encodeURIComponent(id)}/verify`,
      { method: 'POST' },
      { fallbackMessage: 'La vérification du domaine a échoué.' },
    ),
  deleteDomain: (id: string) =>
    requestJson<{ ok: true }>(
      `/company/public-site/domains/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      { fallbackMessage: 'Le domaine n’a pas pu être retiré.' },
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