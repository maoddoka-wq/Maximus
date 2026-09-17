import { Filter, UserRound } from 'lucide-react';
import { modules, type ControlTask, type ControlTaskStatus, type ModuleId } from '@/lib/store';

const taskStatuses: ControlTaskStatus[] = ['À FAIRE', 'EN COURS', 'VALIDÉ', 'REFUSÉ', 'TERMINÉ'];
const statusClasses: Record<ControlTaskStatus, string> = {
  'À FAIRE': 'bg-slate-100 text-slate-700',
  'EN COURS': 'bg-blue-100 text-blue-700',
  VALIDÉ: 'bg-emerald-100 text-emerald-700',
  REFUSÉ: 'bg-rose-100 text-rose-700',
  TERMINÉ: 'bg-violet-100 text-violet-700',
};
const priorityClasses: Record<ControlTask['priority'], string> = {
  BASSE: 'text-slate-500',
  NORMALE: 'text-blue-600',
  HAUTE: 'text-amber-600',
  CRITIQUE: 'text-rose-600',
};

function StatusPill({ status }: { status: ControlTaskStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses[status]}`}>{status}</span>;
}

export function ControlTaskList({
  tasks,
  statusFilter,
  moduleFilter,
  onStatusFilterChange,
  onModuleFilterChange,
  onUpdate,
}: {
  tasks: ControlTask[];
  statusFilter: 'TOUS' | ControlTaskStatus;
  moduleFilter: 'TOUS' | ModuleId;
  onStatusFilterChange: (value: 'TOUS' | ControlTaskStatus) => void;
  onModuleFilterChange: (value: 'TOUS' | ModuleId) => void;
  onUpdate: (taskId: string, status: ControlTaskStatus) => void;
}) {
  return <div className="card-surface rounded-2xl border">
    <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><h3 className="text-base font-bold">File de coordination</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Les actions qui attendent une décision ou une exécution.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-[hsl(var(--muted-foreground))]" />
        <select aria-label="Filtrer les tâches par statut" value={statusFilter} onChange={event => onStatusFilterChange(event.target.value as 'TOUS' | ControlTaskStatus)} className="rounded-lg border bg-[hsl(var(--card))] px-2 py-2 text-xs">
          <option value="TOUS">Tous les statuts</option>
          {taskStatuses.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <select aria-label="Filtrer les tâches par module" value={moduleFilter} onChange={event => onModuleFilterChange(event.target.value as 'TOUS' | ModuleId)} className="rounded-lg border bg-[hsl(var(--card))] px-2 py-2 text-xs">
          <option value="TOUS">Tous les modules</option>
          {modules.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}
        </select>
      </div>
    </div>
    <div className="divide-y">
      {tasks.length === 0 ? <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune tâche dans ce périmètre.</div> : tasks.map(task => (
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
              {task.status === 'À FAIRE' && <button type="button" onClick={() => onUpdate(task.id, task.requiresApproval ? 'VALIDÉ' : 'EN COURS')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">{task.requiresApproval ? 'Valider' : 'Démarrer'}</button>}
              {task.status === 'À FAIRE' && task.requiresApproval && <button type="button" onClick={() => onUpdate(task.id, 'REFUSÉ')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">Refuser</button>}
              {task.status === 'EN COURS' && <button type="button" onClick={() => onUpdate(task.id, 'TERMINÉ')} className="rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">Terminer</button>}
            </div>
          </div>
        </article>
      ))}
    </div>
  </div>;
}