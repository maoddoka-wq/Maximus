import { jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const authUsersTable = pgTable("auth_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  companyId: text("company_id"),
  employeeId: text("employee_id"),
  sectorIds: jsonb("sector_ids").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("ACTIF"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  emailUnique: uniqueIndex("auth_users_email_unique").on(table.email),
}));

export const authSessionsTable = pgTable("auth_sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuthUser = typeof authUsersTable.$inferSelect;
export type AuthSession = typeof authSessionsTable.$inferSelect;