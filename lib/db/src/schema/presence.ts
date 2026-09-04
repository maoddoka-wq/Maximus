import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const presenceItemsTable = pgTable("presence_items", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  type: text("type").notNull(),
  employeeId: text("employee_id"),
  workDate: text("work_date"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status").notNull().default("ACTIF"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdBy: text("created_by").notNull().default("Utilisateur MAXIMUS"),
  updatedBy: text("updated_by").notNull().default("Utilisateur MAXIMUS"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPresenceItemSchema = createInsertSchema(presenceItemsTable);
export type PresenceItem = typeof presenceItemsTable.$inferSelect;
export type InsertPresenceItem = typeof presenceItemsTable.$inferInsert;