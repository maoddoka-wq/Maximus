import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  controlAuditEntriesTable,
  controlEventsTable,
  controlTasksTable,
  db,
} from "@workspace/db";

const router: IRouter = Router();
const taskStatuses = ["À FAIRE", "EN COURS", "VALIDÉ", "REFUSÉ", "TERMINÉ"] as const;
const taskPriorities = ["BASSE", "NORMALE", "HAUTE", "CRITIQUE"] as const;
const eventTypes = ["TASK_CREATED", "TASK_STATUS_CHANGED", "APPROVAL_GRANTED", "APPROVAL_REFUSED", "SYSTEM"] as const;
const severities = ["info", "success", "warning", "error"] as const;

const idOf = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const controlQuery = z.object({
  companyId: z.string().min(1).optional(),
  employeeId: z.string().min(1).optional(),
  sectorId: z.string().min(1).optional(),
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
  actorName: z.string().trim().min(1).max(180),
});

router.get("/control/bootstrap", async (req, res): Promise<void> => {
  const parsed = controlQuery.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { companyId, employeeId, sectorId, scope } = parsed.data;
  const taskFilters = companyId ? [eq(controlTasksTable.companyId, companyId)] : [];
  if (scope === "assigned" && employeeId) taskFilters.push(eq(controlTasksTable.assigneeEmployeeId, employeeId));
  if (scope === "sector" && sectorId) taskFilters.push(eq(controlTasksTable.sectorId, sectorId));
  const [tasks, events, auditEntries] = await Promise.all([
    taskFilters.length ? db.select().from(controlTasksTable).where(and(...taskFilters)).orderBy(desc(controlTasksTable.updatedAt)) : db.select().from(controlTasksTable).orderBy(desc(controlTasksTable.updatedAt)),
    companyId ? db.select().from(controlEventsTable).where(eq(controlEventsTable.companyId, companyId)).orderBy(desc(controlEventsTable.createdAt)).limit(200) : db.select().from(controlEventsTable).orderBy(desc(controlEventsTable.createdAt)).limit(200),
    companyId ? db.select().from(controlAuditEntriesTable).where(eq(controlAuditEntriesTable.companyId, companyId)).orderBy(desc(controlAuditEntriesTable.createdAt)).limit(200) : db.select().from(controlAuditEntriesTable).orderBy(desc(controlAuditEntriesTable.createdAt)).limit(200),
  ]);
  res.json({ tasks, events, auditEntries });
});

router.post("/control/tasks", async (req, res): Promise<void> => {
  const parsed = taskInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { id: requestedId, ...input } = parsed.data;
  const taskId = requestedId ?? idOf("task");
  const now = new Date();
  const task = {
    id: taskId,
    ...input,
    status: "À FAIRE" as const,
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction(async tx => {
    await tx.insert(controlTasksTable).values(task);
    await tx.insert(controlEventsTable).values({
      id: idOf("event"),
      type: "TASK_CREATED",
      label: "Tâche créée",
      summary: input.title,
      companyId: input.companyId,
      moduleId: input.moduleId,
      actorName: input.createdBy,
      entityType: "task",
      entityId: taskId,
      severity: "info",
      createdAt: now,
    });
    await tx.insert(controlAuditEntriesTable).values({
      id: idOf("audit"),
      action: "TÂCHE_CRÉÉE",
      summary: `${input.title} a été créée.`,
      companyId: input.companyId,
      moduleId: input.moduleId,
      actorName: input.createdBy,
      entityType: "task",
      entityId: taskId,
      createdAt: now,
    });
  });
  res.status(201).json(task);
});

router.patch("/control/tasks/:id/status", async (req, res): Promise<void> => {
  const parsed = statusInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const [before] = await db.select().from(controlTasksTable).where(and(eq(controlTasksTable.id, req.params.id), eq(controlTasksTable.companyId, parsed.data.companyId))).limit(1);
  if (!before) { res.status(404).json({ error: "Tâche introuvable" }); return; }
  const granted = parsed.data.status === "VALIDÉ" || parsed.data.status === "TERMINÉ";
  const refused = parsed.data.status === "REFUSÉ";
  const type = granted ? "APPROVAL_GRANTED" : refused ? "APPROVAL_REFUSED" : "TASK_STATUS_CHANGED";
  const label = granted ? "Validation accordée" : refused ? "Validation refusée" : "Tâche mise à jour";
  const now = new Date();
  const summary = `${before.title} · ${before.status} → ${parsed.data.status}`;
  const [task] = await db.transaction(async tx => {
    const updated = await tx.update(controlTasksTable)
      .set({ status: parsed.data.status, updatedAt: now })
      .where(and(eq(controlTasksTable.id, before.id), eq(controlTasksTable.companyId, parsed.data.companyId)))
      .returning();
    await tx.insert(controlEventsTable).values({
      id: idOf("event"),
      type,
      label,
      summary,
      companyId: before.companyId,
      moduleId: before.moduleId,
      actorName: parsed.data.actorName,
      entityType: "task",
      entityId: before.id,
      severity: refused ? "error" : granted ? "success" : "info",
      createdAt: now,
    });
    await tx.insert(controlAuditEntriesTable).values({
      id: idOf("audit"),
      action: `TÂCHE_${parsed.data.status.replaceAll(" ", "_")}`,
      summary: `${before.title} est passée de ${before.status} à ${parsed.data.status}.`,
      companyId: before.companyId,
      moduleId: before.moduleId,
      actorName: parsed.data.actorName,
      entityType: "task",
      entityId: before.id,
      createdAt: now,
    });
    return updated;
  });
  res.json(task);
});

export default router;