import { requestJson } from './api-request';

export type ImmobilierListingStatus = 'DRAFT' | 'PUBLISHED' | 'RESERVED' | 'SOLD' | 'RENTED' | 'ARCHIVED';
export type ImmobilierLeadStatus = 'NEW' | 'CONTACTED' | 'CLOSED';
export type ImmobilierRequestType = 'CONTACT' | 'VISIT';

export interface ImmobilierListing {
  id: string;
  companyId: string;
  title: string;
  slug: string;
  propertyType: string;
  transactionType: 'SALE' | 'RENT';
  status: ImmobilierListingStatus;
  description: string;
  city: string;
  neighborhood: string;
  address: string;
  price: number;
  areaM2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnished: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImmobilierLead {
  id: string;
  listingId: string | null;
  listingTitle: string | null;
  requestType: ImmobilierRequestType;
  status: ImmobilierLeadStatus;
  name: string;
  email: string;
  phone: string;
  preferredDate: string | null;
  message: string;
  createdAt: string;
}

export type ImmobilierListingInput = Omit<Partial<ImmobilierListing>, 'id' | 'companyId' | 'slug' | 'createdAt' | 'updatedAt'> & {
  title: string;
  propertyType: string;
  transactionType: 'SALE' | 'RENT';
  status: ImmobilierListingStatus;
  city: string;
  price: number;
};

const request = <T>(path: string, options?: RequestInit) =>
  requestJson<T>(path, options, { fallbackMessage: 'Le module immobilier est indisponible.' });

export const createImmobilierApi = (companyId: string) => {
  const withCompany = (path: string) => `${path}?companyId=${encodeURIComponent(companyId)}`;
  return {
    bootstrap: () => request<{ listings: ImmobilierListing[]; leads: ImmobilierLead[] }>(withCompany('/immobilier/bootstrap')),
    createListing: (body: ImmobilierListingInput) => request<{ listing: ImmobilierListing }>(withCompany('/immobilier/listings'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    updateListing: (id: string, body: Partial<ImmobilierListingInput>) => request<{ listing: ImmobilierListing }>(withCompany(`/immobilier/listings/${encodeURIComponent(id)}`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    archiveListing: (id: string) => request<{ ok: true }>(withCompany(`/immobilier/listings/${encodeURIComponent(id)}`), { method: 'DELETE' }),
    updateLead: (id: string, status: ImmobilierLeadStatus) => request<{ ok: true }>(withCompany(`/immobilier/leads/${encodeURIComponent(id)}`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }),
  };
};

export const publicImmobilierApi = {
  createLead: (slug: string | undefined, domain: boolean, body: { listingId?: string; requestType: ImmobilierRequestType; name: string; email: string; phone?: string; preferredDate?: string; message?: string }) =>
    request<{ lead: { id: string; status: ImmobilierLeadStatus } }>(
      domain ? '/shop-domain/immobilier/leads' : `/shop/${encodeURIComponent(slug ?? '')}/immobilier/leads`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    ),
};