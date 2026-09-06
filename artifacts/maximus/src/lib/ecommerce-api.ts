export type EcommerceStoreStatus = 'DRAFT' | 'PUBLISHED' | 'SUSPENDED';
export type EcommerceProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type EcommerceOrderStatus = 'NOUVELLE' | 'CONFIRMÉE' | 'EN PRÉPARATION' | 'EXPÉDIÉE' | 'LIVRÉE' | 'ANNULÉE';

export interface EcommerceStore {
  id: string;
  companyId: string;
  slug: string;
  name: string;
  description: string;
  status: EcommerceStoreStatus;
  currency: 'XOF' | 'EUR' | 'USD';
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
}

export interface EcommerceProduct {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  imageUrl: string;
  featured: boolean;
  status: EcommerceProductStatus;
}

export interface EcommerceOrderItem {
  id: string;
  productId: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface EcommerceOrder {
  id: string;
  companyId: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  note: string;
  total: number;
  status: EcommerceOrderStatus;
  paymentStatus: string;
  createdAt: string;
  items: EcommerceOrderItem[];
}

export interface EcommerceBootstrap {
  store: EcommerceStore;
  products: EcommerceProduct[];
  orders: EcommerceOrder[];
}

export interface PublicShopBootstrap {
  store: EcommerceStore;
  products: EcommerceProduct[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Une erreur est survenue.');
  return body as T;
}

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const createEcommerceApi = (companyId: string) => {
  const withCompany = (path: string) => `${path}${path.includes('?') ? '&' : '?'}companyId=${encodeURIComponent(companyId)}`;

  return {
    bootstrap: () => request<EcommerceBootstrap>(withCompany('/ecommerce/bootstrap')),
    updateStore: (body: Partial<Omit<EcommerceStore, 'id' | 'companyId'>>) => request<EcommerceStore>(withCompany('/ecommerce/store'), { method: 'PATCH', body: JSON.stringify(body) }),
    createProduct: (body: Omit<EcommerceProduct, 'id' | 'companyId'>) => request<EcommerceProduct>(withCompany('/ecommerce/products'), json(body)),
    updateProduct: (id: string, body: Partial<Omit<EcommerceProduct, 'id' | 'companyId'>>) => request<EcommerceProduct>(withCompany(`/ecommerce/products/${id}`), { method: 'PATCH', body: JSON.stringify(body) }),
    archiveProduct: (id: string) => request<EcommerceProduct>(withCompany(`/ecommerce/products/${id}`), { method: 'DELETE' }),
    updateOrderStatus: (id: string, status: EcommerceOrderStatus) => request<EcommerceOrder>(withCompany(`/ecommerce/orders/${id}/status`), { method: 'PATCH', body: JSON.stringify({ status }) }),
  };
};

export const publicEcommerceApi = {
  bootstrap: (slug: string) => request<PublicShopBootstrap>(`/shop/${encodeURIComponent(slug)}`),
  createOrder: (slug: string, body: { customerName: string; customerEmail: string; customerPhone?: string; shippingAddress: string; note?: string; items: { productId: string; quantity: number }[] }) => request<{ id: string; reference: string; total: number }>(`/shop/${encodeURIComponent(slug)}/orders`, { method: 'POST', body: JSON.stringify(body) }),
};