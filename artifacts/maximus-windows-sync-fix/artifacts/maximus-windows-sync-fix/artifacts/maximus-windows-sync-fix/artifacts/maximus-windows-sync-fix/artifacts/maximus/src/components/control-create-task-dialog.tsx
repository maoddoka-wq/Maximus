import { ArrowRight, XCircle } from 'lucide-react';
import { modules, type Company, type ControlTaskPriority, type Employee, type ModuleId, type OrgNode } from '@/lib/store';

export type CreateTaskForm = {
  title: string;
  description: string;
  priority: ControlTaskPriority;
  moduleId: ModuleId;
  dueDate: string;
  sectorId: string;
};

export function ControlCreateTaskDialog({
  isAdmin,
  companies,
  assignableEmployees,
  sectorOptions,
  sectorRequired,
  targetCompanyId,
  setTargetCompanyId,
  sectorId,
  setSectorId,
  assigneeEmployeeId,
  setAssigneeEmployeeId,
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  isAdmin: boolean;
  companies: Company[];
  assignableEmployees: Employee[];
  sectorOptions: OrgNode[];
  sectorRequired: boolean;
  targetCompanyId: string;
  setTargetCompanyId: (value: string) => void;
  sectorId: string;
  setSectorId: (value: string) => void;
  assigneeEmployeeId: string;
  setAssigneeEmployeeId: (value: string) => void;
  form: CreateTaskForm;
  setForm: (updater: (current: CreateTaskForm) => CreateTaskForm) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
    <div className="card-surface w-full max-w-lg rounded-2xl border p-6 shadow-2xl">
      <div className="mb-5 flex items-start justify-between"><div><h3 className="text-lg font-bold">Créer une tâche de coordination</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">La création sera enregistrée dans les événements et l’audit.</p></div><button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]"><XCircle size={19} /></button></div>
      <div className="space-y-4">
        {isAdmin && <label className="block text-sm font-semibold">Entreprise cible<select value={targetCompanyId} onChange={event => { setTargetCompanyId(event.target.value); setAssigneeEmployeeId(''); }} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm"><option value="">Sélectionner une entreprise</option>{companies.filter(company => company.status === 'ACTIF').map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>}
         {sectorOptions.length > 0 && <label className="block text-sm font-semibold">Secteur ou unité{sectorRequired && <span className="ml-1 text-rose-600">*</span>}<select value={sectorId} onChange={event => setSectorId(event.target.value)} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm"><option value="">Toute l’entreprise</option>{sectorOptions.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>}
        <label className="block text-sm font-semibold">Affecter à un employé<select value={assigneeEmployeeId} onChange={event => setAssigneeEmployeeId(event.target.value)} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm"><option value="">Sélectionner un employé</option>{assignableEmployees.map(employee => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.position}</option>)}</select><span className="mt-1 block text-[10px] font-normal text-[hsl(var(--muted-foreground))]">L’employé affecté retrouvera cette tâche dans son espace.</span></label>
        <label className="block text-sm font-semibold">Titre<input autoFocus value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm" placeholder="Ex. Valider la demande d’achat" /></label>
        <label className="block text-sm font-semibold">Description<textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} className="mt-2 min-h-24 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm" placeholder="Décrivez la décision ou l’action attendue." /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Module<select value={form.moduleId} onChange={event => setForm(current => ({ ...current, moduleId: event.target.value as ModuleId }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm">{modules.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}</select></label>
          <label className="block text-sm font-semibold">Priorité<select value={form.priority} onChange={event => setForm(current => ({ ...current, priority: event.target.value as ControlTaskPriority }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm">{['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'].map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></label>
        </div>
        <label className="block text-sm font-semibold">Échéance<input value={form.dueDate} onChange={event => setForm(current => ({ ...current, dueDate: event.target.value }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm" placeholder="Ex. Demain ou 25 juin" /></label>
         <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler</button><button type="button" disabled={!form.title.trim() || !targetCompanyId || !assigneeEmployeeId || (sectorRequired && !sectorId)} onClick={onSubmit} className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50"><ArrowRight size={15} /> Créer et tracer</button></div>
      </div>
    </div>
  </div>;
}