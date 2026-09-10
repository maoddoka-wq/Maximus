import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, CircleDot, FileCheck2, ListChecks, XCircle } from 'lucide-react';
import {
  getConfiguredModules,
  recordControlEvent,
  type ControlTask,
  type ControlTaskPriority,
  type ControlTaskStatus,
  type DomainEventType,
  type ModuleId,
  type OrgNode,
  type StoreData,
} from '@/lib/store';
import { controlApi, type ControlBootstrap } from '@/lib/control-api';
import { getCompanyControlScope } from '@/lib/control-routing';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { ControlTaskList } from '@/components/control-task-list';
import { ControlCreateTaskDialog, type CreateTaskForm } from '@/components/control-create-task-dialog';

function formatDate(value: string) {
  if (!value) return '—';
  if (value.includes('Aujourd’hui') || value.includes('Demain') || value.includes('juin')) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function EventIcon({ type }: { type: DomainEventType }) {
  if (type === 'APPROVAL_GRANTED') return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (type === 'APPROVAL_REFUSED') return <XCircle size={16} className="text-rose-600" />;
  if (type === 'TASK_STATUS_CHANGED') return <Activity size={16} className="text-blue-600" />;
  if (type === 'TASK_CREATED') return <ListChecks size={16} className="text-amber-600" />;
  return <CircleDot size={16} className="text-slate-500" />;
}

function mergeControlRecords<T extends { id: string; entityType: string; entityId?: string; summary: string }>(local: T[], remote: T[]) {
  const records = new Map<string, T>();
  [...local, ...remote].forEach(record => records.set(`${record.entityType}:${record.entityId ?? ''}:${record.summary}`, record));
  return [...records.values()];
}

function isDescendantOrSelf(nodes: OrgNode[], nodeId: string | undefined, rootId: string | undefined, companyId: string) {
  if (!nodeId || !rootId) return false;
  let node = nodes.find(candidate => candidate.id === nodeId && candidate.companyId === companyId);
  while (node) {
    if (node.id === rootId) return true;
    node = node.parentId
      ? nodes.find(candidate => candidate.id === node?.parentId && candidate.companyId === companyId)
      : undefined;
  }
  return false;
}

function initialForm(moduleId: ModuleId): CreateTaskForm {
  return { title: '', description: '', priority: 'NORMALE', moduleId, dueDate: '', sectorId: '' };
}

export function ControlCenterPage({
  data,
  companyId,
  isAdmin,
  companyAdmin,
  sectorManager,
  employeeId,
  scopeNodeId,
  actorName,
  mutate,
  notify,
}: {
  data: StoreData;
  companyId?: string;
  isAdmin: boolean;
  companyAdmin?: boolean;
  sectorManager?: boolean;
  employeeId?: string;
  scopeNodeId?: string;
  actorName?: string;
  mutate: (fn: (data: StoreData) => void, message?: string, persist?: boolean) => void;
  notify: (message: string) => void;
}) {
  const [serverSnapshot, setServerSnapshot] = useState<ControlBootstrap | null>(null);
  const [syncError, setSyncError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TOUS' | ControlTaskStatus>('TOUS');
  const [moduleFilter, setModuleFilter] = useState<'TOUS' | ModuleId>('TOUS');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [targetCompanyId, setTargetCompanyId] = useState(companyId ?? '');
  const [assigneeEmployeeId, setAssigneeEmployeeId] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState('');
  const configuredModules = getConfiguredModules(data);
  const [form, setForm] = useState<CreateTaskForm>(() => initialForm(configuredModules[0]?.id ?? 'commerce'));

  const companyControlScope = getCompanyControlScope({
    companyAdmin: Boolean(companyAdmin),
    sectorManager: Boolean(sectorManager),
  });
  const controlScope = isAdmin
    ? 'admin'
    : companyControlScope === 'company'
      ? 'all'
      : companyControlScope;
  const isWithinSectorScope = (taskSectorId?: string) =>
    isAdmin || !sectorManager || isDescendantOrSelf(data.orgNodes, taskSectorId, scopeNodeId, companyId ?? '');

  const refreshControl = async () => {
    try {
      const snapshot = await controlApi.bootstrap({ companyId: isAdmin ? undefined : companyId, scope: controlScope });
      setServerSnapshot(snapshot);
      setSyncError('');
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'La synchronisation de la coordination est indisponible.');
    }
  };

  useAutoRefresh(refreshControl, { enabled: true, intervalMs: 30_000 });
  useEffect(() => {
    void refreshControl();
    return undefined;
  }, [companyId, controlScope, employeeId, isAdmin]);

  const controlTasks = useMemo(() => {
    const byId = new Map(data.controlTasks.map(task => [task.id, task]));
    serverSnapshot?.tasks.forEach(task => byId.set(task.id, task));
    return [...byId.values()];
  }, [data.controlTasks, serverSnapshot?.tasks]);

  const accessibleTasks = useMemo(() => controlTasks.filter(task => {
    if (isAdmin) return true;
    if (task.companyId !== companyId || !isWithinSectorScope(task.sectorId)) return false;
    if (companyAdmin) return true;
    return sectorManager ? Boolean(task.sectorId) : task.assigneeEmployeeId === employeeId;
  }), [companyAdmin, companyId, controlTasks, employeeId, isAdmin, scopeNodeId, sectorManager, data.orgNodes]);

  const visibleTaskIds = new Set(accessibleTasks.map(task => task.id));
  const controlEvents = useMemo(
    () => mergeControlRecords(data.domainEvents, serverSnapshot?.events ?? []),
    [data.domainEvents, serverSnapshot?.events],
  );
  const controlAudit = useMemo(
    () => mergeControlRecords(data.auditEntries, serverSnapshot?.auditEntries ?? []),
    [data.auditEntries, serverSnapshot?.auditEntries],
  );
  const visibleEvents = controlEvents.filter(event =>
    isAdmin || (event.companyId === companyId && visibleTaskIds.has(event.entityId ?? '')),
  );
  const visibleAudit = controlAudit.filter(entry =>
    isAdmin || (entry.companyId === companyId && visibleTaskIds.has(entry.entityId ?? '')),
  );
  const filteredTasks = accessibleTasks.filter(task =>
    (statusFilter === 'TOUS' || task.status === statusFilter)
    && (moduleFilter === 'TOUS' || task.moduleId === moduleFilter),
  );

  const targetCompany = data.companies.find(company => company.id === targetCompanyId);
  const assignableEmployees = data.employees.filter(employee => {
    if (employee.status !== 'ACTIF' || employee.companyId !== targetCompanyId) return false;
    if (isAdmin || companyAdmin) return true;
    return isDescendantOrSelf(data.orgNodes, employee.sectorId, scopeNodeId, companyId ?? '');
  });
  const sectorOptions = data.orgNodes.filter(node =>
    node.companyId === targetCompanyId
    && (!sectorManager || isDescendantOrSelf(data.orgNodes, node.id, scopeNodeId, companyId ?? '')),
  );
  const canCreate = isAdmin || Boolean(companyAdmin) || Boolean(sectorManager);

  const updateTask = async (taskId: string, status: ControlTaskStatus) => {
    const task = accessibleTasks.find(candidate => candidate.id === taskId);
    if (!task || updatingTaskId) return;
    setUpdatingTaskId(taskId);
    try {
      const updated = await controlApi.updateTaskStatus(task, status);
      mutate(draft => {
        const localTask = draft.controlTasks.find(candidate => candidate.id === taskId);
        if (localTask) Object.assign(localTask, updated);
        else draft.controlTasks.unshift(updated);
      }, undefined, false);
      await refreshControl();
      notify(`Tâche « ${updated.title} » mise à jour.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'La mise à jour de la tâche a échoué.');
    } finally {
      setUpdatingTaskId('');
    }
  };

  const createTask = async () => {
    if (!targetCompanyId || !assigneeEmployeeId || !form.title.trim() || !form.description.trim()) return;
    const assignee = assignableEmployees.find(employee => employee.id === assigneeEmployeeId);
    if (!assignee) return;
    try {
      const created = await controlApi.createTask({
        companyId: targetCompanyId,
        sectorId: form.sectorId || undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        moduleId: form.moduleId,
        assigneeEmployeeId: assignee.id,
        assigneeName: `${assignee.firstName} ${assignee.lastName}`,
        createdBy: actorName ?? (isAdmin ? 'Équipe MAXIMUS' : 'Utilisateur actuel'),
        priority: form.priority as ControlTaskPriority,
        requiresApproval: false,
        dueDate: form.dueDate.trim() || undefined,
      });
      mutate(draft => {
        draft.controlTasks = [created, ...draft.controlTasks.filter(task => task.id !== created.id)];
        recordControlEvent(draft, {
          type: 'TASK_CREATED',
          label: 'Tâche créée',
          summary: `${created.title} a été affectée à ${created.assigneeName ?? 'un employé'}.`,
          actorName: created.createdBy,
          entityType: 'control_task',
          entityId: created.id,
          companyId: created.companyId,
          moduleId: created.moduleId,
          severity: 'info',
        });
      }, undefined, false);
      setShowCreateDialog(false);
      setForm(initialForm(configuredModules[0]?.id ?? 'commerce'));
      setAssigneeEmployeeId('');
      await refreshControl();
      notify('Tâche créée et tracée.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'La création de la tâche a échoué.');
    }
  };

  return (
    <div className="space-y-6 pb-10" data-testid="control-center">
      <section className="card-surface rounded-2xl border p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
              <ListChecks size={15} /> Coordination opérationnelle
            </div>
            <h3 className="mt-2 text-lg font-bold">Décisions et tâches à suivre</h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              {isAdmin ? 'Coordonnez les actions de toutes les entreprises.' : 'Suivez uniquement les actions de votre entreprise et de votre rôle.'}
            </p>
          </div>
          {canCreate && (
            <button type="button" onClick={() => setShowCreateDialog(true)} className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">
              Nouvelle tâche
            </button>
          )}
        </div>
      </section>

      {syncError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{syncError}</div>}

      <ControlTaskList
        tasks={filteredTasks}
        statusFilter={statusFilter}
        moduleFilter={moduleFilter}
        onStatusFilterChange={setStatusFilter}
        onModuleFilterChange={setModuleFilter}
        onUpdate={(taskId, status) => void updateTask(taskId, status)}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="card-surface rounded-2xl border">
          <div className="border-b p-5"><h3 className="text-base font-bold">Flux d’événements</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Les décisions et changements liés à votre périmètre.</p></div>
          <div className="divide-y">
            {visibleEvents.slice(0, 8).map(event => (
              <div key={event.id} className="flex gap-3 p-4">
                <div className="mt-0.5 rounded-full bg-[hsl(var(--muted))] p-2"><EventIcon type={event.type} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{event.label}</p><span className="shrink-0 text-[10px] text-[hsl(var(--muted-foreground))]">{formatDate(event.createdAt)}</span></div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{event.summary}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">{event.actorName}</p>
                </div>
              </div>
            ))}
            {visibleEvents.length === 0 && <div className="p-6 text-sm text-[hsl(var(--muted-foreground))]">Aucun événement récent.</div>}
          </div>
        </div>
        <div className="card-surface rounded-2xl border">
          <div className="border-b p-5"><h3 className="text-base font-bold">Journal de coordination</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Les changements restent attribués et consultables.</p></div>
          <div className="divide-y">
            {visibleAudit.slice(0, 8).map(entry => (
              <div key={entry.id} className="flex items-start gap-3 p-4">
                <div className="mt-0.5 text-[hsl(var(--primary))]"><FileCheck2 size={16} /></div>
                <div><p className="text-xs font-bold">{entry.action.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{entry.summary}</p><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{entry.actorName} · {formatDate(entry.createdAt)}</p></div>
              </div>
            ))}
            {visibleAudit.length === 0 && <div className="p-6 text-sm text-[hsl(var(--muted-foreground))]">Aucune trace disponible.</div>}
          </div>
        </div>
      </section>

      {showCreateDialog && (
        <ControlCreateTaskDialog
          isAdmin={isAdmin}
          companies={data.companies}
          assignableEmployees={assignableEmployees}
          sectorOptions={sectorOptions}
          sectorRequired={Boolean(sectorManager)}
          targetCompanyId={targetCompanyId}
          setTargetCompanyId={value => { setTargetCompanyId(value); setAssigneeEmployeeId(''); }}
          sectorId={form.sectorId}
          setSectorId={value => setForm(current => ({ ...current, sectorId: value }))}
          assigneeEmployeeId={assigneeEmployeeId}
          setAssigneeEmployeeId={setAssigneeEmployeeId}
          form={form}
          setForm={setForm}
          onClose={() => setShowCreateDialog(false)}
          onSubmit={() => void createTask()}
        />
      )}
    </div>
  );
}