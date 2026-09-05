import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner resolves the .ts test import.
import app from "../app.ts";
// @ts-expect-error Node's native TypeScript runner resolves the .ts test import.
import { ensureDemoAuthUsers } from "./auth.ts";

let server: ReturnType<typeof app.listen>;
let baseUrl = "";
const provisionedAccount = {
  id: `integration-account-${randomUUID()}`,
  employeeId: `integration-employee-${randomUUID()}`,
  email: `integration-${randomUUID()}@example.test`,
};

async function login(email: string, password: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = response.headers.get("set-cookie");
  return { response, cookie: setCookie ? setCookie.split(";")[0] : null };
}

test.before(async () => {
  await ensureDemoAuthUsers();
  server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Le serveur de test n’a pas de port.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  const admin = await login("admin@kora.demo", "Kora123!");
  if (admin.cookie) {
    await fetch(`${baseUrl}/api/auth/accounts/${encodeURIComponent(provisionedAccount.employeeId)}`, {
      method: "DELETE",
      headers: { Cookie: admin.cookie },
    });
  }
  server.close();
});

test("refuse Contrôle sans session", async () => {
  const response = await fetch(`${baseUrl}/api/control/bootstrap?companyId=kora&scope=all`);
  assert.equal(response.status, 401);
});

test("connecte un compte PostgreSQL et autorise son périmètre", async () => {
  const { response: loginResponse, cookie } = await login("admin@kora.demo", "Kora123!");
  assert.equal(loginResponse.status, 200);
  assert.ok(cookie);

  const bootstrap = await fetch(`${baseUrl}/api/control/bootstrap?companyId=kora&scope=all`, {
    headers: { Cookie: cookie.split(";")[0] },
  });
  assert.equal(bootstrap.status, 200);

  const crossCompany = await fetch(`${baseUrl}/api/control/bootstrap?companyId=other-company&scope=all`, {
    headers: { Cookie: cookie.split(";")[0] },
  });
  assert.equal(crossCompany.status, 403);
});

test("refuse un mauvais mot de passe", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@kora.demo", password: "incorrect" }),
  });
  assert.equal(response.status, 401);
});

test("provisionne, met à jour et révoque le compte d’un employé", async () => {
  const admin = await login("admin@kora.demo", "Kora123!");
  assert.equal(admin.response.status, 200);
  assert.ok(admin.cookie);

  const create = await fetch(`${baseUrl}/api/auth/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin.cookie },
    body: JSON.stringify({
      ...provisionedAccount,
      displayName: "Employé d’intégration",
      companyId: "kora",
      sectorIds: ["kora-service-stock"],
      role: "employee",
      password: "Initiale123!",
    }),
  });
  assert.equal(create.status, 201);

  const createdLogin = await login(provisionedAccount.email, "Initiale123!");
  assert.equal(createdLogin.response.status, 200);
  assert.ok(createdLogin.cookie);

  const update = await fetch(`${baseUrl}/api/auth/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin.cookie },
    body: JSON.stringify({
      ...provisionedAccount,
      displayName: "Employé d’intégration modifié",
      companyId: "kora",
      sectorIds: ["kora-service-stock"],
      role: "employee",
    }),
  });
  assert.equal(update.status, 200);

  const unchangedPasswordLogin = await login(provisionedAccount.email, "Initiale123!");
  assert.equal(unchangedPasswordLogin.response.status, 200);

  const passwordUpdate = await fetch(`${baseUrl}/api/auth/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin.cookie },
    body: JSON.stringify({
      ...provisionedAccount,
      displayName: "Employé d’intégration modifié",
      companyId: "kora",
      sectorIds: ["kora-service-stock"],
      role: "employee",
      password: "Nouvelle123!",
    }),
  });
  assert.equal(passwordUpdate.status, 200);

  const revokedSession = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Cookie: createdLogin.cookie },
  });
  assert.equal(revokedSession.status, 200);
  assert.deepEqual((await revokedSession.json()) as { user: unknown }, { user: null });
  assert.equal((await login(provisionedAccount.email, "Initiale123!")).response.status, 401);
  assert.equal((await login(provisionedAccount.email, "Nouvelle123!")).response.status, 200);

  const remove = await fetch(`${baseUrl}/api/auth/accounts/${encodeURIComponent(provisionedAccount.employeeId)}`, {
    method: "DELETE",
    headers: { Cookie: admin.cookie },
  });
  assert.equal(remove.status, 204);
  assert.equal((await login(provisionedAccount.email, "Nouvelle123!")).response.status, 401);
});

test("refuse à un manager de secteur un compte hors de son périmètre", async () => {
  const manager = await login("mamadou.ba@kora.demo", "MamadouKora2026!");
  assert.equal(manager.response.status, 200);
  assert.ok(manager.cookie);

  const response = await fetch(`${baseUrl}/api/auth/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: manager.cookie },
    body: JSON.stringify({
      id: `out-of-scope-${randomUUID()}`,
      email: `out-of-scope-${randomUUID()}@example.test`,
      displayName: "Compte hors périmètre",
      companyId: "kora",
      employeeId: `out-of-scope-employee-${randomUUID()}`,
      sectorIds: ["kora-service-stock"],
      role: "employee",
      password: "Initiale123!",
    }),
  });
  assert.equal(response.status, 403);
});