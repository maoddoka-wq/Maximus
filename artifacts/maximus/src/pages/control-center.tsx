import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileCheck2,
  Filter,
  ListChecks,
  Plus,
  ShieldAlert,
  UserRound,
  Workflow,
  XCircle,
} from 'lucide-react';
import {
  addNotification,
  modules,
  uid,
  type ControlTask,
  type ControlTaskPriority,
  type ControlTaskStatus,
  type DomainEventType,
  type ModuleId,
  type StoreData,
} from '@/lib/store';

type Mutate = (fn: (draft: StoreData) => void, message?: string) => void;

const taskStatuses: ControlTaskStatus[] = ['À FAIRE', 'EN COURS', 'VALIDÉ', 'REFUSÉ', 'TERMINÉ'];
const priorities: ControlTaskPriority[] = ['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'];

const statusClasses: Record<ControlTaskStatus, string> = {
  'À FAIRE': 'bg-slate-100 text-slate-700',
  'EN COURS': 'bg-blue-100 text-blue-700',
  VALIDÉ: 'bg-emerald-100 text-emerald-700',
  REFUSÉ: 'bg-rose-100 text-rose-700',
  TERMINÉ: 'bg-violet-100 text-violet-700',
};

const priorityClasses: Record<ControlTaskPriority, string> = {
  BASSE: 'text-slate-500',
  NORMALE: 'text-blue-600',
  HAUTE: 'text-amber-600',
  CRITIQUE: 'text-rose-600',
};

function formatDate(value: string) {
  if (!value) return '—';
  if (value.includes('Aujourd’hui') || value.includes('Demain') || value.includes('juin')) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function StatusPill({ status }: { status: ControlTaskStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses[status]}`}>{status}</span>;
}

function EventIcon({ type }: { type: DomainEventType }) {
  if (type === 'APPROVAL_GRANTED') return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (type === 'APPROVAL_REFUSED') return <XCircle size={16} className="text-rose-600" />;
  if (type === 'TASK_STATUS_CHANGED') return <Activity size={16} className="text-blue-600" />;
  if (type === 'TASK_CREATED') return <ListChecks size={16} className="text-amber-600" />;
  return <CircleDot size={16} className="text-slate-500" />;
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
  const canCreateTask = isAdmin || Boolean(companyAdmin) || Boolean(sectorManager);
  const isWithinSectorScope = (taskSectorId?: string) => {
    if (!sectorManager || !scopeNodeId || !taskSectorId) return false;
    let node = data.orgNodes.find(candidate => candidate.id === taskSectorId && candidate.companyId === companyId);
    while (node) {
      if (node.id === scopeNodeId) return true;
      node = node.parentId ? data.orgNodes.find(candidate => candidate.id === node?.parentId && candidate.companyId === companyId) : undefined;
    }
    return false;
  };

  const accessibleTasks = useMemo(() => data.controlTasks.filter(task => {
    const inScope = isAdmin || (task.companyId === companyId && (
      canSeeAll
      || task.assigneeEmployeeId === employeeId
      || isWithinSectorScope(task.sectorId)
    ));
    return inScope;
  }), [canSeeAll, companyId, data.controlTasks, employeeId, isAdmin, scopeNodeId, sectorManager]);
  const visibleTasks = useMemo(() => accessibleTasks.filter(task => {
    const matchesStatus = statusFilter === 'TOUS' || task.status === statusFilter;
    const matchesModule = moduleFilter === 'TOUS' || task.moduleId === moduleFilter;
    return matchesStatus && matchesModule;
  }), [accessibleTasks, moduleFilter, statusFilter]);

  const scopeTasks = accessibleTasks;
  const scopeTaskIds = new Set(accessibleTasks.map(task => task.id));
  const visibleEvents = data.domainEvents.filter(event => isAdmin || event.companyId === companyId && (canSeeAll || scopeTaskIds.has(event.entityId ?? '')));
  const visibleAudit = data.auditEntries.filter(entry => isAdmin || entry.companyId === companyId && (canSeeAll || scopeTaskIds.has(entry.entityId ?? '')));
  const pendingCount = scopeTasks.filter(task => task.status === 'À FAIRE' || task.status === 'EN COURS').length;
  const approvalCount = scopeTasks.filter(task => task.requiresApproval && task.status === 'À FAIRE').length;
  const criticalCount = scopeTasks.filter(task => task.priority === 'CRITIQUE' && task.status !== 'TERMINÉ' && task.status !== 'VALIDÉ').length;

  const updateTask = (taskId: string, nextStatus: ControlTaskStatus) => {
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

  const createTask = () => {
    if (!canCreateTask || !newTask.title.trim()) return;
    mutate(draft => {
      const id = uid('task');
      const now = new Date().toISOString();
      const task: ControlTask = {
        id,
        title: newTask.title.trim(),
        description: newTask.description.trim() || 'Tâche créée depuis le centre de contrôle.',
        companyId: isAdmin ? undefined : companyId,
        sectorId: sectorManager ? scopeNodeId : undefined,
        moduleId: newTask.moduleId,
        createdBy: actorName,
        status: 'À FAIRE',
        priority: newTask.priority,
        requiresApproval: true,
        dueDate: newTask.dueDate.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
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
    }, 'La tâche a été créée et ajoutée au circuit de contrôle.');
    setNewTask({ title: '', description: '', priority: 'NORMALE', moduleId: 'stocks', dueDate: '' });
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
        <div className="card-surface rounded-2xl border">
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-base font-bold">File de coordination</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Les actions qui attendent une décision ou une exécution.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={14} className="text-[hsl(var(--muted-foreground))]" />
              <select aria-label="Filtrer les tâches par statut" value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-lg border bg-[hsl(var(--card))] px-2 py-2 text-xs">
                <option value="TOUS">Tous les statuts</option>
                {taskStatuses.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
              <select aria-label="Filtrer les tâches par module" value={moduleFilter} onChange={event => setModuleFilter(event.target.value as typeof moduleFilter)} className="rounded-lg border bg-[hsl(var(--card))] px-2 py-2 text-xs">
                <option value="TOUS">Tous les modules</option>
                {modules.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}
              </select>
            </div>
          </div>
          <div className="divide-y">
            {visibleTasks.length === 0 ? <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune tâche dans ce périmètre.</div> : visibleTasks.map(task => (
              <article key={task.id} className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h4 className="font-bold">{task.title}</h4><StatusPill status={task.status} /></div>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{task.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[hsl(var(--muted-foreground))]">
                      <span className={`font-bold ${priorityClasses[task.priority]}`}>Priorité {task.priority.toLowerCase()}</span>
                      <span className="flex items-center gap-1"><UserRound size={13} /> {task.assigneeName || 'À affecter'}</span>
                      <span>Échéance : {task.dueDate || 'non définie'}</span>
                      {task.relatedObject && <span className="font-semibold">Réf. {task.relatedObject}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {task.status === 'À FAIRE' && <button type="button" onClick={() => updateTask(task.id, task.requiresApproval ? 'VALIDÉ' : 'EN COURS')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">{task.requiresApproval ? 'Valider' : 'Démarrer'}</button>}
                    {task.status === 'À FAIRE' && task.requiresApproval && <button type="button" onClick={() => updateTask(task.id, 'REFUSÉ')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">Refuser</button>}
                    {task.status === 'EN COURS' && <button type="button" onClick={() => updateTask(task.id, 'TERMINÉ')} className="rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">Terminer</button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="card-surface w-full max-w-lg rounded-2xl border p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between"><div><h3 className="text-lg font-bold">Créer une tâche de coordination</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">La création sera enregistrée dans les événements et l’audit.</p></div><button type="button" onClick={() => setShowCreate(false)} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]"><XCircle size={19} /></button></div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold">Titre<input autoFocus value={newTask.title} onChange={event => setNewTask(current => ({ ...current, title: event.target.value }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm" placeholder="Ex. Valider la demande d’achat" /></label>
              <label className="block text-sm font-semibold">Description<textarea value={newTask.description} onChange={event => setNewTask(current => ({ ...current, description: event.target.value }))} className="mt-2 min-h-24 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm" placeholder="Décrivez la décision ou l’action attendue." /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Module<select value={newTask.moduleId} onChange={event => setNewTask(current => ({ ...current, moduleId: event.target.value as ModuleId }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm">{modules.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}</select></label>
                <label className="block text-sm font-semibold">Priorité<select value={newTask.priority} onChange={event => setNewTask(current => ({ ...current, priority: event.target.value as ControlTaskPriority }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm">{priorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></label>
              </div>
              <label className="block text-sm font-semibold">Échéance<input value={newTask.dueDate} onChange={event => setNewTask(current => ({ ...current, dueDate: event.target.value }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm" placeholder="Ex. Demain ou 25 juin" /></label>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler</button><button type="button" disabled={!newTask.title.trim()} onClick={createTask} className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50"><ArrowRight size={15} /> Créer et tracer</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}