import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileCheck2,
  ListChecks,
  Plus,
  ShieldAlert,
  Workflow,
  XCircle,
} from 'lucide-react';
import {
  addNotification,
  uid,
  type ControlTask,
  type ControlTaskPriority,
  type ControlTaskStatus,
  type DomainEventType,
  type ModuleId,
  type StoreData,
} from '@/lib/store';
import { controlApi, type ControlActorContext, type ControlBootstrap } from '@/lib/control-api';
import { ControlCreateTaskDialog, type CreateTaskForm } from '@/components/control-create-task-dialog';
import { ControlTaskList } from '@/components/control-task-list';

type Mutate = (fn: (draft: StoreData) => void, message?: string) => void;

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

export function ControlCenterPage({
  data,
  mutate,
  companyId,
  isAdmin,
  companyAdmin,
  sectorManager,
  employeeId,
  scopeNodeId,
  actorName,
}: {
  data: StoreData;
  mutate: Mutate;
  companyId?: string;
  isAdmin: boolean;
  companyAdmin?: boolean;
  sectorManager?: boolean;
  employeeId?: string;
  scopeNodeId?: string;
  actorName: string;
}) {
  const canSeeAll = isAdmin || Boolean(companyAdmin);
  const [statusFilter, setStatusFilter] = useState<'TOUS' | ControlTaskStatus>('TOUS');
  const [moduleFilter, setModuleFilter] = useState<'TOUS' | ModuleId>('TOUS');
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'NORMALE' as ControlTaskPriority,
    moduleId: 'stocks' as ModuleId,
    dueDate: '',
  });
  const [targetCompanyId, setTargetCompanyId] = useState(companyId ?? data.companies.find(company => company.status === 'ACTIF')?.id ?? '');
  const [assigneeEmployeeId, setAssigneeEmployeeId] = useState('');
  const [serverSnapshot, setServerSnapshot] = useState<ControlBootstrap | null>(null);
  const [syncError, setSyncError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);
  const canCreateTask = isAdmin || Boolean(companyAdmin) || Boolean(sectorManager);
  const controlScope = isAdmin ? 'admin' : companyAdmin ? 'all' : sectorManager ? 'all' : 'assigned';
  const isWithinSectorScope = (taskSectorId?: string) => {
    if (!sectorManager || !scopeNodeId || !taskSectorId) return false;
    let node = data.orgNodes.find(candidate => candidate.id === taskSectorId && candidate.companyId === companyId);
    while (node) {
      if (node.id === scopeNodeId) return true;
      node = node.parentId ? data.orgNodes.find(candidate => candidate.id === node?.parentId && candidate.companyId === companyId) : undefined;
    }
    return false;
  };
  const actorSectorIds = useMemo(() => sectorManager
    ? data.orgNodes.filter(node => node.companyId === companyId && isWithinSectorScope(node.id)).map(node => node.id)
    : [], [companyId, data.orgNodes, scopeNodeId, sectorManager]);
  const actorContext: ControlActorContext = {
    role: isAdmin ? 'maximus_admin' : companyAdmin ? 'company_admin' : sectorManager ? 'sector_manager' : 'employee',
    displayName: actorName,
    companyId: isAdmin ? undefined : companyId,
    employeeId,
    sectorIds: actorSectorIds,
  };

  useEffect(() => {
    let active = true;
    setSyncing(true);
    controlApi.bootstrap({ companyId: isAdmin ? undefined : companyId, scope: controlScope, actorContext })
      .then(snapshot => { if (active) { setServerSnapshot(snapshot); setSyncError(''); } })
      .catch(error => { if (active) setSyncError(error instanceof Error ? error.message : 'Mode local actif.'); })
      .finally(() => { if (active) setSyncing(false); });
    return () => { active = false; };
  }, [companyId, controlScope, employeeId, isAdmin, actorContext.displayName, actorContext.role, actorContext.companyId, actorContext.employeeId, actorContext.sectorIds.join(','), syncVersion]);

  const controlTasks = useMemo(() => {
    const byId = new Map(data.controlTasks.map(task => [task.id, task]));
    serverSnapshot?.tasks.forEach(task => byId.set(task.id, task));
    return [...byId.values()];
  }, [data.controlTasks, serverSnapshot?.tasks]);
  const controlEvents = useMemo(() => mergeControlRecords(data.domainEvents, serverSnapshot?.events ?? []), [data.domainEvents, serverSnapshot?.events]);
  const controlAudit = useMemo(() => mergeControlRecords(data.auditEntries, serverSnapshot?.auditEntries ?? []), [data.auditEntries, serverSnapshot?.auditEntries]);

  const accessibleTasks = useMemo(() => controlTasks.filter(task => {
    const inScope = isAdmin || (task.companyId === companyId && (
      canSeeAll
      || task.assigneeEmployeeId === employeeId
      || isWithinSectorScope(task.sectorId)
    ));
    return inScope;
  }), [canSeeAll, companyId, controlTasks, employeeId, isAdmin, scopeNodeId, sectorManager]);
  const visibleTasks = useMemo(() => accessibleTasks.filter(task => {
    const matchesStatus = statusFilter === 'TOUS' || task.status === statusFilter;
    const matchesModule = moduleFilter === 'TOUS' || task.moduleId === moduleFilter;
    return matchesStatus && matchesModule;
  }), [accessibleTasks, moduleFilter, statusFilter]);

  const scopeTasks = accessibleTasks;
  const scopeTaskIds = new Set(accessibleTasks.map(task => task.id));
  const visibleEvents = controlEvents.filter(event => isAdmin || event.companyId === companyId && (canSeeAll || scopeTaskIds.has(event.entityId ?? '')));
  const visibleAudit = controlAudit.filter(entry => isAdmin || entry.companyId === companyId && (canSeeAll || scopeTaskIds.has(entry.entityId ?? '')));
  const assignableEmployees = useMemo(() => data.employees.filter(employee => {
    if (employee.companyId !== targetCompanyId) return false;
    if (!sectorManager) return true;
    return isWithinSectorScope(employee.sectorId);
  }), [data.employees, sectorManager, targetCompanyId, scopeNodeId]);
  const selectedAssignee = assignableEmployees.find(employee => employee.id === assigneeEmployeeId);
  const pendingCount = scopeTasks.filter(task => task.status === 'À FAIRE' || task.status === 'EN COURS').length;
  const approvalCount = scopeTasks.filter(task => task.requiresApproval && task.status === 'À FAIRE').length;
  const criticalCount = scopeTasks.filter(task => task.priority === 'CRITIQUE' && task.status !== 'TERMINÉ' && task.status !== 'VALIDÉ').length;

  const applyLocalTaskStatus = (taskId: string, nextStatus: ControlTaskStatus) => {
    mutate(draft => {
      const task = draft.controlTasks.find(item => item.id === taskId);
      if (!task) return;
      const previousStatus = task.status;
      task.status = nextStatus;
      task.updatedAt = new Date().toISOString();
      const granted = nextStatus === 'VALIDÉ' || nextStatus === 'TERMINÉ';
      const refused = nextStatus === 'REFUSÉ';
      const eventType: DomainEventType = granted ? 'APPROVAL_GRANTED' : refused ? 'APPROVAL_REFUSED' : 'TASK_STATUS_CHANGED';
      const eventLabel = granted ? 'Validation accordée' : refused ? 'Validation refusée' : 'Tâche mise à jour';
      const eventId = uid('event');
      draft.domainEvents.unshift({
        id: eventId,
        type: eventType,
        label: eventLabel,
        summary: `${task.title} · ${previousStatus} → ${nextStatus}`,
        companyId: task.companyId,
        moduleId: task.moduleId,
        actorName,
        entityType: 'task',
        entityId: task.id,
        severity: refused ? 'error' : granted ? 'success' : 'info',
        createdAt: new Date().toISOString(),
      });
      draft.auditEntries.unshift({
        id: uid('audit'),
        action: `TÂCHE_${nextStatus.replaceAll(' ', '_')}`,
        summary: `${task.title} est passée de ${previousStatus} à ${nextStatus}.`,
        companyId: task.companyId,
        moduleId: task.moduleId,
        actorName,
        entityType: 'task',
        entityId: task.id,
        createdAt: new Date().toISOString(),
      });
      addNotification(draft, {
        title: eventLabel,
        text: task.title,
        companyId: task.companyId,
        audience: task.companyId ? 'company' : 'admin',
        module: task.moduleId,
        severity: refused ? 'error' : granted ? 'success' : 'info',
        href: task.companyId ? '/kora/controle' : '/maximus/controle',
      });
    }, 'La tâche et son audit ont été mis à jour.');
  };

  const updateTask = (taskId: string, nextStatus: ControlTaskStatus) => {
    const persistedTask = serverSnapshot?.tasks.find(item => item.id === taskId);
    if (persistedTask) {
      void controlApi.updateTaskStatus(persistedTask, nextStatus, actorContext)
        .then(() => {
          setSyncError('');
          setSyncVersion(version => version + 1);
        })
        .catch(error => {
          applyLocalTaskStatus(taskId, nextStatus);
          setSyncError(error instanceof Error ? `${error.message} Repli local activé.` : 'La mise à jour serveur a échoué. Repli local activé.');
        });
      return;
    }
    applyLocalTaskStatus(taskId, nextStatus);
  };

  const createTask = () => {
    const destinationCompanyId = isAdmin ? targetCompanyId : companyId;
    if (!canCreateTask || !newTask.title.trim() || !destinationCompanyId || !selectedAssignee) return;
    const id = uid('task');
    const now = new Date().toISOString();
    const task: ControlTask = {
        id,
        title: newTask.title.trim(),
        description: newTask.description.trim() || 'Tâche créée depuis le centre de contrôle.',
        companyId: destinationCompanyId,
        sectorId: selectedAssignee.sectorId ?? (sectorManager ? scopeNodeId : undefined),
        moduleId: newTask.moduleId,
        assigneeEmployeeId: selectedAssignee.id,
        assigneeName: `${selectedAssignee.firstName} ${selectedAssignee.lastName}`,
        createdBy: actorName,
        status: 'À FAIRE',
        priority: newTask.priority,
        requiresApproval: true,
        dueDate: newTask.dueDate.trim() || undefined,
        createdAt: now,
        updatedAt: now,
    };
    void controlApi.createTask(task, actorContext)
      .then(() => {
        setSyncError('');
        setSyncVersion(version => version + 1);
      })
      .catch(error => {
        mutate(draft => {
          draft.controlTasks.unshift(task);
          draft.domainEvents.unshift({
            id: uid('event'),
            type: 'TASK_CREATED',
            label: 'Tâche créée',
            summary: task.title,
            companyId: task.companyId,
            moduleId: task.moduleId,
            actorName,
            entityType: 'task',
            entityId: task.id,
            severity: 'info',
            createdAt: now,
          });
          draft.auditEntries.unshift({
            id: uid('audit'),
            action: 'TÂCHE_CRÉÉE',
            summary: `${task.title} a été créée.`,
            companyId: task.companyId,
            moduleId: task.moduleId,
            actorName,
            entityType: 'task',
            entityId: task.id,
            createdAt: now,
          });
          addNotification(draft, {
            title: 'Nouvelle tâche affectée',
            text: task.title,
            companyId: task.companyId,
            audience: 'company',
            module: task.moduleId,
            severity: task.priority === 'CRITIQUE' || task.priority === 'HAUTE' ? 'warning' : 'info',
            href: '/kora/controle',
          });
        }, 'La tâche a été créée localement et sera resynchronisée.');
        setSyncError(error instanceof Error ? `${error.message} Repli local activé.` : 'La tâche reste enregistrée localement.');
      });
    setNewTask({ title: '', description: '', priority: 'NORMALE', moduleId: 'stocks', dueDate: '' });
    setAssigneeEmployeeId('');
    setShowCreate(false);
  };

  return (
    <div className="space-y-6 pb-10" data-testid="control-center">
      <section className="card-surface overflow-hidden rounded-2xl border">
        <div className="flex flex-col gap-4 bg-[hsl(var(--sidebar))] p-6 text-[hsl(var(--sidebar-foreground))] md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--accent))]"><Workflow size={15} /> Couche de contrôle</div>
            <h2 className="text-2xl font-bold">Tâches, décisions et événements au même endroit.</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">Coordonnez les actions qui traversent les modules et conservez une trace de chaque décision.</p>
            <p className="mt-3 text-[11px] font-semibold text-white/55">{syncing ? 'Synchronisation serveur…' : syncError ? syncError : 'Données synchronisées avec le serveur'}</p>
          </div>
          {canCreateTask && <button type="button" onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"><Plus size={16} /> Créer une tâche</button>}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'À traiter', value: pendingCount, icon: Clock3, color: 'text-amber-600', detail: 'tâches ouvertes' },
          { label: 'Approbations', value: approvalCount, icon: FileCheck2, color: 'text-blue-600', detail: 'décisions attendues' },
          { label: 'Critiques', value: criticalCount, icon: ShieldAlert, color: 'text-rose-600', detail: 'à surveiller' },
          { label: 'Événements', value: visibleEvents.length, icon: Activity, color: 'text-emerald-600', detail: 'dans le périmètre' },
        ].map(item => (
          <div key={item.label} className="card-surface rounded-2xl border p-5">
            <div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{item.label}</span><item.icon size={18} className={item.color} /></div>
            <div className="mt-3 text-3xl font-bold">{item.value}</div>
            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <ControlTaskList
          tasks={visibleTasks}
          statusFilter={statusFilter}
          moduleFilter={moduleFilter}
          onStatusFilterChange={setStatusFilter}
          onModuleFilterChange={setModuleFilter}
          onUpdate={updateTask}
        />

        <div className="space-y-6">
          <div className="card-surface rounded-2xl border">
            <div className="border-b p-5"><h3 className="text-base font-bold">Flux d’événements</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Les signaux produits par les opérations métier.</p></div>
            <div className="divide-y">
              {visibleEvents.slice(0, 6).map(event => <div key={event.id} className="flex gap-3 p-4"><div className="mt-0.5 rounded-full bg-[hsl(var(--muted))] p-2"><EventIcon type={event.type} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{event.label}</p><span className="shrink-0 text-[10px] text-[hsl(var(--muted-foreground))]">{formatDate(event.createdAt)}</span></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{event.summary}</p><p className="mt-1 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">{event.actorName}</p></div></div>)}
              {visibleEvents.length === 0 && <div className="p-6 text-sm text-[hsl(var(--muted-foreground))]">Aucun événement récent.</div>}
            </div>
          </div>
          <div className="card-surface rounded-2xl border">
            <div className="border-b p-5"><h3 className="text-base font-bold">Journal de contrôle</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Les décisions restent attribuées et consultables.</p></div>
            <div className="divide-y">
              {visibleAudit.slice(0, 5).map(entry => <div key={entry.id} className="flex items-start gap-3 p-4"><div className="mt-0.5 text-[hsl(var(--primary))]"><FileCheck2 size={16} /></div><div><p className="text-xs font-bold">{entry.action.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{entry.summary}</p><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{entry.actorName} · {formatDate(entry.createdAt)}</p></div></div>)}
              {visibleAudit.length === 0 && <div className="p-6 text-sm text-[hsl(var(--muted-foreground))]">Aucune trace disponible.</div>}
            </div>
            {visibleAudit.length > 5 && <div className="border-t p-4 text-center text-xs font-bold text-[hsl(var(--primary))]">+ {visibleAudit.length - 5} autres traces</div>}
          </div>
        </div>
      </section>

      {showCreate && canCreateTask && (
        <ControlCreateTaskDialog
          isAdmin={isAdmin}
          companies={data.companies}
          assignableEmployees={assignableEmployees}
          targetCompanyId={targetCompanyId}
          setTargetCompanyId={value => { setTargetCompanyId(value); setAssigneeEmployeeId(''); }}
          assigneeEmployeeId={assigneeEmployeeId}
          setAssigneeEmployeeId={setAssigneeEmployeeId}
          form={newTask}
          setForm={setNewTask}
          onClose={() => setShowCreate(false)}
          onSubmit={createTask}
        />
      )}
    </div>
  );
}