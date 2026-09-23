import { requestJson } from './api-request';

export type ImmobilierListingStatus = 'DRAFT' | 'PUBLISHED' | 'RESERVED' | 'SOLD' | 'RENTED' | 'ARCHIVED';
export type ImmobilierPropertyStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RENTED' | 'ARCHIVED';
export type ImmobilierLeadStatus = 'NEW' | 'CONTACTED' | 'CLOSED';
export type ImmobilierRequestType = 'CONTACT' | 'VISIT';
export type ImmobilierMediaSlot = 'PROFILE' | 'GALLERY';

export interface ImmobilierMedia {
  id: string;
  url: string;
  mime: string;
  type: 'image' | 'video';
}

export interface ImmobilierProperty {
  id: string;
  companyId: string;
  reference: string;
  propertyType: string;
  transactionType: 'SALE' | 'RENT';
  status: ImmobilierPropertyStatus;
  city: string;
  neighborhood: string;
  address: string;
  price: number;
  areaM2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnished: boolean;
  internalNotes: string;
  profileMedia: ImmobilierMedia | null;
  gallery: ImmobilierMedia[];
  createdAt: string;
  updatedAt: string;
}

export type ImmobilierPropertyInput = Omit<Partial<ImmobilierProperty>, 'id' | 'companyId' | 'createdAt' | 'updatedAt'> & {
  propertyType: string;
  transactionType: 'SALE' | 'RENT';
  status: ImmobilierPropertyStatus;
  city: string;
  price: number;
};

export interface ImmobilierListing {
  id: string;
  companyId: string;
  propertyId: string;
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
  profileMedia: ImmobilierMedia | null;
  gallery: ImmobilierMedia[];
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
  propertyId: string;
  title: string;
  status: ImmobilierListingStatus;
  description?: string;
};

const request = <T>(path: string, options?: RequestInit) =>
  requestJson<T>(path, options, { fallbackMessage: 'Le module immobilier est indisponible.' });

export const createImmobilierApi = (companyId: string) => {
  const withCompany = (path: string) => `${path}?companyId=${encodeURIComponent(companyId)}`;
  return {
    bootstrap: () => request<{ properties: ImmobilierProperty[]; listings: ImmobilierListing[]; leads: ImmobilierLead[] }>(withCompany('/immobilier/bootstrap')),
    createProperty: (body: ImmobilierPropertyInput) => request<{ property: ImmobilierProperty }>(withCompany('/immobilier/properties'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    updateProperty: (id: string, body: Partial<ImmobilierPropertyInput>) => request<{ property: ImmobilierProperty }>(withCompany(`/immobilier/properties/${encodeURIComponent(id)}`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    uploadPropertyMedia: (id: string, files: File[], slot: ImmobilierMediaSlot = 'GALLERY') => {
      const body = new FormData();
      body.append('slot', slot);
      files.forEach(file => body.append('media[]', file));
      return request<{ property: ImmobilierProperty }>(withCompany(`/immobilier/properties/${encodeURIComponent(id)}/media`), { method: 'POST', body });
    },
    uploadPropertyProfileMedia: (id: string, file: File) => {
      const body = new FormData();
      body.append('slot', 'PROFILE');
      body.append('media[]', file);
      return request<{ property: ImmobilierProperty }>(withCompany(`/immobilier/properties/${encodeURIComponent(id)}/media`), { method: 'POST', body });
    },
    uploadPropertyGalleryMedia: (id: string, files: File[]) => {
      const body = new FormData();
      body.append('slot', 'GALLERY');
      files.forEach(file => body.append('media[]', file));
      return request<{ property: ImmobilierProperty }>(withCompany(`/immobilier/properties/${encodeURIComponent(id)}/media`), { method: 'POST', body });
    },
    archiveProperty: (id: string) => request<{ ok: true }>(withCompany(`/immobilier/properties/${encodeURIComponent(id)}`), { method: 'DELETE' }),
    createListing: (body: ImmobilierListingInput) => request<{ listing: ImmobilierListing }>(withCompany('/immobilier/listings'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    updateListing: (id: string, body: Partial<ImmobilierListingInput>) => request<{ listing: ImmobilierListing }>(withCompany(`/immobilier/listings/${encodeURIComponent(id)}`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    uploadListingMedia: (id: string, files: File[], slot: ImmobilierMediaSlot = 'GALLERY') => {
      const body = new FormData();
      body.append('slot', slot);
      files.forEach(file => body.append('media[]', file));
      return request<{ listing: ImmobilierListing }>(withCompany(`/immobilier/listings/${encodeURIComponent(id)}/media`), { method: 'POST', body });
    },
    uploadListingProfileMedia: (id: string, file: File) => {
      const body = new FormData();
      body.append('slot', 'PROFILE');
      body.append('media[]', file);
      return request<{ listing: ImmobilierListing }>(withCompany(`/immobilier/listings/${encodeURIComponent(id)}/media`), { method: 'POST', body });
    },
    uploadListingGalleryMedia: (id: string, files: File[]) => {
      const body = new FormData();
      body.append('slot', 'GALLERY');
      files.forEach(file => body.append('media[]', file));
      return request<{ listing: ImmobilierListing }>(withCompany(`/immobilier/listings/${encodeURIComponent(id)}/media`), { method: 'POST', body });
    },
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