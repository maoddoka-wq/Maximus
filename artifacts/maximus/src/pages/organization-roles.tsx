import { useState } from 'react';
import { Building2, Settings, Trash2 } from 'lucide-react';
import { useAppDialog } from '@/components/confirm-dialog';
import {
  commerceTabDefinitions,
  commerceTabPermissionKey,
  commerceTabPermissionKeys,
  type CommerceTabId,
} from '@/lib/commerce-permissions';
import { permissionFeatureKey } from '@/lib/permission-keys';
import {
  getConfiguredModules,
  stockSubmodules,
  uid,
  type Company,
  type Module,
  type ModuleId,
  type OrgNode,
  type Role,
  type StoreData,
} from '@/lib/store';
import { ActionButton, Field, Modal, permissionLabel } from './organization-shared';

type Mutate = (fn: (data: StoreData) => void, message?: string) => void;

export function RolesTab({
  company,
  data,
  mutate,
}: {
  company: Company;
  data: StoreData;
  mutate: Mutate;
}) {
  const { alert } = useAppDialog();
  const companyRoles = data.roles.filter(role => role.companyId === company.id);
  const companyNodes = data.orgNodes.filter(node => node.companyId === company.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const deleteRole = async (role: Role) => {
    if (data.employees.some(employee => employee.roleId === role.id) || company.managerRoleId === role.id) {
      await alert({
        title: 'Suppression impossible',
        description: 'Ce rôle est encore affecté à un employé ou au manager de l’entreprise.',
        confirmLabel: 'Compris',
        tone: 'danger',
      });
      return;
    }
    mutate(draft => {
      draft.roles = draft.roles.filter(item => item.id !== role.id);
    }, 'Rôle supprimé.');
  };

  return (
    <div className="card-surface rounded-2xl p-6 fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Rôles & sous-autorisations</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Étape 2 · Retrouvez les unités créées à l’étape 1, créez leurs rôles et choisissez précisément les modules, menus et actions visibles par chaque employé.</p>
        </div>
        <ActionButton className="shrink-0 self-start" primary disabled={companyNodes.length === 0} onClick={() => { setEditingRole(null); setModalOpen(true); }} testId="btn-create-role">Créer un rôle</ActionButton>
      </div>
      {companyNodes.length === 0 && <p className="mb-6 rounded-lg bg-[hsl(var(--muted))] p-3 text-sm text-[hsl(var(--muted-foreground))]">Créez d’abord au moins une unité dans l’onglet Structure & Unités.</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companyRoles.map(role => {
          const sector = companyNodes.find(node => node.id === role.sectorId);
          const assignedEmployees = data.employees.filter(employee => employee.roleId === role.id);
          return (
            <div key={role.id} className="flex flex-col rounded-xl border p-4 transition hover:border-[hsl(var(--primary)/.3)]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{role.name}</h3>
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]"><Building2 size={10} /> {sector?.name || 'Unité non affectée'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" data-testid={`button-edit-org-role-${role.id}`} aria-label={`Modifier le rôle ${role.name}`} onClick={() => { setEditingRole(role); setModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold hover:bg-[hsl(var(--muted))]"><Settings size={13} /><span>Modifier</span></button>
                  <button data-testid={`button-delete-org-role-${role.id}`} aria-label={`Supprimer le rôle ${role.name}`} onClick={() => deleteRole(role)} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)]"><Trash2 size={13} /><span>Supprimer</span></button>
                </div>
              </div>
              <p className="mt-3 flex-1 text-xs text-[hsl(var(--muted-foreground))]">{role.description}</p>
              {(company.managerRoleId === role.id || assignedEmployees.length > 0) && <div className="mt-3 border-t pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Affectations</p><p className="mt-1 text-xs font-semibold">{company.managerRoleId === role.id ? `Manager : ${company.manager}` : ''}{company.managerRoleId === role.id && assignedEmployees.length > 0 ? ' · ' : ''}{assignedEmployees.map(employee => `${employee.firstName} ${employee.lastName}`).join(', ')}</p></div>}
              <div className="mt-4 border-t pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{Object.keys(role.modulePermissions).length} autorisation{Object.keys(role.modulePermissions).length > 1 ? 's' : ''} configurée{Object.keys(role.modulePermissions).length > 1 ? 's' : ''}</p>
                <div className="flex flex-wrap gap-1.5">{Object.keys(role.modulePermissions).map(moduleId => <span key={moduleId} className="rounded border px-1.5 py-0.5 text-[10px] font-medium">{permissionLabel(moduleId, getConfiguredModules(data))}</span>)}</div>
              </div>
            </div>
          );
        })}
        {companyRoles.length === 0 && <div className="col-span-full py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucun rôle configuré.</div>}
      </div>
      {modalOpen && <Modal title={editingRole ? 'Modifier le rôle' : 'Créer un rôle'} onClose={() => setModalOpen(false)}>
        <RoleFormModal
          company={company}
          initialData={editingRole}
          allNodes={companyNodes}
          allRoles={companyRoles}
          moduleDefinitions={getConfiguredModules(data)}
          sectorLocked={Boolean(editingRole && (data.employees.some(employee => employee.roleId === editingRole.id) || company.managerRoleId === editingRole.id))}
          onClose={() => setModalOpen(false)}
          onSave={roleData => {
            mutate(draft => {
              if (editingRole) {
                const index = draft.roles.findIndex(role => role.id === editingRole.id);
                if (index !== -1) draft.roles[index] = { ...draft.roles[index], ...roleData };
                draft.employees.filter(employee => employee.roleId === editingRole.id).forEach(employee => { employee.role = roleData.name; });
              } else {
                draft.roles.push({ id: uid('role'), companyId: company.id, ...roleData });
              }
            }, editingRole ? 'Rôle mis à jour.' : 'Rôle créé.');
            setModalOpen(false);
          }}
        />
      </Modal>}
    </div>
  );
}

function RoleFormModal({
  company,
  initialData,
  allNodes,
  allRoles,
  moduleDefinitions,
  sectorLocked,
  onClose,
  onSave,
}: {
  company: Company;
  initialData: Role | null;
  allNodes: OrgNode[];
  allRoles: Role[];
  moduleDefinitions: Module[];
  sectorLocked: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; sectorId: string; modulePermissions: Record<string, string[]> }) => void;
}) {
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    sectorId: initialData?.sectorId || (allNodes[0]?.id ?? ''),
    modulePermissions: initialData?.modulePermissions || {},
  });
  const selectedNode = allNodes.find(node => node.id === formData.sectorId);
  const companyModules = moduleDefinitions.filter(module => company.allowedModules.includes(module.id));
  const availableModules = companyModules.filter(module => selectedNode?.moduleIds === undefined || selectedNode.moduleIds.includes(module.id));

  const togglePermission = (moduleId: string, permission: 'voir' | 'créer' | 'modifier') => {
    setFormData(previous => {
      const permissions = previous.modulePermissions[moduleId] || [];
      const nextPermissions = permissions.includes(permission) ? permissions.filter(value => value !== permission) : [...permissions, permission];
      const modulePermissions = { ...previous.modulePermissions };
      if (nextPermissions.length === 0) delete modulePermissions[moduleId];
      else modulePermissions[moduleId] = nextPermissions;
      if (permission === 'voir' && nextPermissions.length === 0) {
        Object.keys(modulePermissions).filter(key => key.startsWith(`${moduleId}:menu:`)).forEach(key => delete modulePermissions[key]);
      }
      return { ...previous, modulePermissions };
    });
  };

  const toggleFeaturePermission = (moduleId: ModuleId, feature: string, permission: 'voir' | 'créer' | 'modifier') => {
    const key = permissionFeatureKey(moduleId, feature);
    setFormData(previous => {
      const permissionKeys = moduleId === 'commerce' ? commerceTabPermissionKeys(feature as CommerceTabId) : [key];
      const current = [...new Set(permissionKeys.flatMap(permissionKey => previous.modulePermissions[permissionKey] || []))];
      const next = current.includes(permission) ? current.filter(value => value !== permission) : [...current, permission];
      const modulePermissions = { ...previous.modulePermissions };
      permissionKeys.forEach(permissionKey => delete modulePermissions[permissionKey]);
      if (next.length) modulePermissions[key] = next;
      else delete modulePermissions[key];
      if (next.length && !modulePermissions[moduleId]?.includes('voir')) modulePermissions[moduleId] = [...(modulePermissions[moduleId] || []), 'voir'];
      return { ...previous, modulePermissions };
    });
  };

  const togglePresencePermission = (permission: string) => {
    setFormData(previous => {
      const key = `presence.${permission}`;
      const modulePermissions = { ...previous.modulePermissions };
      if (modulePermissions[key]?.length) delete modulePermissions[key];
      else modulePermissions[key] = ['autorisé'];
      return { ...previous, modulePermissions };
    });
  };

  const handleSave = () => {
    const name = formData.name.trim();
    if (!name || !formData.sectorId) {
      setError('Le nom et le secteur du rôle sont obligatoires.');
      return;
    }
    if (allRoles.some(role => role.id !== initialData?.id && role.sectorId === formData.sectorId && role.name.trim().toLowerCase() === name.toLowerCase())) {
      setError('Un rôle portant ce nom existe déjà dans ce secteur.');
      return;
    }
    onSave({ ...formData, name });
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-[hsl(var(--destructive)/.1)] p-3 text-sm font-semibold text-[hsl(var(--destructive))]">{error}</p>}
      <Field label="Nom du rôle *" value={formData.name} onChange={(value: string) => setFormData(current => ({ ...current, name: value }))} help="Nom affiché lors de l’affectation d’un rôle à un employé." />
      <Field label="Description" value={formData.description} onChange={(value: string) => setFormData(current => ({ ...current, description: value }))} help="Expliquez les responsabilités principales associées à ce rôle." />
      <label className="mt-4 block text-sm font-semibold">Unité d’appartenance *
        <select disabled={sectorLocked} value={formData.sectorId} onChange={event => setFormData(current => ({ ...current, sectorId: event.target.value, modulePermissions: {} }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))] disabled:opacity-60">
          {allNodes.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}
        </select>
        <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">Seuls les modules autorisés pour cette unité sont proposés. Le rôle limite ensuite précisément l’accès de ses employés.</span>
        {sectorLocked && <span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">Réaffectez d’abord les employés utilisant ce rôle pour changer son unité.</span>}
      </label>
      <div className="mt-4 border-t pt-4">
        <label className="mb-3 block text-sm font-semibold">Permissions par module, sous-menu et action</label>
        <p className="mb-3 text-[10px] text-[hsl(var(--muted-foreground))]">Cochez d’abord « Voir » sur un module, puis choisissez ses sous-autorisations. Par exemple, un magasinier peut accéder à Articles et Entrées, tandis qu’un caissier ne voit que son espace de vente.</p>
        <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {availableModules.map(module => {
            const permissions = formData.modulePermissions[module.id] || [];
            const features = module.id === 'commerce' ? commerceTabDefinitions : module.features.map(feature => ({ id: feature, label: feature }));
            return (
              <div key={module.id} className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="text-sm font-bold">{module.name}</p><p className="text-[10px] text-[hsl(var(--muted-foreground))]">{module.description}</p></div>
                  <div className="flex items-center gap-2">{(['voir', 'créer', 'modifier'] as const).map(permission => <label key={permission} className={`cursor-pointer rounded px-2 py-1 text-[10px] font-bold transition ${permissions.includes(permission) ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted-foreground)/.2)]'}`}><input type="checkbox" className="hidden" checked={permissions.includes(permission)} onChange={() => togglePermission(module.id, permission)} />{permission.charAt(0).toUpperCase() + permission.slice(1)}</label>)}</div>
                </div>
                {module.id !== 'stocks' && module.id !== 'presences' && <div className="ml-3 rounded-lg border border-dashed p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Permissions dans les menus de {module.name}</p><p className="mb-3 text-[10px] text-[hsl(var(--muted-foreground))]">Ces droits détaillent les fonctionnalités visibles et les actions possibles dans ce module.</p><div className="space-y-2">{features.map(feature => { const menuKey = module.id === 'commerce' ? commerceTabPermissionKey(feature.id as CommerceTabId) : permissionFeatureKey(module.id, feature.id); const featurePermissions = module.id === 'commerce' ? [...new Set(commerceTabPermissionKeys(feature.id as CommerceTabId).flatMap(permissionKey => formData.modulePermissions[permissionKey] || []))] : formData.modulePermissions[menuKey] || []; return <div key={menuKey} className="flex flex-col gap-2 rounded-md bg-[hsl(var(--muted)/.45)] px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between"><span className="text-[10px] font-semibold">{feature.label}</span><div className="flex gap-1">{(['voir', 'créer', 'modifier'] as const).map(permission => <label key={permission} className={`cursor-pointer rounded px-1.5 py-1 text-[9px] font-bold ${featurePermissions.includes(permission) ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--card))]'}`}><input type="checkbox" className="hidden" checked={featurePermissions.includes(permission)} onChange={() => toggleFeaturePermission(module.id, feature.id, permission)} />{permission === 'voir' ? 'Voir' : permission === 'créer' ? 'Créer' : 'Modifier'}</label>)}</div></div>; })}</div></div>}
                {module.id === 'stocks' && <div className="ml-3 rounded-lg border border-dashed p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Sous-fonctions de Gestion de stock</p><p className="mb-3 text-[10px] text-[hsl(var(--muted-foreground))]">Ces règles priment sur les droits généraux du module pour les employés de cette unité.</p><div className="grid gap-2 sm:grid-cols-2">{stockSubmodules.map(submodule => { const subKey = `stocks:${submodule.id}`; const subPermissions = formData.modulePermissions[subKey] || []; return <div key={subKey} className="flex items-center justify-between gap-2 rounded-md bg-[hsl(var(--muted)/.45)] px-2.5 py-2"><span className="text-[10px] font-semibold">{submodule.name}</span><div className="flex gap-1">{(['voir', 'créer', 'modifier'] as const).map(permission => <label key={permission} className={`cursor-pointer rounded px-1.5 py-1 text-[9px] font-bold ${subPermissions.includes(permission) ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--card))]'}`}><input type="checkbox" className="hidden" checked={subPermissions.includes(permission)} onChange={() => togglePermission(subKey, permission)} />{permission === 'voir' ? 'Voir' : permission === 'créer' ? 'Créer' : 'Modifier'}</label>)}</div></div>; })}</div></div>}
                {module.id === 'presences' && <div className="ml-3 rounded-lg border border-dashed p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Droits détaillés des présences</p><p className="mb-3 text-[10px] text-[hsl(var(--muted-foreground))]">Chaque capacité est indépendante et reste limitée à l’unité du rôle.</p><div className="grid gap-2 sm:grid-cols-3">{([['view', 'Consulter'], ['create', 'Créer'], ['edit', 'Modifier'], ['delete', 'Supprimer'], ['correct', 'Corriger'], ['validate', 'Valider'], ['manage', 'Gérer'], ['export', 'Exporter'], ['reports', 'Rapports']] as const).map(([permission, label]) => { const enabled = Boolean(formData.modulePermissions[`presence.${permission}`]?.length); return <label key={permission} className={`cursor-pointer rounded px-2 py-1.5 text-[9px] font-bold ${enabled ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--card))]'}`}><input type="checkbox" className="hidden" checked={enabled} onChange={() => togglePresencePermission(permission)} />{label}</label>; })}</div></div>}
              </div>
            );
          })}
          {availableModules.length === 0 && <div className="text-sm italic text-[hsl(var(--muted-foreground))]">Aucun module n’est autorisé pour cette unité. Revenez dans Structure & unités pour en sélectionner.</div>}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3 border-t pt-4"><button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-bold hover:bg-[hsl(var(--muted))]">Annuler</button><ActionButton primary onClick={handleSave} disabled={!formData.name || !formData.sectorId}>Enregistrer</ActionButton></div>
    </div>
  );
}