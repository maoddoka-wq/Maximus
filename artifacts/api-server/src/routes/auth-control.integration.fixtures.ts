import { randomBytes, scryptSync } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { authSessionsTable, authUsersTable } from "@workspace/db/schema";

export const authIntegrationAccounts = {
  maximusAdmin: {
    id: "maximus-admin",
    email: "admin@maximus.demo",
    password: "Admin123!",
    displayName: "Administrateur MAXIMUS de test",
    role: "maximus_admin",
    companyId: null,
    employeeId: null,
    sectorIds: [],
  },
  companyAdmin: {
    id: "kora-admin",
    email: "admin@kora.demo",
    password: "Kora123!",
    displayName: "Administrateur KORA de test",
    role: "company_admin",
    companyId: "kora",
    employeeId: null,
    sectorIds: [],
  },
  salesEmployee: {
    id: "demo-emp-awa",
    email: "awa.ndiaye@kora.demo",
    password: "AwaKora2026!",
    displayName: "Employée commerciale de test",
    role: "employee",
    companyId: "kora",
    employeeId: "demo-emp-awa",
    sectorIds: ["kora-service-vente"],
  },
  stockEmployee: {
    id: "demo-emp-ibrahima",
    email: "ibrahima.kane@kora.demo",
    password: "IbrahimaKora2026!",
    displayName: "Employé stock de test",
    role: "employee",
    companyId: "kora",
    employeeId: "demo-emp-ibrahima",
    sectorIds: ["kora-service-stock"],
  },
  hrEmployee: {
    id: "demo-emp-ndeye",
    email: "ndeye.sarr@kora.demo",
    password: "NdeyeSarr2026!",
    displayName: "Employée RH de test",
    role: "employee",
    companyId: "kora",
    employeeId: "demo-emp-ndeye",
    sectorIds: ["kora-service-rh"],
  },
  sectorManager: {
    id: "demo-emp-mamadou",
    email: "mamadou.ba@kora.demo",
    password: "MamadouKora2026!",
    displayName: "Manager de secteur de test",
    role: "sector_manager",
    companyId: "kora",
    employeeId: "demo-emp-mamadou",
    sectorIds: ["kora-service-finance"],
  },
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