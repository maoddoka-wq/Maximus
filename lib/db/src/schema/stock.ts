import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

const id = (name: string) => text(name).primaryKey();

export const stockSuppliersTable = pgTable("stock_suppliers", {
  id: id("id"),
  companyId: text("company_id").notNull(),
  name: text("name").notNull(),
  contactName: text("contact_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockWarehousesTable = pgTable("stock_warehouses", {
  id: id("id"),
  companyId: text("company_id").notNull(),
  name: text("name").notNull(),
  manager: text("manager").notNull().default(""),
  address: text("address").notNull().default(""),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockLocationsTable = pgTable("stock_locations", {
  id: id("id"),
  companyId: text("company_id").notNull(),
  warehouseId: text("warehouse_id").notNull(),
  name: text("name").notNull(),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockProductsTable = pgTable("stock_products", {
  id: id("id"),
  companyId: text("company_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("Divers"),
  subcategory: text("subcategory").notNull().default(""),
  brand: text("brand").notNull().default(""),
  sku: text("sku").notNull(),
  barcode: text("barcode").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  unit: text("unit").notNull().default("unité"),
  purchasePrice: integer("purchase_price").notNull().default(0),
  salePrice: integer("sale_price").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  maxStock: integer("max_stock").notNull().default(0),
  supplierId: text("supplier_id"),
  description: text("description").notNull().default(""),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockBalancesTable = pgTable("stock_balances", {
  id: id("id"),
  companyId: text("company_id").notNull(),
  productId: text("product_id").notNull(),
  warehouseId: text("warehouse_id").notNull(),
  locationId: text("location_id"),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockMovementsTable = pgTable("stock_movements", {
  id: id("id"),
  companyId: text("company_id").notNull(),
  productId: text("product_id").notNull(),
  warehouseId: text("warehouse_id").notNull(),
  destinationWarehouseId: text("destination_warehouse_id"),
  locationId: text("location_id"),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  purchasePrice: integer("purchase_price").notNull().default(0),
  reason: text("reason").notNull().default(""),
  movementDate: timestamp("movement_date", { withTimezone: true }).notNull().defaultNow(),
  userName: text("user_name").notNull().default("Utilisateur MAXIMUS"),
  reference: text("reference").notNull().default(""),
  comment: text("comment").notNull().default(""),
  status: text("status").notNull().default("VALIDÉ"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockInventoriesTable = pgTable("stock_inventories", {
  id: id("id"),
  companyId: text("company_id").notNull(),
  warehouseId: text("warehouse_id").notNull(),
  status: text("status").notNull().default("BROUILLON"),
  inventoryDate: timestamp("inventory_date", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull().default("Utilisateur MAXIMUS"),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockInventoryLinesTable = pgTable("stock_inventory_lines", {
  id: id("id"),
  inventoryId: text("inventory_id").notNull(),
  productId: text("product_id").notNull(),
  theoreticalQuantity: integer("theoretical_quantity").notNull().default(0),
  actualQuantity: integer("actual_quantity").notNull().default(0),
  difference: integer("difference").notNull().default(0),
});

export const stockAuditLogsTable = pgTable("stock_audit_logs", {
  id: id("id"),
  companyId: text("company_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  userName: text("user_name").notNull().default("Utilisateur MAXIMUS"),
  detail: text("detail").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStockProductSchema = createInsertSchema(stockProductsTable);
export const insertStockWarehouseSchema = createInsertSchema(stockWarehousesTable);
export const insertStockLocationSchema = createInsertSchema(stockLocationsTable);
export const insertStockSupplierSchema = createInsertSchema(stockSuppliersTable);
export const insertStockMovementSchema = createInsertSchema(stockMovementsTable);
