import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner resolves the .ts test import.
import app from "../app.ts";
// @ts-expect-error Node's native TypeScript runner resolves the .ts test import.
import { ensureDemoAuthUsers } from "./auth.ts";

let server: ReturnType<typeof app.listen>;
let baseUrl = "";

test.before(async () => {
  await ensureDemoAuthUsers();
  server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Le serveur de test n’a pas de port.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(() => {
  server.close();
});

test("refuse Contrôle sans session", async () => {
  const response = await fetch(`${baseUrl}/api/control/bootstrap?companyId=kora&scope=all`);
  assert.equal(response.status, 401);
});

test("connecte un compte PostgreSQL et autorise son périmètre", async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@kora.demo", password: "Kora123!" }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
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