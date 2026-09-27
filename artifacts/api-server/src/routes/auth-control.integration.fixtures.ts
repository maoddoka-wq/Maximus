import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { authSessionsTable, authUsersTable } from "@workspace/db/schema";

const runId = randomUUID();

function createAccount(
  name: string,
  role: string,
  companyId: string | null,
  employeeName: string | null,
  sectorIds: string[],
) {
  const id = `auth-integration-${name}-${runId}`;
  return {
    id,
    email: `${id}@example.test`,
    password: `Integration-${randomBytes(18).toString("hex")}-Aa1!`,
    displayName: `Integration ${name}`,
    role,
    companyId,
    employeeId: employeeName ? `auth-integration-employee-${employeeName}-${runId}` : null,
    sectorIds,
  };
}

export const authIntegrationAccounts = {
  maximusAdmin: createAccount("maximus-admin", "maximus_admin", null, null, []),
  companyAdmin: createAccount("company-admin", "company_admin", "kora", null, []),
  salesEmployee: createAccount("sales-employee", "employee", "kora", "sales", ["kora-service-vente"]),
  stockEmployee: createAccount("stock-employee", "employee", "kora", "stock", ["kora-service-stock"]),
  hrEmployee: createAccount("hr-employee", "employee", "kora", "hr", ["kora-service-rh"]),
  sectorManager: createAccount("sector-manager", "sector_manager", "kora", "manager", ["kora-service-finance"]),
} as const;

const accounts = Object.values(authIntegrationAccounts);
const accountIds = accounts.map(account => account.id);

function assertDedicatedTestDatabase() {
  const testDatabaseUrl = process.env.API_TEST_DATABASE_URL;
  const databaseUrl = process.env.DATABASE_URL;

  if (process.env.NODE_ENV !== "test") {
    throw new Error("Auth integration fixtures require NODE_ENV=test.");
  }
  if (!testDatabaseUrl || !databaseUrl || testDatabaseUrl !== databaseUrl) {
    throw new Error("Set API_TEST_DATABASE_URL and DATABASE_URL to the same isolated test database.");
  }
  if (process.env.MAXIMUS_ALLOW_AUTH_FIXTURES !== "1") {
    throw new Error("Set MAXIMUS_ALLOW_AUTH_FIXTURES=1 to enable auth integration fixtures.");
  }

  let databaseName = "";
  try {
    const url = new URL(testDatabaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      throw new Error();
    }
    databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    throw new Error("API_TEST_DATABASE_URL must be a PostgreSQL URL for a dedicated test database.");
  }

  if (!/_(test|integration|ci)$/i.test(databaseName)) {
    throw new Error("The auth integration database name must end in _test, _integration, or _ci.");
  }
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export async function cleanupAuthIntegrationFixtures() {
  assertDedicatedTestDatabase();
  await db.delete(authSessionsTable).where(inArray(authSessionsTable.userId, accountIds));
  await db.delete(authUsersTable).where(inArray(authUsersTable.id, accountIds));
}

export async function provisionAuthIntegrationFixtures() {
  assertDedicatedTestDatabase();
  await cleanupAuthIntegrationFixtures();

  const now = new Date();
  await db.insert(authUsersTable).values(
    accounts.map(({ password, ...account }) => ({
      ...account,
      sectorIds: [...account.sectorIds],
      passwordHash: hashPassword(password),
      status: "ACTIF",
      createdAt: now,
      updatedAt: now,
    })),
  );
}