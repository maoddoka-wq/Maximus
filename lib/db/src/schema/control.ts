import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const controlTasksTable = pgTable("control_tasks", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  sectorId: text("sector_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  moduleId: text("module_id"),
  assigneeEmployeeId: text("assignee_employee_id"),
  assigneeName: text("assignee_name"),
  createdBy: text("created_by").notNull(),
  status: text("status").notNull().default("À FAIRE"),
  priority: text("priority").notNull().default("NORMALE"),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  dueDate: text("due_date"),
  relatedObject: text("related_object"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const controlEventsTable = pgTable("control_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  label: text("label").notNull(),
  summary: text("summary").notNull(),
  companyId: text("company_id").notNull(),
  moduleId: text("module_id"),
  actorName: text("actor_name").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  severity: text("severity").notNull().default("info"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const controlAuditEntriesTable = pgTable("control_audit_entries", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  summary: text("summary").notNull(),
  companyId: text("company_id").notNull(),
  moduleId: text("module_id"),
  actorName: text("actor_name").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ControlTask = typeof controlTasksTable.$inferSelect;
export type InsertControlTask = typeof controlTasksTable.$inferInsert;
export type ControlEvent = typeof controlEventsTable.$inferSelect;
export type ControlAuditEntry = typeof controlAuditEntriesTable.$inferSelect;