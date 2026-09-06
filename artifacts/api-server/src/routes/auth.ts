import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import { authSessionsTable, authUsersTable } from "@workspace/db/schema";
import type { ControlActorContext, ControlActorRole } from "./control-authorization";

const router: IRouter = Router();
const sessionCookie = "maximus_session";
const sessionDurationMs = 1000 * 60 * 60 * 8;
const loginInput = z.object({
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(1).max(200),
});
const accountInput = z.object({
  id: z.string().min(1),
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  displayName: z.string().trim().min(1).max(180),
  companyId: z.string().min(1),
  employeeId: z.string().min(1),
  sectorIds: z.array(z.string().min(1)).min(1),
  role: z.enum(["sector_manager", "employee"]),
  password: z.string().min(8).max(200).optional(),
});

type AuthUserRecord = typeof authUsersTable.$inferSelect;

function passwordHash(password: string, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function passwordMatches(password: string, encoded: string) {
  const [salt, expected] = encoded.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookies(request: Request) {
  return Object.fromEntries((request.headers.cookie ?? "").split(";").map(cookie => {
    const separator = cookie.indexOf("=");
    return separator === -1 ? [cookie.trim(), ""] : [cookie.slice(0, separator).trim(), decodeURIComponent(cookie.slice(separator + 1).trim())];
  }).filter(([name]) => name));
}

function setSessionCookie(response: Response, token: string, maxAgeMs = sessionDurationMs) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader("Set-Cookie", `${sessionCookie}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${secure}`);
}

function clearSessionCookie(response: Response) {
  response.setHeader("Set-Cookie", `${sessionCookie}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

export function actorFromAuthUser(user: Pick<AuthUserRecord, "role" | "displayName" | "companyId" | "employeeId" | "sectorIds">): ControlActorContext {
  return {
    role: user.role as ControlActorRole,
    displayName: user.displayName,
    companyId: user.companyId ?? undefined,
    employeeId: user.employeeId ?? undefined,
    sectorIds: Array.isArray(user.sectorIds) ? user.sectorIds : [],
  };
}

export async function getAuthenticatedUser(request: Request) {
  const token = parseCookies(request)[sessionCookie];
  if (!token) return null;
  const [session] = await db.select().from(authSessionsTable)
    .where(and(eq(authSessionsTable.tokenHash, hashSessionToken(token)), gt(authSessionsTable.expiresAt, new Date())))
    .limit(1);
  if (!session) return null;
  const [user] = await db.select().from(authUsersTable).where(and(eq(authUsersTable.id, session.userId), eq(authUsersTable.status, "ACTIF"))).limit(1);
  return user ?? null;
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    response.status(401).json({ error: "Session MAXIMUS absente ou expirée." });
    return;
  }
  request.authUser = user;
  request.authActor = actorFromAuthUser(user);
  next();
}

export async function ensureDemoAuthUsers() {
  // Legacy compatibility hook. User accounts are created from the active database.
}

function canManageAuthAccount(actor: ControlActorContext, input: z.infer<typeof accountInput>) {
  if (actor.role === "maximus_admin") return true;
  if (!actor.companyId || actor.companyId !== input.companyId) return false;
  if (actor.role === "company_admin") return true;
  return actor.role === "sector_manager" && input.sectorIds.some(sectorId => actor.sectorIds.includes(sectorId));
}

router.post("/auth/login", async (request, response): Promise<void> => {
  const parsed = loginInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Adresse email ou mot de passe invalide." });
    return;
  }
  const [user] = await db.select().from(authUsersTable).where(and(eq(authUsersTable.email, parsed.data.email), eq(authUsersTable.status, "ACTIF"))).limit(1);
  if (!user || !passwordMatches(parsed.data.password, user.passwordHash)) {
    response.status(401).json({ error: "Email ou mot de passe incorrect." });
    return;
  }
  const token = randomBytes(32).toString("base64url");
  await db.insert(authSessionsTable).values({
    id: randomUUID(),
    tokenHash: hashSessionToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + sessionDurationMs),
  });
  setSessionCookie(response, token);
  response.json({ user: actorFromAuthUser(user) });
});

router.use("/auth/accounts", requireAuth);

router.post("/auth/accounts", async (request, response): Promise<void> => {
  const parsed = accountInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const actor = request.authActor;
  if (!actor || !canManageAuthAccount(actor, parsed.data)) {
    response.status(403).json({ error: "Provisionnement du compte hors périmètre autorisé." });
    return;
  }
  const [existing] = await db.select().from(authUsersTable).where(eq(authUsersTable.employeeId, parsed.data.employeeId)).limit(1);
  const now = new Date();
  const values = {
    id: parsed.data.id,
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    role: parsed.data.role,
    companyId: parsed.data.companyId,
    employeeId: parsed.data.employeeId,
    sectorIds: parsed.data.sectorIds,
    status: "ACTIF",
    updatedAt: now,
    ...(parsed.data.password ? { passwordHash: passwordHash(parsed.data.password) } : {}),
  };
  try {
    if (existing) {
      await db.update(authUsersTable).set(values).where(eq(authUsersTable.id, existing.id));
      if (parsed.data.password) {
        await db.delete(authSessionsTable).where(eq(authSessionsTable.userId, existing.id));
      }
    } else {
      if (!parsed.data.password) {
        response.status(400).json({ error: "Un mot de passe initial est requis pour ce compte." });
        return;
      }
      await db.insert(authUsersTable).values({ ...values, passwordHash: passwordHash(parsed.data.password), createdAt: now });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("auth_users_email_unique")) {
      response.status(409).json({ error: "Cette adresse email est déjà utilisée." });
      return;
    }
    throw error;
  }
  response.status(existing ? 200 : 201).json({ ok: true });
});

router.delete("/auth/accounts/:employeeId", async (request, response): Promise<void> => {
  const actor = request.authActor;
  if (!actor) {
    response.status(401).json({ error: "Session MAXIMUS absente ou expirée." });
    return;
  }
  const [user] = await db.select().from(authUsersTable).where(eq(authUsersTable.employeeId, request.params.employeeId)).limit(1);
  if (!user) {
    response.status(204).end();
    return;
  }
  const target = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    companyId: user.companyId ?? "",
    employeeId: user.employeeId ?? request.params.employeeId,
    sectorIds: Array.isArray(user.sectorIds) ? user.sectorIds : [],
    role: user.role as "sector_manager" | "employee",
  };
  if (!canManageAuthAccount(actor, target)) {
    response.status(403).json({ error: "Révocation du compte hors périmètre autorisé." });
    return;
  }
  await db.transaction(async tx => {
    await tx.update(authUsersTable).set({ status: "SUSPENDU", updatedAt: new Date() }).where(eq(authUsersTable.id, user.id));
    await tx.delete(authSessionsTable).where(eq(authSessionsTable.userId, user.id));
  });
  response.status(204).end();
});

router.get("/auth/session", async (request, response): Promise<void> => {
  const user = await getAuthenticatedUser(request);
  response.json({ user: user ? actorFromAuthUser(user) : null });
});

router.post("/auth/logout", async (request, response): Promise<void> => {
  const token = parseCookies(request)[sessionCookie];
  if (token) await db.delete(authSessionsTable).where(eq(authSessionsTable.tokenHash, hashSessionToken(token)));
  clearSessionCookie(response);
  response.status(204).end();
});

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUserRecord;
      authActor?: ControlActorContext;
    }
  }
}

export default router;