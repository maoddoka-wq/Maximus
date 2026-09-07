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

export type EcommerceDomainStatus = 'PENDING' | 'ACTIVE';

export interface EcommerceDomain {
  id: string;
  companyId: string;
  domain: string;
  targetHost: string;
  verificationName: string;
  verificationValue: string;
  status: EcommerceDomainStatus;
  lastError: string;
  verifiedAt: string | null;
}

export interface EcommerceProduct {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  category: string;
  categoryId: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  imageUrl: string;
  featured: boolean;
  status: EcommerceProductStatus;
}

export interface EcommerceCategory {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
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
  domains: EcommerceDomain[];
  categories: EcommerceCategory[];
  products: EcommerceProduct[];
  orders: EcommerceOrder[];
}

export interface PublicShopBootstrap {
  store: Omit<EcommerceStore, 'id' | 'companyId'>;
  products: Array<Omit<EcommerceProduct, 'id' | 'companyId' | 'sku' | 'status'>>;
}

export type PublicDomainBootstrap = PublicShopBootstrap | { available: false };

export interface EcommerceCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface EcommerceCustomerAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface EcommerceCustomerCartLine {
  productId: string;
  productSlug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  imageUrl: string;
  quantity: number;
}

export interface EcommerceCustomerOrder {
  id: string;
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

export interface EcommerceCustomerBootstrap {
  customer: EcommerceCustomer;
  addresses: EcommerceCustomerAddress[];
  favoriteProductSlugs: string[];
  cart: EcommerceCustomerCartLine[];
  orders: EcommerceCustomerOrder[];
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
    createCategory: (body: { name: string; slug?: string; description?: string; isActive?: boolean; sortOrder?: number }) => request<EcommerceCategory>(withCompany('/ecommerce/categories'), json(body)),
    updateCategory: (id: string, body: Partial<Omit<EcommerceCategory, 'id' | 'companyId'>>) => request<EcommerceCategory>(withCompany(`/ecommerce/categories/${encodeURIComponent(id)}`), { method: 'PATCH', body: JSON.stringify(body) }),
    deleteCategory: (id: string) => request<{ ok: true }>(withCompany(`/ecommerce/categories/${encodeURIComponent(id)}`), { method: 'DELETE' }),
    createDomain: (domain: string) => request<EcommerceDomain>(withCompany('/ecommerce/domains'), { method: 'POST', body: JSON.stringify({ domain }) }),
    verifyDomain: (id: string) => request<EcommerceDomain>(withCompany(`/ecommerce/domains/${encodeURIComponent(id)}/verify`), { method: 'POST' }),
    deleteDomain: (id: string) => request<{ ok: true }>(withCompany(`/ecommerce/domains/${encodeURIComponent(id)}`), { method: 'DELETE' }),
    createProduct: (body: Omit<EcommerceProduct, 'id' | 'companyId' | 'slug'> & { slug?: string }) => request<EcommerceProduct>(withCompany('/ecommerce/products'), json(body)),
    updateProduct: (id: string, body: Partial<Omit<EcommerceProduct, 'id' | 'companyId'>>) => request<EcommerceProduct>(withCompany(`/ecommerce/products/${id}`), { method: 'PATCH', body: JSON.stringify(body) }),
    uploadProductImage: async (id: string, file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`/api${withCompany(`/ecommerce/products/${encodeURIComponent(id)}/image`)}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'La photo n’a pas pu être envoyée.');
      return body as EcommerceProduct;
    },
    archiveProduct: (id: string) => request<EcommerceProduct>(withCompany(`/ecommerce/products/${id}`), { method: 'DELETE' }),
    updateOrderStatus: (id: string, status: EcommerceOrderStatus) => request<EcommerceOrder>(withCompany(`/ecommerce/orders/${id}/status`), { method: 'PATCH', body: JSON.stringify({ status }) }),
  };
};

export const publicEcommerceApi = {
  bootstrap: (slug: string) => request<PublicShopBootstrap>(`/shop/${encodeURIComponent(slug)}`),
  bootstrapDomain: () => request<PublicDomainBootstrap>('/shop-domain'),
  createOrder: (slug: string, body: { customerName: string; customerEmail: string; customerPhone?: string; paymentMethod: 'WAVE' | 'ORANGE_MONEY'; shippingAddress: string; note?: string; idempotencyKey?: string; items: { productSlug: string; quantity: number }[] }) => request<PublicOrderResult>(`/shop/${encodeURIComponent(slug)}/orders`, { method: 'POST', body: JSON.stringify(body) }),
  createDomainOrder: (body: { customerName: string; customerEmail: string; customerPhone?: string; paymentMethod: 'WAVE' | 'ORANGE_MONEY'; shippingAddress: string; note?: string; idempotencyKey?: string; items: { productSlug: string; quantity: number }[] }) => request<PublicOrderResult>('/shop-domain/orders', { method: 'POST', body: JSON.stringify(body) }),
};

export interface PublicOrderResult {
  reference: string;
  total: number;
  payment: {
    id: string;
    publicReference: string;
    status: string;
    amount: number;
    currency: string;
    checkoutUrl: string | null;
    providerMessage: string | null;
  } | null;
}

export const createCustomerApi = (slug?: string) => {
  const prefix = slug ? `/shop/${encodeURIComponent(slug)}/customer` : '/shop-domain/customer';
  const endpoint = (path: string) => `${prefix}${path}`;

  return {
    session: () => request<{ customer: EcommerceCustomer | null }>(endpoint('/session')),
    register: (body: { name: string; email: string; phone?: string; password: string }) =>
      request<{ customer: EcommerceCustomer }>(endpoint('/register'), { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ customer: EcommerceCustomer }>(endpoint('/login'), { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request<void>(endpoint('/logout'), { method: 'POST' }),
    bootstrap: () => request<EcommerceCustomerBootstrap>(endpoint('/bootstrap')),
    updateProfile: (body: { name: string; phone?: string }) =>
      request<EcommerceCustomer>(endpoint('/profile'), { method: 'PATCH', body: JSON.stringify(body) }),
    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      request<{ ok: true }>(endpoint('/password'), { method: 'PATCH', body: JSON.stringify(body) }),
    createAddress: (body: Omit<EcommerceCustomerAddress, 'id'>) =>
      request<EcommerceCustomerAddress>(endpoint('/addresses'), { method: 'POST', body: JSON.stringify(body) }),
    updateAddress: (id: string, body: Partial<Omit<EcommerceCustomerAddress, 'id'>>) =>
      request<EcommerceCustomerAddress>(endpoint(`/addresses/${encodeURIComponent(id)}`), { method: 'PATCH', body: JSON.stringify(body) }),
    deleteAddress: (id: string) =>
      request<{ ok: true }>(endpoint(`/addresses/${encodeURIComponent(id)}`), { method: 'DELETE' }),
    toggleFavorite: (productSlug: string) =>
      request<{ favoriteProductSlugs: string[] }>(endpoint(`/favorites/${encodeURIComponent(productSlug)}`), { method: 'POST' }),
    putCartItem: (productSlug: string, quantity: number) =>
      request<{ cart: EcommerceCustomerCartLine[] }>(endpoint('/cart'), { method: 'PUT', body: JSON.stringify({ productSlug, quantity }) }),
    clearCart: () => request<{ cart: EcommerceCustomerCartLine[] }>(endpoint('/cart'), { method: 'DELETE' }),
    orders: () => request<{ orders: EcommerceCustomerOrder[] }>(endpoint('/orders')),
    order: (id: string) => request<EcommerceCustomerOrder>(endpoint(`/orders/${encodeURIComponent(id)}`)),
  };
};