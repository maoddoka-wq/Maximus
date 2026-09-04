import { useState } from 'react';
import { Building2, Settings, Trash2 } from 'lucide-react';
import { useAppDialog } from '@/components/confirm-dialog';
import {
  demoEmployeeIds,
  uid,
  type Company,
  type Employee,
  type OrgNode,
  type Role,
  type StoreData,
} from '@/lib/store';
import { ActionButton, Field, Modal } from './organization-shared';

type Mutate = (fn: (data: StoreData) => void, message?: string) => void;

export function EmployeesTab({
  company,
  data,
  mutate,
  allowSectorAdmin = true,
}: {
  company: Company;
  data: StoreData;
  mutate: Mutate;
  allowSectorAdmin?: boolean;
}) {
  const { confirm } = useAppDialog();
  const companyEmployees = data.employees.filter(employee => employee.companyId === company.id);
  const companyNodes = data.orgNodes.filter(node => node.companyId === company.id);
  const companyRoles = data.roles.filter(role => role.companyId === company.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  return (
    <div className="card-surface overflow-hidden rounded-2xl fade-up">
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h2 className="text-lg font-bold">Comptes Employés</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Créez le compte, choisissez son appartenance et son rôle. Les permissions viennent du rôle configuré à l’étape 2.</p>
        </div>
        <ActionButton primary disabled={companyNodes.length === 0 || companyRoles.length === 0} onClick={() => { setEditingEmployee(null); setModalOpen(true); }} testId="btn-create-employee">Ajouter un employé</ActionButton>
      </div>
      {(companyNodes.length === 0 || companyRoles.length === 0) && <p className="m-6 rounded-lg bg-[hsl(var(--muted))] p-3 text-sm text-[hsl(var(--muted-foreground))]">Créez d’abord la structure, configurez les rôles et leurs autorisations, puis ajoutez les comptes employés.</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-[hsl(var(--muted)/.5)] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            <tr><th className="px-6 py-3 font-bold">Employé</th><th className="px-6 py-3 font-bold">Unité</th><th className="px-6 py-3 font-bold">Rôle Assigné</th><th className="px-6 py-3 text-right font-bold">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {companyEmployees.map(employee => {
              const sector = companyNodes.find(node => node.id === employee.sectorId);
              const role = companyRoles.find(item => item.id === employee.roleId);
              return (
                <tr key={employee.id} className="transition hover:bg-[hsl(var(--muted)/.3)]">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--accent)/.2)] text-xs font-black text-[hsl(var(--foreground))]">{employee.firstName[0]}{employee.lastName[0]}</span><div><p className="font-bold">{employee.firstName} {employee.lastName}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">{employee.email}</p></div></div></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 text-xs font-medium"><Building2 size={13} className="text-[hsl(var(--muted-foreground))]" />{sector?.name || 'Non assigné'}{employee.isSectorAdmin && <span className="ml-1 rounded-full bg-[hsl(var(--primary)/.12)] px-2 py-0.5 text-[9px] font-bold text-[hsl(var(--primary))]">Manager</span>}</span></td>
                  <td className="px-6 py-4 text-xs font-medium">{role?.name || 'Non assigné'}</td>
                  <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2">
                    <button type="button" data-testid={`button-edit-org-employee-${employee.id}`} aria-label={`Modifier le compte de ${employee.firstName} ${employee.lastName}`} onClick={() => { setEditingEmployee(employee); setModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><Settings size={13} /><span>Modifier</span></button>
                    {demoEmployeeIds.has(employee.id) ? <span className="inline-flex items-center rounded-lg border border-dashed px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">Compte démo protégé</span> : <button data-testid={`button-delete-org-employee-${employee.id}`} aria-label={`Supprimer le compte de ${employee.firstName} ${employee.lastName}`} onClick={() => void confirm({ title: 'Supprimer ce compte employé ?', description: `Le compte de ${employee.firstName} ${employee.lastName} sera supprimé.`, confirmLabel: 'Supprimer', tone: 'danger' }).then(ok => { if (ok) mutate(draft => { draft.employees = draft.employees.filter(item => item.id !== employee.id); }, 'Employé supprimé.'); })} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)]"><Trash2 size={13} /><span>Supprimer</span></button>}
                  </div></td>
                </tr>
              );
            })}
            {companyEmployees.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucun employé dans cette entreprise.</td></tr>}
          </tbody>
        </table>
      </div>
      {modalOpen && <Modal title={editingEmployee ? 'Modifier un employé' : 'Ajouter un employé'} onClose={() => setModalOpen(false)}>
        <EmployeeFormModal
          initialData={editingEmployee}
          allNodes={companyNodes}
          allRoles={companyRoles}
          allEmployees={companyEmployees}
          allowSectorAdmin={allowSectorAdmin}
          onClose={() => setModalOpen(false)}
          onSave={employeeData => {
            mutate(draft => {
              const sector = draft.orgNodes.find(node => node.id === employeeData.sectorId);
              const parent = sector?.parentId ? draft.orgNodes.find(node => node.id === sector.parentId) : null;
              const normalized = { ...employeeData, email: employeeData.email.trim().toLowerCase(), department: sector?.name ?? '', subDepartment: parent?.name ?? '' };
              if (editingEmployee) {
                const index = draft.employees.findIndex(employee => employee.id === editingEmployee.id);
                if (index !== -1) draft.employees[index] = { ...draft.employees[index], ...normalized };
              } else {
                draft.employees.push({ id: uid('emp'), companyId: company.id, status: 'ACTIF', ...normalized } as Employee);
              }
              const employeeId = editingEmployee?.id ?? draft.employees[draft.employees.length - 1]?.id;
              if (!employeeId) return;
              draft.orgNodes.forEach(node => {
                if (node.managerEmployeeId === employeeId && node.id !== employeeData.sectorId) node.managerEmployeeId = undefined;
              });
              if (employeeData.isSectorAdmin && sector) {
                draft.orgNodes.forEach(node => { if (node.id !== sector.id && node.managerEmployeeId === employeeId) node.managerEmployeeId = undefined; });
                sector.managerEmployeeId = employeeId;
              } else if (sector?.managerEmployeeId === employeeId) {
                sector.managerEmployeeId = undefined;
              }
            }, editingEmployee ? (employeeData.loginPassword ? 'Employé mis à jour et mot de passe actualisé.' : 'Employé mis à jour.') : 'Employé ajouté. Utilisez son email et son mot de passe initial pour la connexion.');
            setModalOpen(false);
          }}
        />
      </Modal>}
    </div>
  );
}

function EmployeeFormModal({
  initialData,
  allNodes,
  allRoles,
  allEmployees,
  allowSectorAdmin = true,
  onClose,
  onSave,
}: {
  initialData: Employee | null;
  allNodes: OrgNode[];
  allRoles: Role[];
  allEmployees: Employee[];
  allowSectorAdmin?: boolean;
  onClose: () => void;
  onSave: (data: Omit<Employee, 'id' | 'companyId' | 'status' | 'department' | 'subDepartment' | 'role'> & { role: string; loginPassword?: string }) => void;
}) {
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    position: initialData?.position || '',
    sectorId: initialData?.sectorId || (allNodes[0]?.id ?? ''),
    roleId: initialData?.roleId || '',
    isSectorAdmin: initialData?.isSectorAdmin ?? false,
    password: '',
    passwordConfirm: '',
  });
  const compatibleRoles = allRoles.filter(role => {
    let currentSectorId: string | null | undefined = formData.sectorId;
    while (currentSectorId) {
      if (role.sectorId === currentSectorId) return true;
      currentSectorId = allNodes.find(node => node.id === currentSectorId)?.parentId;
    }
    return false;
  });

  const handleSave = () => {
    const email = formData.email.trim().toLowerCase();
    const role = compatibleRoles.find(item => item.id === formData.roleId);
    if (!formData.firstName.trim() || !formData.lastName.trim() || !email || !formData.position.trim() || !formData.sectorId || !role) {
      setError('Prénom, nom, email, poste, appartenance et rôle compatible sont obligatoires.');
      return;
    }
    if (formData.isSectorAdmin && Object.keys(role.modulePermissions).length === 0) {
      setError('Un manager doit utiliser un rôle avec au moins une autorisation.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Saisissez une adresse email valide.');
      return;
    }
    if (allEmployees.some(employee => employee.id !== initialData?.id && employee.email.trim().toLowerCase() === email)) {
      setError('Cette adresse email est déjà utilisée dans l’entreprise.');
      return;
    }
    const password = formData.password.trim();
    if (!initialData && password.length < 8) {
      setError('Définissez un mot de passe initial d’au moins 8 caractères.');
      return;
    }
    if (password && password.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== formData.passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    onSave({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email,
      phone: formData.phone,
      position: formData.position.trim(),
      sectorId: formData.sectorId,
      roleId: formData.roleId,
      isSectorAdmin: formData.isSectorAdmin,
      role: role.name,
      ...(password ? { loginPassword: password } : {}),
    });
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-[hsl(var(--destructive)/.1)] p-3 text-sm font-semibold text-[hsl(var(--destructive))]">{error}</p>}
      <div className="grid grid-cols-2 gap-4"><Field label="Prénom *" value={formData.firstName} onChange={(value: string) => setFormData(current => ({ ...current, firstName: value }))} help="Prénom utilisé dans les listes et l’historique des actions." /><Field label="Nom *" value={formData.lastName} onChange={(value: string) => setFormData(current => ({ ...current, lastName: value }))} help="Nom de famille de l’employé." /></div>
      <div className="grid grid-cols-2 gap-4"><Field label="Email *" type="email" value={formData.email} onChange={(value: string) => setFormData(current => ({ ...current, email: value }))} help="Adresse utilisée par l’employé pour se connecter à son espace." /><Field label="Téléphone" value={formData.phone} onChange={(value: string) => setFormData(current => ({ ...current, phone: value }))} help="Numéro de contact professionnel de l’employé." /></div>
      <div className="grid grid-cols-2 gap-4"><Field label={initialData ? 'Nouveau mot de passe' : 'Mot de passe initial *'} type="password" value={formData.password} onChange={(value: string) => setFormData(current => ({ ...current, password: value }))} placeholder={initialData ? 'Laisser vide pour conserver' : 'Au moins 8 caractères'} testId="input-employee-password" help={initialData ? 'Laissez vide pour conserver le mot de passe actuel ; sinon utilisez au moins 8 caractères.' : 'Mot de passe utilisé par l’employé pour sa première connexion.'} /><Field label={initialData ? 'Confirmer le nouveau mot de passe' : 'Confirmer le mot de passe *'} type="password" value={formData.passwordConfirm} onChange={(value: string) => setFormData(current => ({ ...current, passwordConfirm: value }))} placeholder="Répétez le mot de passe" testId="input-employee-password-confirm" help="Saisissez exactement le même mot de passe pour confirmer." /></div>
      <p className="rounded-lg bg-[hsl(var(--muted))] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Le compte se connecte depuis « Espace KORA » avec cet email et ce mot de passe. Le mot de passe n’est pas affiché dans la liste des employés.</p>
      <Field label="Titre du poste" value={formData.position} onChange={(value: string) => setFormData(current => ({ ...current, position: value }))} placeholder="Ex: Développeur Senior" help="Intitulé professionnel visible dans les listes, distinct du rôle d’accès." />
      <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
        <label className="block text-sm font-semibold">Appartenance *
          <select value={formData.sectorId} onChange={event => setFormData(current => ({ ...current, sectorId: event.target.value, roleId: '' }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))]">{allNodes.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select>
          <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">Section, département ou service de rattachement. Elle détermine les rôles compatibles.</span>
        </label>
        <label className="block text-sm font-semibold">Rôle *
          <select value={formData.roleId} onChange={event => setFormData(current => ({ ...current, roleId: event.target.value }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))]"><option value="">Sélectionner un rôle...</option>{compatibleRoles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
          <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Rôles de l’unité sélectionnée et de ses unités parentes.</p>
        </label>
      </div>
      {allowSectorAdmin && <label className="mt-4 flex items-start gap-2 rounded-lg border p-3 text-xs font-semibold"><input type="checkbox" checked={formData.isSectorAdmin} onChange={event => setFormData(current => ({ ...current, isSectorAdmin: event.target.checked }))} className="mt-0.5" /><span><strong className="block">Manager de cette unité</strong><small className="font-normal text-[hsl(var(--muted-foreground))]">Ce compte pourra gérer les rôles, permissions et employés de son appartenance et de ses unités descendantes. Il sera aussi proposé comme manager dans la structure.</small></span></label>}
      <div className="mt-6 flex justify-end gap-3 border-t pt-4"><button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-bold hover:bg-[hsl(var(--muted))]">Annuler</button><ActionButton primary onClick={handleSave} disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.position || !formData.sectorId || !formData.roleId}>Enregistrer</ActionButton></div>
    </div>
  );
}