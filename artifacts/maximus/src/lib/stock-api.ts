export type StockMovementType = 'ENTRÉE' | 'SORTIE' | 'VENTE' | 'ACHAT' | 'TRANSFERT' | 'AJUSTEMENT+' | 'AJUSTEMENT-' | 'PERTE' | 'RETOUR CLIENT' | 'RETOUR FOURNISSEUR';

export interface StockProduct {
  id: string;
  companyId: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  sku: string;
  barcode: string;
  imageUrl: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  minStock: number;
  maxStock: number;
  supplierId: string | null;
  description: string;
  archived: boolean;
}

export interface StockWarehouse {
  id: string;
  companyId: string;
  name: string;
  manager: string;
  address: string;
  archived: boolean;
}

export interface StockLocation { id: string; companyId: string; warehouseId: string; name: string; archived: boolean; }
export interface StockSupplier { id: string; companyId: string; name: string; contactName: string; email: string; phone: string; address: string; notes: string; archived: boolean; }
export interface StockBalance { id: string; companyId: string; productId: string; warehouseId: string; locationId: string | null; quantity: number; updatedAt: string; }
export interface StockMovement { id: string; companyId: string; productId: string; supplierId: string | null; warehouseId: string; destinationWarehouseId: string | null; locationId: string | null; requesterService: string | null; beneficiary: string | null; type: StockMovementType; quantity: number; purchasePrice: number; reason: string; movementDate: string; userName: string; reference: string; comment: string; status: string; }
export interface StockRequest { id: string; companyId: string; productId: string; warehouseId: string; quantity: number; reason: string; status: 'EN ATTENTE' | 'APPROUVÉE' | 'REJETÉE'; createdBy: string; createdAt: string; updatedAt: string; }
export interface StockInventory { id: string; companyId: string; warehouseId: string; status: string; inventoryDate: string; notes: string; createdBy: string; validatedAt: string | null; }
export interface StockInventoryLine { id: string; inventoryId: string; productId: string; theoreticalQuantity: number; actualQuantity: number; difference: number; }
export interface StockBootstrap { products: StockProduct[]; warehouses: StockWarehouse[]; locations: StockLocation[]; suppliers: StockSupplier[]; balances: StockBalance[]; movements: StockMovement[]; requests: StockRequest[]; inventories: StockInventory[]; inventoryLines: StockInventoryLine[]; }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Une erreur est survenue.');
  return body as T;
}

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const stockApi = {
  bootstrap: () => request<StockBootstrap>('/stock/bootstrap?companyId=kora'),
  createProduct: (body: Omit<StockProduct, 'id' | 'companyId' | 'archived'>) => request<StockProduct>('/stock/products', json({ ...body, companyId: 'kora' })),
  updateProduct: (id: string, body: Partial<StockProduct>) => request<StockProduct>(`/stock/products/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  archiveProduct: (id: string) => request<StockProduct>(`/stock/products/${id}`, { method: 'DELETE' }),
  createWarehouse: (body: { name: string; manager: string; address: string }) => request<StockWarehouse>('/stock/warehouses', json({ ...body, companyId: 'kora' })),
  updateWarehouse: (id: string, body: Partial<StockWarehouse>) => request<StockWarehouse>(`/stock/warehouses/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  archiveWarehouse: (id: string) => request<StockWarehouse>(`/stock/warehouses/${id}`, { method: 'DELETE' }),
  createLocation: (warehouseId: string, name: string) => request<StockLocation>(`/stock/warehouses/${warehouseId}/locations`, json({ companyId: 'kora', name })),
  createSupplier: (body: Omit<StockSupplier, 'id' | 'companyId' | 'archived'>) => request<StockSupplier>('/stock/suppliers', json({ ...body, companyId: 'kora' })),
  updateSupplier: (id: string, body: Partial<StockSupplier>) => request<StockSupplier>(`/stock/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  createMovement: (body: { productId: string; supplierId?: string | null; warehouseId: string; destinationWarehouseId?: string | null; locationId?: string | null; requesterService?: string | null; beneficiary?: string | null; type: StockMovementType; quantity: number; purchasePrice?: number; reason: string; movementDate?: string; userName: string; reference: string; comment: string }) => request<StockMovement>('/stock/movements', json({ ...body, companyId: 'kora' })),
  createRequest: (body: { productId: string; warehouseId: string; quantity: number; reason: string; createdBy: string }) => request<StockRequest>('/stock/requests', json({ ...body, companyId: 'kora' })),
  updateRequestStatus: (id: string, status: StockRequest['status']) => request<StockRequest>(`/stock/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }), headers: { 'Content-Type': 'application/json' } }),
  createInventory: (body: { warehouseId: string; notes: string; lines: { productId: string; actualQuantity: number }[]; createdBy: string }) => request<StockInventory>('/stock/inventories', json({ ...body, companyId: 'kora' })),
  validateInventory: (id: string) => request<StockInventory>(`/stock/inventories/${id}/validate`, { method: 'POST', body: JSON.stringify({}) }),
};