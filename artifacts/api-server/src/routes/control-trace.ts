type TraceInput = {
  title: string;
  companyId: string;
  moduleId?: string | null;
};

type TraceActor = {
  displayName: string;
};

type TraceTask = TraceInput & {
  id: string;
  status: string;
};

export function buildTaskCreatedTrace(input: TraceInput, taskId: string, actor: TraceActor, createdAt: Date) {
  return {
    event: {
      id: `event-${crypto.randomUUID()}`,
      type: "TASK_CREATED" as const,
      label: "Tâche créée",
      summary: input.title,
      companyId: input.companyId,
      moduleId: input.moduleId ?? null,
      actorName: actor.displayName,
      entityType: "task",
      entityId: taskId,
      severity: "info" as const,
      createdAt,
    },
    audit: {
      id: `audit-${crypto.randomUUID()}`,
      action: "TÂCHE_CRÉÉE",
      summary: `${input.title} a été créée.`,
      companyId: input.companyId,
      moduleId: input.moduleId ?? null,
      actorName: actor.displayName,
      entityType: "task",
      entityId: taskId,
      createdAt,
    },
  };
}

export function buildTaskStatusTrace(task: TraceTask, nextStatus: string, actor: TraceActor, changedAt: Date) {
  const granted = nextStatus === "VALIDÉ" || nextStatus === "TERMINÉ";
  const refused = nextStatus === "REFUSÉ";
  const type = granted ? "APPROVAL_GRANTED" : refused ? "APPROVAL_REFUSED" : "TASK_STATUS_CHANGED";
  const label = granted ? "Validation accordée" : refused ? "Validation refusée" : "Tâche mise à jour";

  return {
    event: {
      id: `event-${crypto.randomUUID()}`,
      type,
      label,
      summary: `${task.title} · ${task.status} → ${nextStatus}`,
      companyId: task.companyId,
      moduleId: task.moduleId ?? null,
      actorName: actor.displayName,
      entityType: "task",
      entityId: task.id,
      severity: refused ? "error" as const : granted ? "success" as const : "info" as const,
      createdAt: changedAt,
    },
    audit: {
      id: `audit-${crypto.randomUUID()}`,
      action: `TÂCHE_${nextStatus.replaceAll(" ", "_")}`,
      summary: `${task.title} est passée de ${task.status} à ${nextStatus}.`,
      companyId: task.companyId,
      moduleId: task.moduleId ?? null,
      actorName: actor.displayName,
      entityType: "task",
      entityId: task.id,
      createdAt: changedAt,
    },
  };
}