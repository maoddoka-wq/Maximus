import { useState } from 'react';
import { Building2, Check, Layers3, Settings, Trash2 } from 'lucide-react';
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
type Permission = 'voir' | 'créer' | 'modifier';

const permissionLabels: Record<Permission, string> = {
  voir: 'Voir',
  créer: 'Créer',
  modifier: 'Modifier',
};

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
  const moduleDefinitions = getConfiguredModules(data);
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-[hsl(var(--muted)/.5)] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            <tr>
              <th className="px-6 py-3 font-bold">Rôle</th>
              <th className="px-6 py-3 font-bold">Unité</th>
              <th className="px-6 py-3 font-bold">Sous-autorisations</th>
              <th className="px-6 py-3 font-bold">Affectations</th>
              <th className="px-6 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {companyRoles.map(role => {
              const sector = companyNodes.find(node => node.id === role.sectorId);
              const assignedEmployees = data.employees.filter(employee => employee.roleId === role.id);
              const permissionEntries = Object.entries(role.modulePermissions);
              return (
                <tr key={role.id} className="transition hover:bg-[hsl(var(--muted)/.3)]">
                  <td className="px-6 py-4 align-top">
                    <div className="min-w-[190px]">
                      <p className="font-bold">{role.name}</p>
                      <p className="mt-1 max-w-[260px] text-xs leading-5 text-[hsl(var(--muted-foreground))]">{role.description || 'Aucune description renseignée.'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium"><Building2 size={13} className="text-[hsl(var(--muted-foreground))]" />{sector?.name || 'Non assignée'}</span>
                  </td>
                  <td className="px-6 py-4 align-top">
                    {permissionEntries.length > 0 ? (
                      <div className="flex max-w-[420px] flex-wrap gap-1.5">
                        {permissionEntries.map(([key, permissions]) => (
                          <span key={key} className="inline-flex items-center gap-1 rounded-md border bg-[hsl(var(--muted)/.25)] px-2 py-1 text-[10px] font-semibold">
                            {permissionLabel(key, moduleDefinitions)}
                            <span className="text-[hsl(var(--muted-foreground))]">· {permissions.map(permission => permissionLabels[permission as Permission] ?? permission).join(', ')}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Aucune permission</span>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex min-w-[170px] flex-wrap gap-1.5 text-xs">
                      {company.managerRoleId === role.id && <span className="rounded-full bg-[hsl(var(--primary)/.12)] px-2 py-1 text-[10px] font-bold text-[hsl(var(--primary))]">Manager : {company.manager}</span>}
                      {assignedEmployees.map(employee => <span key={employee.id} className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px] font-semibold">{employee.firstName} {employee.lastName}</span>)}
                      {company.managerRoleId !== role.id && assignedEmployees.length === 0 && <span className="text-[hsl(var(--muted-foreground))]">Aucune affectation</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right align-top">
                    <div className="flex justify-end gap-2">
                      <button type="button" data-testid={`button-edit-org-role-${role.id}`} aria-label={`Modifier le rôle ${role.name}`} onClick={() => { setEditingRole(role); setModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><Settings size={13} /> Modifier</button>
                      <button type="button" data-testid={`button-delete-org-role-${role.id}`} aria-label={`Supprimer le rôle ${role.name}`} onClick={() => deleteRole(role)} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)]"><Trash2 size={13} /> Supprimer</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {companyRoles.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucun rôle configuré.</td></tr>}
          </tbody>
        </table>
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
        <div className="mb-4">
          <h3 className="text-sm font-bold">Droits d’accès</h3>
          <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Organisez les droits en trois niveaux : accès au module, sous-fonctionnalités et actions autorisées.</p>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {availableModules.map(module => (
            <ModulePermissionCard
              key={module.id}
              module={module}
              modulePermissions={formData.modulePermissions}
              onTogglePermission={togglePermission}
              onToggleFeature={toggleFeaturePermission}
              onTogglePresence={togglePresencePermission}
            />
          ))}
          {availableModules.length === 0 && <div className="text-sm italic text-[hsl(var(--muted-foreground))]">Aucun module n’est autorisé pour cette unité. Revenez dans Structure & unités pour en sélectionner.</div>}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3 border-t pt-4"><button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-bold hover:bg-[hsl(var(--muted))]">Annuler</button><ActionButton primary onClick={handleSave} disabled={!formData.name || !formData.sectorId}>Enregistrer</ActionButton></div>
    </div>
  );
}

function PermissionToggle({
  permission,
  active,
  onClick,
}: {
  permission: Permission;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[10px] font-bold transition ${active ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.5)] hover:text-[hsl(var(--foreground))]'}`}
    >
      {active && <Check size={11} />}
      {permissionLabels[permission]}
    </button>
  );
}

function PermissionToggleGroup({
  permissions,
  activePermissions,
  onToggle,
}: {
  permissions: Permission[];
  activePermissions: string[];
  onToggle: (permission: Permission) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {permissions.map(permission => (
        <PermissionToggle
          key={permission}
          permission={permission}
          active={activePermissions.includes(permission)}
          onClick={() => onToggle(permission)}
        />
      ))}
    </div>
  );
}

function ModulePermissionCard({
  module,
  modulePermissions,
  onTogglePermission,
  onToggleFeature,
  onTogglePresence,
}: {
  module: Module;
  modulePermissions: Record<string, string[]>;
  onTogglePermission: (key: string, permission: Permission) => void;
  onToggleFeature: (moduleId: ModuleId, feature: string, permission: Permission) => void;
  onTogglePresence: (permission: string) => void;
}) {
  const permissions = modulePermissions[module.id] || [];
  const features = module.id === 'commerce'
    ? commerceTabDefinitions
    : module.features.map(feature => ({ id: feature, label: feature }));

  return (
    <section className="overflow-hidden rounded-xl border bg-[hsl(var(--card))]">
      <div className="flex flex-col gap-3 border-b bg-[hsl(var(--muted)/.22)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="rounded-lg bg-[hsl(var(--primary)/.12)] p-2 text-[hsl(var(--primary))]"><Layers3 size={16} /></span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold">{module.name}</h4>
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{module.description}</p>
          </div>
        </div>
        <div className="shrink-0">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Accès général</p>
          <PermissionToggleGroup permissions={['voir', 'créer', 'modifier']} activePermissions={permissions} onToggle={permission => onTogglePermission(module.id, permission)} />
        </div>
      </div>
      <div className="space-y-3 p-4">
        {module.id !== 'stocks' && module.id !== 'presences' && (
          <FeaturePermissionList
            module={module}
            features={features}
            modulePermissions={modulePermissions}
            onToggle={onToggleFeature}
          />
        )}
        {module.id === 'stocks' && <StockPermissionList modulePermissions={modulePermissions} onToggle={onTogglePermission} />}
        {module.id === 'presences' && <PresencePermissionList modulePermissions={modulePermissions} onToggle={onTogglePresence} />}
      </div>
    </section>
  );
}

function FeaturePermissionList({
  module,
  features,
  modulePermissions,
  onToggle,
}: {
  module: Module;
  features: readonly { id: string; label: string }[];
  modulePermissions: Record<string, string[]>;
  onToggle: (moduleId: ModuleId, feature: string, permission: Permission) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h5 className="text-xs font-bold">Sous-fonctionnalités</h5>
          <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">Définissez les menus et actions visibles dans ce module.</p>
        </div>
        <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">{features.length} élément{features.length > 1 ? 's' : ''}</span>
      </div>
      <div className="grid gap-2">
        {features.map(feature => {
          const key = module.id === 'commerce' ? commerceTabPermissionKey(feature.id as CommerceTabId) : permissionFeatureKey(module.id, feature.id);
          const activePermissions = module.id === 'commerce'
            ? [...new Set(commerceTabPermissionKeys(feature.id as CommerceTabId).flatMap(permissionKey => modulePermissions[permissionKey] || []))]
            : modulePermissions[key] || [];
          return (
            <div key={key} className="flex flex-col gap-3 rounded-lg border bg-[hsl(var(--muted)/.16)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-semibold">{feature.label}</span>
              <PermissionToggleGroup permissions={['voir', 'créer', 'modifier']} activePermissions={activePermissions} onToggle={permission => onToggle(module.id, feature.id, permission)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StockPermissionList({
  modulePermissions,
  onToggle,
}: {
  modulePermissions: Record<string, string[]>;
  onToggle: (key: string, permission: Permission) => void;
}) {
  return (
    <div>
      <div className="mb-2">
        <h5 className="text-xs font-bold">Sous-fonctions de Gestion de stock</h5>
        <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">Ces règles précisent les droits de l’employé dans son unité.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {stockSubmodules.map(submodule => {
          const key = `stocks:${submodule.id}`;
          return (
            <div key={key} className="flex flex-col gap-3 rounded-lg border bg-[hsl(var(--muted)/.16)] px-3 py-3">
              <span className="text-xs font-semibold">{submodule.name}</span>
              <PermissionToggleGroup permissions={['voir', 'créer', 'modifier']} activePermissions={modulePermissions[key] || []} onToggle={permission => onToggle(key, permission)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PresencePermissionList({
  modulePermissions,
  onToggle,
}: {
  modulePermissions: Record<string, string[]>;
  onToggle: (permission: string) => void;
}) {
  const permissions = [
    ['view', 'Consulter'],
    ['create', 'Créer'],
    ['edit', 'Modifier'],
    ['delete', 'Supprimer'],
    ['correct', 'Corriger'],
    ['validate', 'Valider'],
    ['manage', 'Gérer'],
    ['export', 'Exporter'],
    ['reports', 'Rapports'],
  ] as const;

  return (
    <div>
      <div className="mb-2">
        <h5 className="text-xs font-bold">Droits détaillés des présences</h5>
        <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">Chaque capacité reste limitée à l’unité du rôle.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {permissions.map(([key, label]) => {
          const active = Boolean(modulePermissions[`presence.${key}`]?.length);
          return (
            <button key={key} type="button" aria-pressed={active} onClick={() => onToggle(key)} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${active ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--foreground))]' : 'bg-[hsl(var(--muted)/.16)] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.5)]'}`}>
              {label}
              {active && <Check size={13} className="text-[hsl(var(--primary))]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}