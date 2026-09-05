import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  controlAuditEntriesTable,
  controlEventsTable,
  controlTasksTable,
  db,
} from "@workspace/db";
import {
  canCreateControlTask,
  canReadControlScope,
  canUpdateControlTask,
  isValidControlActor,
} from "./control-authorization";
import { buildTaskCreatedTrace, buildTaskStatusTrace } from "./control-trace";
import { requireAuth } from "./auth";

const router: IRouter = Router();
const taskStatuses = ["À FAIRE", "EN COURS", "VALIDÉ", "REFUSÉ", "TERMINÉ"] as const;
const taskPriorities = ["BASSE", "NORMALE", "HAUTE", "CRITIQUE"] as const;
const idOf = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const controlQuery = z.object({
  companyId: z.string().min(1).optional(),
  scope: z.enum(["admin", "all", "assigned", "sector"]).default("all"),
}).refine(value => value.scope === "admin" || Boolean(value.companyId), {
  message: "companyId requis pour ce périmètre",
  path: ["companyId"],
});
const taskInput = z.object({
  id: z.string().min(1).optional(),
  companyId: z.string().min(1),
  sectorId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(4000),
  moduleId: z.string().min(1).nullable().optional(),
  assigneeEmployeeId: z.string().min(1).nullable().optional(),
  assigneeName: z.string().trim().min(1).nullable().optional(),
  createdBy: z.string().trim().min(1).max(180),
  priority: z.enum(taskPriorities).default("NORMALE"),
  requiresApproval: z.boolean().default(false),
  dueDate: z.string().trim().max(80).nullable().optional(),
  relatedObject: z.string().trim().max(180).nullable().optional(),
});
const statusInput = z.object({
  companyId: z.string().min(1),
  status: z.enum(taskStatuses),
});

router.use("/control", requireAuth);

router.get("/control/bootstrap", async (req, res): Promise<void> => {
  const parsed = controlQuery.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const actor = req.authActor;
  if (!actor) { res.status(401).json({ error: "Session MAXIMUS absente ou expirée." }); return; }
  if (!isValidControlActor(actor) || !canReadControlScope(actor, parsed.data.companyId)) { res.status(403).json({ error: "Périmètre de contrôle non autorisé." }); return; }
  const taskFilters = parsed.data.companyId ? [eq(controlTasksTable.companyId, parsed.data.companyId)] : [];
  if (actor.role === "employee" && actor.employeeId) taskFilters.push(eq(controlTasksTable.assigneeEmployeeId, actor.employeeId));
  if (actor.role === "sector_manager") taskFilters.push(actor.sectorIds.length ? inArray(controlTasksTable.sectorId, actor.sectorIds) : eq(controlTasksTable.sectorId, "__no_sector__"));
  const tasks = taskFilters.length
    ? await db.select().from(controlTasksTable).where(and(...taskFilters)).orderBy(desc(controlTasksTable.updatedAt))
    : await db.select().from(controlTasksTable).orderBy(desc(controlTasksTable.updatedAt));
  const taskIds = new Set(tasks.map(task => task.id));
  const [events, auditEntries] = await Promise.all([
    parsed.data.companyId ? db.select().from(controlEventsTable).where(eq(controlEventsTable.companyId, parsed.data.companyId)).orderBy(desc(controlEventsTable.createdAt)).limit(200) : db.select().from(controlEventsTable).orderBy(desc(controlEventsTable.createdAt)).limit(200),
    parsed.data.companyId ? db.select().from(controlAuditEntriesTable).where(eq(controlAuditEntriesTable.companyId, parsed.data.companyId)).orderBy(desc(controlAuditEntriesTable.createdAt)).limit(200) : db.select().from(controlAuditEntriesTable).orderBy(desc(controlAuditEntriesTable.createdAt)).limit(200),
  ]);
  const scopedToTasks = actor.role === "maximus_admin" || actor.role === "company_admin"
    ? (items: Array<{ entityId: string | null }>) => items
    : (items: Array<{ entityId: string | null }>) => items.filter(item => item.entityId && taskIds.has(item.entityId));
  res.json({ tasks, events: scopedToTasks(events), auditEntries: scopedToTasks(auditEntries) });
});

router.post("/control/tasks", async (req, res): Promise<void> => {
  const parsed = taskInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const actor = req.authActor;
  if (!actor) { res.status(401).json({ error: "Session MAXIMUS absente ou expirée." }); return; }
  const { id: requestedId, ...input } = parsed.data;
  if (!canCreateControlTask(actor, input)) { res.status(403).json({ error: "Création hors périmètre autorisé." }); return; }
  const taskId = requestedId ?? idOf("task");
  const now = new Date();
  const task = {
    id: taskId,
    ...input,
    createdBy: actor.displayName,
    status: "À FAIRE" as const,
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction(async tx => {
    await tx.insert(controlTasksTable).values(task);
    const trace = buildTaskCreatedTrace(input, taskId, actor, now);
    await tx.insert(controlEventsTable).values(trace.event);
    await tx.insert(controlAuditEntriesTable).values(trace.audit);
  });
  res.status(201).json(task);
});

router.patch("/control/tasks/:id/status", async (req, res): Promise<void> => {
  const parsed = statusInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const actor = req.authActor;
  if (!actor) { res.status(401).json({ error: "Session MAXIMUS absente ou expirée." }); return; }
  const { companyId, status } = parsed.data;
  const [before] = await db.select().from(controlTasksTable).where(eq(controlTasksTable.id, req.params.id)).limit(1);
  if (!before) { res.status(404).json({ error: "Tâche introuvable" }); return; }
  if (before.companyId !== companyId || !canUpdateControlTask(actor, before)) { res.status(403).json({ error: "Modification hors périmètre autorisé." }); return; }
  const now = new Date();
  const trace = buildTaskStatusTrace(before, status, actor, now);
  const [task] = await db.transaction(async tx => {
    const updated = await tx.update(controlTasksTable)
      .set({ status, updatedAt: now })
      .where(and(eq(controlTasksTable.id, before.id), eq(controlTasksTable.companyId, companyId)))
      .returning();
    await tx.insert(controlEventsTable).values(trace.event);
    await tx.insert(controlAuditEntriesTable).values(trace.audit);
    return updated;
  });
  res.json(task);
});

export default router;