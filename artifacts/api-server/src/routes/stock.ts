import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  stockBalancesTable,
  stockAuditLogsTable,
  stockInventoriesTable,
  stockInventoryLinesTable,
  stockLocationsTable,
  stockMovementsTable,
  stockProductsTable,
  stockRequestsTable,
  stockSuppliersTable,
  stockWarehousesTable,
} from "@workspace/db";

const router: IRouter = Router();
const COMPANY_ID = "kora";
const movementTypes = ["ENTRÉE", "SORTIE", "VENTE", "ACHAT", "TRANSFERT", "AJUSTEMENT+", "AJUSTEMENT-", "PERTE", "RETOUR CLIENT", "RETOUR FOURNISSEUR"] as const;
type MovementType = (typeof movementTypes)[number];

const productInput = z.object({
  companyId: z.string().default(COMPANY_ID),
  name: z.string().min(1),
  category: z.string().default("Divers"),
  subcategory: z.string().default(""),
  brand: z.string().default(""),
  sku: z.string().min(1),
  barcode: z.string().default(""),
  imageUrl: z.string().default(""),
  unit: z.string().default("unité"),
  purchasePrice: z.coerce.number().int().nonnegative().default(0),
  salePrice: z.coerce.number().int().nonnegative().default(0),
  minStock: z.coerce.number().int().nonnegative().default(0),
  maxStock: z.coerce.number().int().nonnegative().default(0),
  supplierId: z.string().nullable().optional(),
  description: z.string().default(""),
});

const warehouseInput = z.object({
  companyId: z.string().default(COMPANY_ID),
  name: z.string().min(1),
  manager: z.string().default(""),
  address: z.string().default(""),
});

const supplierInput = z.object({
  companyId: z.string().default(COMPANY_ID),
  name: z.string().min(1),
  contactName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  address: z.string().default(""),
  notes: z.string().default(""),
});

const movementInput = z.object({
  companyId: z.string().default(COMPANY_ID),
  productId: z.string().min(1),
  supplierId: z.string().nullable().optional(),
  warehouseId: z.string().min(1),
  destinationWarehouseId: z.string().nullable().optional(),
  locationId: z.string().nullable().optional(),
  requesterService: z.string().nullable().optional(),
  beneficiary: z.string().nullable().optional(),
  type: z.enum(movementTypes),
  quantity: z.coerce.number().int().positive(),
  purchasePrice: z.coerce.number().int().nonnegative().default(0),
  reason: z.string().default(""),
  movementDate: z.coerce.date().optional(),
  userName: z.string().default("Utilisateur MAXIMUS"),
  reference: z.string().default(""),
  comment: z.string().default(""),
});

const inventoryInput = z.object({
  companyId: z.string().default(COMPANY_ID),
  warehouseId: z.string().min(1),
  notes: z.string().default(""),
  lines: z.array(z.object({ productId: z.string(), actualQuantity: z.coerce.number().int().nonnegative() })).min(1),
  createdBy: z.string().default("Utilisateur MAXIMUS"),
});

const requestInput = z.object({
  companyId: z.string().default(COMPANY_ID),
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().min(1),
  createdBy: z.string().default("Utilisateur MAXIMUS"),
});

const idOf = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const jsonError = (res: Parameters<IRouter["get"]>[1] extends never ? never : any, status: number, message: string) => res.status(status).json({ error: message });
const companyIdOf = (req: any) => typeof req.query.companyId === "string" ? req.query.companyId : typeof req.body?.companyId === "string" ? req.body.companyId : COMPANY_ID;

async function ensureSeed() {
  const [existing] = await db.select({ id: stockProductsTable.id }).from(stockProductsTable).where(eq(stockProductsTable.companyId, COMPANY_ID)).limit(1);
  if (existing) return;
  const supplierId = "supplier-kora-local";
  const warehouseId = "warehouse-kora-main";
  const locationId = "location-kora-main";
  await db.insert(stockSuppliersTable).values({ id: supplierId, companyId: COMPANY_ID, name: "Fournisseurs KORA", contactName: "Service achats", phone: "+221 33 800 00 00", address: "Dakar, Sénégal" });
  await db.insert(stockWarehousesTable).values({ id: warehouseId, companyId: COMPANY_ID, name: "Entrepôt principal", manager: "Ndeye Sarr", address: "Zone industrielle, Dakar" });
  await db.insert(stockLocationsTable).values({ id: locationId, companyId: COMPANY_ID, warehouseId, name: "Zone A — Épicerie" });
  const products = [
    { id: "product-kora-cafe", name: "Café Touba 250g", category: "Épicerie", subcategory: "Café", brand: "Touba", sku: "KOR-CAF-01", barcode: "377000000001", unit: "sachet", purchasePrice: 2400, salePrice: 3500, minStock: 50, maxStock: 300, supplierId, description: "Café Touba conditionné 250g." },
    { id: "product-kora-huile", name: "Huile d’arachide 1L", category: "Épicerie", subcategory: "Huiles", brand: "KORA", sku: "KOR-HUI-02", barcode: "377000000002", unit: "bouteille", purchasePrice: 1600, salePrice: 2200, minStock: 45, maxStock: 200, supplierId, description: "Huile d’arachide locale 1 litre." },
    { id: "product-kora-riz", name: "Riz local 5kg", category: "Épicerie", subcategory: "Céréales", brand: "Sahel", sku: "KOR-RIZ-03", barcode: "377000000003", unit: "sac", purchasePrice: 5200, salePrice: 6800, minStock: 30, maxStock: 150, supplierId, description: "Riz local conditionné en sac de 5kg." },
    { id: "product-kora-savon", name: "Savon naturel", category: "Hygiène", subcategory: "Savons", brand: "Baobab", sku: "KOR-SAV-04", barcode: "377000000004", unit: "pièce", purchasePrice: 700, salePrice: 1200, minStock: 25, maxStock: 120, supplierId, description: "Savon naturel au karité." },
    { id: "product-kora-baume", name: "Baume karité 100ml", category: "Bien-être", subcategory: "Soins", brand: "Teranga", sku: "KOR-COS-05", barcode: "377000000005", unit: "pot", purchasePrice: 3100, salePrice: 4500, minStock: 20, maxStock: 120, supplierId, description: "Baume de karité naturel 100ml." },
  ];
  await db.insert(stockProductsTable).values(products.map(product => ({ ...product, companyId: COMPANY_ID })));
  await db.insert(stockBalancesTable).values([
    { id: "balance-kora-cafe", companyId: COMPANY_ID, productId: products[0].id, warehouseId, locationId, quantity: 184 },
    { id: "balance-kora-huile", companyId: COMPANY_ID, productId: products[1].id, warehouseId, locationId, quantity: 38 },
    { id: "balance-kora-riz", companyId: COMPANY_ID, productId: products[2].id, warehouseId, locationId, quantity: 76 },
    { id: "balance-kora-savon", companyId: COMPANY_ID, productId: products[3].id, warehouseId, locationId, quantity: 12 },
    { id: "balance-kora-baume", companyId: COMPANY_ID, productId: products[4].id, warehouseId, locationId, quantity: 92 },
  ]);
  await db.insert(stockMovementsTable).values([
    { id: "movement-kora-1", companyId: COMPANY_ID, productId: products[1].id, warehouseId, locationId, type: "SORTIE", quantity: 20, reason: "Réassort boutique Dakar", userName: "Ibrahima Kane", reference: "MVT-240618-001", comment: "Sortie initiale de démonstration", movementDate: new Date("2024-06-18T09:42:00Z") },
    { id: "movement-kora-2", companyId: COMPANY_ID, productId: products[0].id, warehouseId, locationId, type: "ENTRÉE", quantity: 80, purchasePrice: 2400, reason: "Réception fournisseur", userName: "Ndeye Sarr", reference: "REC-240617-004", comment: "Réception initiale de démonstration", movementDate: new Date("2024-06-17T16:18:00Z") },
    { id: "movement-kora-3", companyId: COMPANY_ID, productId: products[3].id, warehouseId, locationId, type: "PERTE", quantity: 8, reason: "Produit endommagé", userName: "Moussa Faye", reference: "PER-240617-001", comment: "Perte initiale de démonstration", movementDate: new Date("2024-06-17T11:05:00Z") },
  ]);
}

async function getBootstrap(companyId: string) {
  const [products, warehouses, locations, suppliers, balances, movements, requests, inventories] = await Promise.all([
    db.select().from(stockProductsTable).where(eq(stockProductsTable.companyId, companyId)).orderBy(asc(stockProductsTable.name)),
    db.select().from(stockWarehousesTable).where(eq(stockWarehousesTable.companyId, companyId)).orderBy(asc(stockWarehousesTable.name)),
    db.select().from(stockLocationsTable).where(eq(stockLocationsTable.companyId, companyId)).orderBy(asc(stockLocationsTable.name)),
    db.select().from(stockSuppliersTable).where(eq(stockSuppliersTable.companyId, companyId)).orderBy(asc(stockSuppliersTable.name)),
    db.select().from(stockBalancesTable).where(eq(stockBalancesTable.companyId, companyId)),
    db.select().from(stockMovementsTable).where(eq(stockMovementsTable.companyId, companyId)).orderBy(desc(stockMovementsTable.movementDate)).limit(250),
    db.select().from(stockRequestsTable).where(eq(stockRequestsTable.companyId, companyId)).orderBy(desc(stockRequestsTable.createdAt)),
    db.select().from(stockInventoriesTable).where(eq(stockInventoriesTable.companyId, companyId)).orderBy(desc(stockInventoriesTable.inventoryDate)),
  ]);
  const inventoryLines = inventories.length ? await db.select().from(stockInventoryLinesTable).where(sql`${stockInventoryLinesTable.inventoryId} in (${sql.join(inventories.map(i => sql`${i.id}`), sql`, `)})`) : [];
  return { products, warehouses, locations, suppliers, balances, movements, requests, inventories, inventoryLines };
}

async function updateBalance(tx: any, companyId: string, productId: string, warehouseId: string, locationId: string | null | undefined, delta: number) {
  const conditions = [eq(stockBalancesTable.companyId, companyId), eq(stockBalancesTable.productId, productId), eq(stockBalancesTable.warehouseId, warehouseId), locationId ? eq(stockBalancesTable.locationId, locationId) : sql`${stockBalancesTable.locationId} is null`];
  const [balance] = await tx.select().from(stockBalancesTable).where(and(...conditions)).limit(1);
  if (!balance) {
    if (delta < 0) throw new Error("STOCK_INSUFFICIENT");
    const created = { id: idOf("balance"), companyId, productId, warehouseId, locationId: locationId ?? null, quantity: delta };
    await tx.insert(stockBalancesTable).values(created);
    return created;
  }
  const quantity = balance.quantity + delta;
  if (quantity < 0) throw new Error("STOCK_INSUFFICIENT");
  const [updated] = await tx.update(stockBalancesTable).set({ quantity, updatedAt: new Date() }).where(eq(stockBalancesTable.id, balance.id)).returning();
  return updated;
}

router.get("/stock/bootstrap", async (req, res): Promise<void> => {
  const companyId = typeof req.query.companyId === "string" ? req.query.companyId : COMPANY_ID;
  await ensureSeed();
  res.json(await getBootstrap(companyId));
});

router.post("/stock/products", async (req, res): Promise<void> => {
  const parsed = productInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const product = { id: idOf("product"), ...parsed.data, createdAt: new Date(), updatedAt: new Date(), archived: false };
  await db.insert(stockProductsTable).values(product);
  res.status(201).json(product);
});

router.patch("/stock/products/:id", async (req, res): Promise<void> => {
  const parsed = productInput.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { companyId: _companyId, ...changes } = parsed.data;
  const [product] = await db.update(stockProductsTable).set({ ...changes, updatedAt: new Date() }).where(and(eq(stockProductsTable.id, req.params.id), eq(stockProductsTable.companyId, companyIdOf(req)))).returning();
  if (!product) { res.status(404).json({ error: "Produit introuvable" }); return; }
  res.json(product);
});

router.delete("/stock/products/:id", async (req, res): Promise<void> => {
  const [product] = await db.update(stockProductsTable).set({ archived: true, updatedAt: new Date() }).where(and(eq(stockProductsTable.id, req.params.id), eq(stockProductsTable.companyId, companyIdOf(req)))).returning();
  if (!product) { res.status(404).json({ error: "Produit introuvable" }); return; }
  res.json(product);
});

router.post("/stock/suppliers", async (req, res): Promise<void> => {
  const parsed = supplierInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const supplier = { id: idOf("supplier"), ...parsed.data, createdAt: new Date(), updatedAt: new Date(), archived: false };
  await db.insert(stockSuppliersTable).values(supplier);
  res.status(201).json(supplier);
});

router.patch("/stock/suppliers/:id", async (req, res): Promise<void> => {
  const parsed = supplierInput.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { companyId: _companyId, ...changes } = parsed.data;
  const [supplier] = await db.update(stockSuppliersTable).set({ ...changes, updatedAt: new Date() }).where(and(eq(stockSuppliersTable.id, req.params.id), eq(stockSuppliersTable.companyId, companyIdOf(req)))).returning();
  if (!supplier) { res.status(404).json({ error: "Fournisseur introuvable" }); return; }
  res.json(supplier);
});

router.delete("/stock/suppliers/:id", async (req, res): Promise<void> => {
  const [supplier] = await db.update(stockSuppliersTable).set({ archived: true, updatedAt: new Date() }).where(and(eq(stockSuppliersTable.id, req.params.id), eq(stockSuppliersTable.companyId, companyIdOf(req)))).returning();
  if (!supplier) { res.status(404).json({ error: "Fournisseur introuvable" }); return; }
  res.json(supplier);
});

router.post("/stock/warehouses", async (req, res): Promise<void> => {
  const parsed = warehouseInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const warehouse = { id: idOf("warehouse"), ...parsed.data, createdAt: new Date(), updatedAt: new Date(), archived: false };
  await db.insert(stockWarehousesTable).values(warehouse);
  res.status(201).json(warehouse);
});

router.patch("/stock/warehouses/:id", async (req, res): Promise<void> => {
  const parsed = warehouseInput.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { companyId: _companyId, ...changes } = parsed.data;
  const [warehouse] = await db.update(stockWarehousesTable).set({ ...changes, updatedAt: new Date() }).where(and(eq(stockWarehousesTable.id, req.params.id), eq(stockWarehousesTable.companyId, companyIdOf(req)))).returning();
  if (!warehouse) { res.status(404).json({ error: "Entrepôt introuvable" }); return; }
  res.json(warehouse);
});

router.delete("/stock/warehouses/:id", async (req, res): Promise<void> => {
  const [warehouse] = await db.update(stockWarehousesTable).set({ archived: true, updatedAt: new Date() }).where(and(eq(stockWarehousesTable.id, req.params.id), eq(stockWarehousesTable.companyId, companyIdOf(req)))).returning();
  if (!warehouse) { res.status(404).json({ error: "Entrepôt introuvable" }); return; }
  res.json(warehouse);
});

router.post("/stock/warehouses/:warehouseId/locations", async (req, res): Promise<void> => {
  const parsed = z.object({ companyId: z.string().default(COMPANY_ID), name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const [warehouse] = await db.select({ id: stockWarehousesTable.id }).from(stockWarehousesTable).where(and(eq(stockWarehousesTable.id, req.params.warehouseId), eq(stockWarehousesTable.companyId, parsed.data.companyId))).limit(1);
  if (!warehouse) { res.status(404).json({ error: "Entrepôt introuvable" }); return; }
  const location = { id: idOf("location"), companyId: parsed.data.companyId, warehouseId: req.params.warehouseId, name: parsed.data.name, archived: false, createdAt: new Date() };
  await db.insert(stockLocationsTable).values(location);
  res.status(201).json(location);
});

router.patch("/stock/locations/:id", async (req, res): Promise<void> => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const [location] = await db.update(stockLocationsTable).set({ name: parsed.data.name }).where(and(eq(stockLocationsTable.id, req.params.id), eq(stockLocationsTable.companyId, companyIdOf(req)))).returning();
  if (!location) { res.status(404).json({ error: "Emplacement introuvable" }); return; }
  res.json(location);
});

router.delete("/stock/locations/:id", async (req, res): Promise<void> => {
  const [location] = await db.update(stockLocationsTable).set({ archived: true }).where(and(eq(stockLocationsTable.id, req.params.id), eq(stockLocationsTable.companyId, companyIdOf(req)))).returning();
  if (!location) { res.status(404).json({ error: "Emplacement introuvable" }); return; }
  res.json(location);
});

router.post("/stock/movements", async (req, res): Promise<void> => {
  const parsed = movementInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const input = parsed.data;
  try {
    const movement = await db.transaction(async tx => {
      const [product] = await tx.select().from(stockProductsTable).where(and(eq(stockProductsTable.id, input.productId), eq(stockProductsTable.companyId, input.companyId))).limit(1);
      if (!product || product.archived) throw new Error("PRODUCT_NOT_FOUND");
      const [warehouse] = await tx.select({ id: stockWarehousesTable.id }).from(stockWarehousesTable).where(and(eq(stockWarehousesTable.id, input.warehouseId), eq(stockWarehousesTable.companyId, input.companyId))).limit(1);
      if (!warehouse) throw new Error("WAREHOUSE_NOT_FOUND");
      if (input.destinationWarehouseId) {
        const [destination] = await tx.select({ id: stockWarehousesTable.id }).from(stockWarehousesTable).where(and(eq(stockWarehousesTable.id, input.destinationWarehouseId), eq(stockWarehousesTable.companyId, input.companyId))).limit(1);
        if (!destination) throw new Error("WAREHOUSE_NOT_FOUND");
      }
      const signedOut = ["SORTIE", "VENTE", "AJUSTEMENT-", "PERTE", "RETOUR FOURNISSEUR"].includes(input.type);
      const isTransfer = input.type === "TRANSFERT";
      if (isTransfer && !input.destinationWarehouseId) throw new Error("DESTINATION_REQUIRED");
      if (signedOut || isTransfer) await updateBalance(tx, input.companyId, input.productId, input.warehouseId, input.locationId, -input.quantity);
      if (!signedOut || isTransfer && input.destinationWarehouseId) {
        const targetWarehouse = isTransfer ? input.destinationWarehouseId! : input.warehouseId;
        await updateBalance(tx, input.companyId, input.productId, targetWarehouse, input.locationId, input.quantity);
      }
      const created = { id: idOf("movement"), ...input, movementDate: input.movementDate ?? new Date(), createdAt: new Date(), status: "VALIDÉ" };
      await tx.insert(stockMovementsTable).values(created);
      await tx.insert(stockAuditLogsTable).values({ id: idOf("audit"), companyId: input.companyId, action: "VALIDATION_MOUVEMENT", entityType: "movement", entityId: created.id, userName: input.userName, detail: `${input.type} de ${input.quantity} unité(s)` });
      return created;
    });
    req.log.info({ movementId: movement.id, type: movement.type, productId: movement.productId }, "Stock movement validated");
    res.status(201).json(movement);
  } catch (error) {
    const message = error instanceof Error ? error.message : "STOCK_ERROR";
    const status = message === "STOCK_INSUFFICIENT" ? 409 : 400;
    res.status(status).json({ error: message === "STOCK_INSUFFICIENT" ? "Stock insuffisant : le stock négatif est interdit." : message });
  }
});

router.post("/stock/requests", async (req, res): Promise<void> => {
  const parsed = requestInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const request = { id: idOf("stock-request"), ...parsed.data, status: "EN ATTENTE", createdAt: new Date(), updatedAt: new Date() };
  await db.insert(stockRequestsTable).values(request);
  res.status(201).json(request);
});

router.patch("/stock/requests/:id/status", async (req, res): Promise<void> => {
  const parsed = z.object({ status: z.enum(["EN ATTENTE", "APPROUVÉE", "REJETÉE"]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
   const [request] = await db.update(stockRequestsTable).set({ status: parsed.data.status, updatedAt: new Date() }).where(and(eq(stockRequestsTable.id, req.params.id), eq(stockRequestsTable.companyId, companyIdOf(req)))).returning();
  if (!request) { res.status(404).json({ error: "Demande introuvable" }); return; }
  res.json(request);
});

router.patch("/stock/requests/:id", async (req, res): Promise<void> => {
  const parsed = z.object({
    productId: z.string().min(1),
    warehouseId: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
    reason: z.string().min(1),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const [request] = await db.update(stockRequestsTable).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(stockRequestsTable.id, req.params.id), eq(stockRequestsTable.companyId, companyIdOf(req)), eq(stockRequestsTable.status, "EN ATTENTE"))).returning();
  if (!request) { res.status(404).json({ error: "Demande introuvable ou déjà traitée" }); return; }
  res.json(request);
});

router.delete("/stock/requests/:id", async (req, res): Promise<void> => {
  const [request] = await db.delete(stockRequestsTable).where(and(eq(stockRequestsTable.id, req.params.id), eq(stockRequestsTable.companyId, companyIdOf(req)), eq(stockRequestsTable.status, "EN ATTENTE"))).returning();
  if (!request) { res.status(404).json({ error: "Demande introuvable ou déjà traitée" }); return; }
  res.json(request);
});

router.post("/stock/inventories", async (req, res): Promise<void> => {
  const parsed = inventoryInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const input = parsed.data;
  const inventory = await db.transaction(async tx => {
    const id = idOf("inventory");
    const [warehouse] = await tx.select({ id: stockWarehousesTable.id }).from(stockWarehousesTable).where(and(eq(stockWarehousesTable.id, input.warehouseId), eq(stockWarehousesTable.companyId, input.companyId))).limit(1);
    if (!warehouse) throw new Error("WAREHOUSE_NOT_FOUND");
    const [created] = await tx.insert(stockInventoriesTable).values({ id, companyId: input.companyId, warehouseId: input.warehouseId, notes: input.notes, createdBy: input.createdBy }).returning();
    const products = await tx.select().from(stockProductsTable).where(eq(stockProductsTable.companyId, input.companyId));
    for (const line of input.lines) {
      const product = products.find(item => item.id === line.productId);
      if (!product) continue;
      const balances = await tx.select({ quantity: stockBalancesTable.quantity }).from(stockBalancesTable).where(and(eq(stockBalancesTable.companyId, input.companyId), eq(stockBalancesTable.productId, line.productId), eq(stockBalancesTable.warehouseId, input.warehouseId)));
      const theoreticalQuantity = balances.reduce((sum, balance) => sum + balance.quantity, 0);
      await tx.insert(stockInventoryLinesTable).values({ id: idOf("inventory-line"), inventoryId: id, productId: line.productId, theoreticalQuantity, actualQuantity: line.actualQuantity, difference: line.actualQuantity - theoreticalQuantity });
    }
    return created;
  });
  res.status(201).json(inventory);
});

router.post("/stock/inventories/:id/validate", async (req, res): Promise<void> => {
  try {
    const inventory = await db.transaction(async tx => {
      const [current] = await tx.select().from(stockInventoriesTable).where(eq(stockInventoriesTable.id, req.params.id)).limit(1);
      if (!current) throw new Error("INVENTORY_NOT_FOUND");
      const requestedCompanyId = companyIdOf(req);
      if (requestedCompanyId !== current.companyId) throw new Error("INVENTORY_NOT_FOUND");
      if (current.status === "VALIDÉ") return current;
      const lines = await tx.select().from(stockInventoryLinesTable).where(eq(stockInventoryLinesTable.inventoryId, current.id));
      for (const line of lines) {
        const balances = await tx.select().from(stockBalancesTable).where(and(eq(stockBalancesTable.companyId, current.companyId), eq(stockBalancesTable.productId, line.productId), eq(stockBalancesTable.warehouseId, current.warehouseId)));
        const theoretical = balances.reduce((sum, balance) => sum + balance.quantity, 0);
        const difference = line.actualQuantity - theoretical;
        await tx.update(stockInventoryLinesTable).set({ theoreticalQuantity: theoretical, difference }).where(eq(stockInventoryLinesTable.id, line.id));
        if (difference !== 0) {
          await updateBalance(tx, current.companyId, line.productId, current.warehouseId, balances[0]?.locationId ?? null, difference);
          await tx.insert(stockMovementsTable).values({ id: idOf("movement"), companyId: current.companyId, productId: line.productId, warehouseId: current.warehouseId, type: difference > 0 ? "AJUSTEMENT+" : "AJUSTEMENT-", quantity: Math.abs(difference), reason: "Écart d’inventaire", userName: current.createdBy, reference: current.id, comment: current.notes, movementDate: new Date(), status: "VALIDÉ", createdAt: new Date() });
        }
      }
      const [updated] = await tx.update(stockInventoriesTable).set({ status: "VALIDÉ", validatedAt: new Date() }).where(eq(stockInventoriesTable.id, current.id)).returning();
      await tx.insert(stockAuditLogsTable).values({ id: idOf("audit"), companyId: current.companyId, action: "VALIDATION_INVENTAIRE", entityType: "inventory", entityId: current.id, userName: current.createdBy, detail: `${lines.length} référence(s) comptée(s)` });
      return updated;
    });
    res.json(inventory);
  } catch (error) {
    const message = error instanceof Error ? error.message : "INVENTORY_ERROR";
    res.status(message === "INVENTORY_NOT_FOUND" ? 404 : 400).json({ error: message });
  }
});

export default router;