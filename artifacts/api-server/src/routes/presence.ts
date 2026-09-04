import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, presenceItemsTable } from "@workspace/db";

const router: IRouter = Router();
const itemTypes = ["attendance", "absence", "schedule", "planning", "mission", "leave", "holiday", "settings", "history"] as const;
const itemStatuses = ["ACTIF", "EN ATTENTE", "APPROUVÉE", "REFUSÉE", "BROUILLON", "VALIDÉE", "ARCHIVÉE"] as const;
const itemInput = z.object({
  companyId: z.string().min(1),
  type: z.enum(itemTypes),
  employeeId: z.string().nullable().optional(),
  workDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(itemStatuses).default("ACTIF"),
  payload: z.record(z.string(), z.unknown()).default({}),
  actor: z.string().default("Utilisateur MAXIMUS"),
});
const clockInput = z.object({
  companyId: z.string().min(1),
  employeeId: z.string().min(1),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  action: z.enum(["arrival", "exit", "pauseStart", "pauseEnd"]),
  actor: z.string().default("Utilisateur MAXIMUS"),
  now: z.string().datetime().optional(),
  expectedStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  tolerance: z.coerce.number().int().nonnegative().default(10),
});
const idOf = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const companyOf = (req: any) => typeof req.query.companyId === "string" ? req.query.companyId : typeof req.body?.companyId === "string" ? req.body.companyId : "";
const minutes = (value: string) => { const [hours, mins] = value.split(":").map(Number); return hours * 60 + mins; };

async function writeHistory(companyId: string, actor: string, action: string, payload: Record<string, unknown>) {
  await db.insert(presenceItemsTable).values({
    id: idOf("presence-history"), companyId, type: "history", status: "ACTIF",
    payload: { action, ...payload }, createdBy: actor, updatedBy: actor,
  });
}

router.get("/presence/bootstrap", async (req, res): Promise<void> => {
  const companyId = companyOf(req);
  if (!companyId) { res.status(400).json({ error: "companyId requis" }); return; }
  const items = await db.select().from(presenceItemsTable).where(eq(presenceItemsTable.companyId, companyId)).orderBy(desc(presenceItemsTable.updatedAt), asc(presenceItemsTable.workDate));
  res.json({ items });
});

router.post("/presence/items", async (req, res): Promise<void> => {
  const parsed = itemInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { actor, ...input } = parsed.data;
  const item = { id: idOf(`presence-${input.type}`), ...input, createdBy: actor, updatedBy: actor, createdAt: new Date(), updatedAt: new Date() };
  await db.insert(presenceItemsTable).values(item);
  await writeHistory(input.companyId, actor, `${input.type}.create`, { itemId: item.id, newValue: input.payload, employeeId: input.employeeId, workDate: input.workDate });
  res.status(201).json(item);
});

router.patch("/presence/items/:id", async (req, res): Promise<void> => {
  const parsed = itemInput.partial().extend({ actor: z.string().default("Utilisateur MAXIMUS") }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const companyId = companyOf(req);
  const [before] = await db.select().from(presenceItemsTable).where(and(eq(presenceItemsTable.id, req.params.id), eq(presenceItemsTable.companyId, companyId))).limit(1);
  if (!before) { res.status(404).json({ error: "Enregistrement introuvable" }); return; }
  const { actor, companyId: _companyId, ...changes } = parsed.data;
  const [item] = await db.update(presenceItemsTable).set({ ...changes, updatedBy: actor, updatedAt: new Date() }).where(and(eq(presenceItemsTable.id, req.params.id), eq(presenceItemsTable.companyId, companyId))).returning();
  await writeHistory(companyId, actor, `${before.type}.update`, { itemId: before.id, oldValue: before.payload, newValue: item?.payload ?? changes.payload, employeeId: before.employeeId, workDate: before.workDate });
  res.json(item);
});

router.delete("/presence/items/:id", async (req, res): Promise<void> => {
  const companyId = companyOf(req);
  const actor = typeof req.body?.actor === "string" ? req.body.actor : "Utilisateur MAXIMUS";
  const [before] = await db.select().from(presenceItemsTable).where(and(eq(presenceItemsTable.id, req.params.id), eq(presenceItemsTable.companyId, companyId))).limit(1);
  if (!before) { res.status(404).json({ error: "Enregistrement introuvable" }); return; }
  await db.delete(presenceItemsTable).where(and(eq(presenceItemsTable.id, req.params.id), eq(presenceItemsTable.companyId, companyId)));
  await writeHistory(companyId, actor, `${before.type}.delete`, { itemId: before.id, oldValue: before.payload, employeeId: before.employeeId, workDate: before.workDate });
  res.json({ ok: true });
});

router.post("/presence/clock", async (req, res): Promise<void> => {
  const parsed = clockInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { companyId, employeeId, workDate, action, actor, now, expectedStart, tolerance } = parsed.data;
  const current = await db.select().from(presenceItemsTable).where(and(eq(presenceItemsTable.companyId, companyId), eq(presenceItemsTable.type, "attendance"), eq(presenceItemsTable.employeeId, employeeId), eq(presenceItemsTable.workDate, workDate))).orderBy(desc(presenceItemsTable.updatedAt)).limit(1);
  const item = current[0];
  const payload = { ...(item?.payload ?? {}) } as Record<string, unknown>;
  const time = now ? new Date(now) : new Date();
  const clockTime = time.toISOString().slice(11, 16);
  if (action === "arrival" && payload.arrival) { res.status(409).json({ error: "Arrivée déjà enregistrée pour cette journée." }); return; }
  if (action === "exit" && (!payload.arrival || payload.exit)) { res.status(409).json({ error: payload.exit ? "Sortie déjà enregistrée pour cette journée." : "Pointez d’abord l’arrivée." }); return; }
  if (action === "pauseStart" && (!payload.arrival || payload.exit || payload.pauseStart)) { res.status(409).json({ error: payload.pauseStart ? "Pause déjà commencée." : "Action de pause incohérente." }); return; }
  if (action === "pauseEnd" && (!payload.pauseStart || payload.pauseEnd)) { res.status(409).json({ error: payload.pauseEnd ? "Pause déjà terminée." : "Commencez d’abord une pause." }); return; }
  if (action === "arrival") { payload.arrival = clockTime; payload.lateMinutes = expectedStart ? Math.max(0, minutes(clockTime) - minutes(expectedStart) - tolerance) : 0; payload.status = "Présent"; }
  if (action === "exit") { payload.exit = clockTime; payload.status = "Présent"; }
  if (action === "pauseStart") { payload.pauseStart = clockTime; payload.status = "En pause"; }
  if (action === "pauseEnd") { payload.pauseEnd = clockTime; payload.status = "Présent"; payload.pauseMinutes = payload.pauseStart ? Math.max(0, minutes(clockTime) - minutes(String(payload.pauseStart))) : 0; }
  const saved = item
    ? (await db.update(presenceItemsTable).set({ payload, status: "ACTIF", updatedBy: actor, updatedAt: new Date() }).where(eq(presenceItemsTable.id, item.id)).returning())[0]
    : (await db.insert(presenceItemsTable).values({ id: idOf("presence-attendance"), companyId, type: "attendance", employeeId, workDate, status: "ACTIF", payload, createdBy: actor, updatedBy: actor }).returning())[0];
  await writeHistory(companyId, actor, `clock.${action}`, { itemId: saved.id, newValue: { [action]: clockTime }, employeeId, workDate });
  res.status(item ? 200 : 201).json(saved);
});

export default router;