import { useState } from 'react';
import { Building2, ChevronDown, Settings, Trash2 } from 'lucide-react';
import { useAppDialog } from '@/components/confirm-dialog';
import {
  getConfiguredModules,
  uid,
  type Company,
  type Module,
  type ModuleId,
  type OrgNode,
  type StoreData,
} from '@/lib/store';
import { getEffectiveModuleFeatureIds, getModuleFeatureOptions } from '@/lib/module-features';
import { synchronizeUnitPackRoles } from '@/lib/module-role-sync';
import { ActionButton, Field, Modal } from './organization-shared';

type Mutate = (fn: (data: StoreData) => void, message?: string) => void;

export function StructureTab({
  company,
  data,
  mutate,
}: {
  company: Company;
  data: StoreData;
  mutate: Mutate;
}) {
  const { alert } = useAppDialog();
  const companyNodes = data.orgNodes.filter(node => node.companyId === company.id);
  const availableModules = getConfiguredModules(data).filter(module => company.allowedModules.includes(module.id));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);

  const deleteNode = async (id: string) => {
    const ids = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      companyNodes.forEach(node => {
        if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
          ids.add(node.id);
          changed = true;
        }
      });
    }
    const assigned =
      data.employees.some(employee => employee.sectorId && ids.has(employee.sectorId)) ||
      data.roles.some(role => role.sectorId && ids.has(role.sectorId));
    if (assigned) {
      await alert({
        title: 'Suppression impossible',
        description: 'Des rôles ou employés sont encore affectés à cette unité.',
        confirmLabel: 'Compris',
        tone: 'danger',
      });
      return;
    }
    mutate(draft => {
      draft.orgNodes = draft.orgNodes.filter(node => !ids.has(node.id));
    }, 'Unité et sous-unités supprimées.');
  };

  return (
    <div className="card-surface rounded-2xl p-4 fade-up sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Unités Organisationnelles</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Créez la hiérarchie de l’entreprise. Les rôles, sous-autorisations et managers se configurent dans les étapes suivantes de cette même page.</p>
        </div>
        <ActionButton
          primary
          className="shrink-0 self-start"
          onClick={() => {
            setEditingNode(null);
            setModalOpen(true);
          }}
          testId="btn-create-org"
        >
          Créer une unité
        </ActionButton>
      </div>
      <div className="mb-4 rounded-xl bg-[hsl(var(--muted)/.5)] p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
        <strong className="text-[hsl(var(--foreground))]">Étape 1 · Construire la hiérarchie.</strong> Créez les directions, départements, secteurs et services. Les rôles, les sous-autorisations et les managers se configurent ensuite dans les étapes 2 et 3 ci-dessus.
      </div>
      <div className="mb-5 flex flex-col gap-1 rounded-xl border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span><strong>{companyNodes.length}</strong> unité(s) créée(s)</span>
        <span className="text-[hsl(var(--muted-foreground))] sm:text-right">Les managers se désignent depuis Comptes & managers</span>
      </div>
      <div className="overflow-x-auto">
        <div className="space-y-1 sm:min-w-[760px]">
          <div className="mb-1 hidden w-full grid-cols-[minmax(0,1fr)_190px_190px] items-center gap-4 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))] sm:grid">
            <span>Unité</span>
            <span className="text-right">Accès</span>
            <span className="text-right">Actions</span>
          </div>
          {companyNodes.filter(node => !node.parentId).map(root => (
            <StructureNodeItem key={root.id} node={root} allNodes={companyNodes} onEdit={node => { setEditingNode(node); setModalOpen(true); }} onDelete={deleteNode} depth={0} />
          ))}
          {companyNodes.filter(node => !node.parentId).length === 0 && <div className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune unité définie.</div>}
        </div>
      </div>
      {modalOpen && (
        <Modal title={editingNode ? 'Modifier une unité' : 'Créer une unité'} onClose={() => setModalOpen(false)}>
          <StructureFormModal
            initialData={editingNode}
            allNodes={companyNodes}
            availableModules={availableModules}
            onClose={() => setModalOpen(false)}
            onSave={nodeData => {
              mutate(draft => {
                const nodeId = editingNode?.id ?? uid('org');
                const savedNode: OrgNode = { id: nodeId, companyId: company.id, ...nodeData };
                if (editingNode) {
                  const index = draft.orgNodes.findIndex(node => node.id === editingNode.id);
                  if (index !== -1) {
                    draft.orgNodes[index] = { ...draft.orgNodes[index], ...nodeData };
                    synchronizeUnitPackRoles(draft, company, draft.orgNodes[index]);
                  }
                } else {
                  draft.orgNodes.push(savedNode);
                  synchronizeUnitPackRoles(draft, company, savedNode);
                }
              }, editingNode ? 'Unité mise à jour.' : 'Unité créée.');
              setModalOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function StructureNodeItem({
  node,
  allNodes,
  onEdit,
  onDelete,
  depth,
}: {
  node: OrgNode;
  allNodes: OrgNode[];
  onEdit: (node: OrgNode) => void;
  onDelete: (id: string) => void;
  depth: number;
}) {
  const children = allNodes.filter(candidate => candidate.parentId === node.id);
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <div className="group grid w-full grid-cols-1 gap-2 rounded-lg border-b border-[hsl(var(--border)/.7)] px-3 py-2.5 transition hover:bg-[hsl(var(--muted)/.4)] sm:grid-cols-[minmax(0,1fr)_190px_190px] sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-3" style={{ paddingLeft: `${Math.min(depth * 20, 48)}px` }}>
          <button type="button" aria-label={children.length > 0 ? `${expanded ? 'Réduire' : 'Développer'} ${node.name}` : undefined} onClick={() => setExpanded(value => !value)} className="flex h-5 w-5 shrink-0 items-center justify-center text-[hsl(var(--muted-foreground))]">
            {children.length > 0 && <ChevronDown size={14} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />}
          </button>
          <span className="shrink-0 rounded bg-[hsl(var(--primary)/.1)] p-1.5 text-[hsl(var(--primary))]"><Building2 size={14} /></span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{node.name}</span>
            <span className="shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase text-[hsl(var(--muted-foreground))]">{node.type}</span>
            {node.code && <span className="mono max-w-[32%] shrink-0 truncate text-[10px] text-[hsl(var(--muted-foreground))]">{node.code}</span>}
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2 text-xs text-[hsl(var(--muted-foreground))] sm:justify-end">
          <span className="text-[11px]">{node.moduleIds?.length ?? 0} module(s) autorisé(s)</span>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-1">
          <button type="button" data-testid={`button-edit-org-${node.id}`} aria-label={`Modifier ${node.name}`} onClick={event => { event.stopPropagation(); onEdit(node); }} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"><Settings size={13} /><span>Modifier</span></button>
          <button type="button" data-testid={`button-delete-org-${node.id}`} aria-label={`Supprimer ${node.name}`} onClick={() => onDelete(node.id)} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]"><Trash2 size={13} /><span>Supprimer</span></button>
          </div>
      </div>
      {expanded && children.map(child => <StructureNodeItem key={child.id} node={child} allNodes={allNodes} onEdit={onEdit} onDelete={onDelete} depth={depth + 1} />)}
    </div>
  );
}

function StructureFormModal({
  initialData,
  allNodes,
  availableModules,
  onClose,
  onSave,
}: {
  initialData: OrgNode | null;
  allNodes: OrgNode[];
  availableModules: Module[];
  onClose: () => void;
  onSave: (data: Omit<OrgNode, 'id' | 'companyId'>) => void;
}) {
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    code: initialData?.code || '',
    type: (initialData?.type || 'direction') as OrgNode['type'],
    parentId: initialData?.parentId || '',
    moduleIds: initialData?.moduleIds ? [...initialData.moduleIds] : [],
    modulePackIds: Object.fromEntries(Object.entries(initialData?.modulePackIds ?? {}).map(([moduleId, packIds]) => [moduleId, [...(packIds ?? [])]])) as Partial<Record<ModuleId, string[]>>,
    moduleFeatures: Object.fromEntries(Object.entries(initialData?.moduleFeatures ?? {}).map(([moduleId, featureIds]) => [moduleId, [...(featureIds ?? [])]])) as Partial<Record<ModuleId, string[]>>,
  });
  const parentOptions = allNodes.filter(node => node.id !== initialData?.id);

  const isCyclic = (parentId: string) => {
    let current = allNodes.find(node => node.id === parentId);
    while (current) {
      if (current.id === initialData?.id) return true;
      current = allNodes.find(node => node.id === current?.parentId);
    }
    return false;
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.code.trim() || !formData.type) {
      setError('Le nom et le code de l’unité sont obligatoires.');
      return;
    }
    if (allNodes.some(node => node.id !== initialData?.id && node.code?.trim().toLowerCase() === formData.code.trim().toLowerCase())) {
      setError('Ce code d’unité est déjà utilisé dans l’entreprise.');
      return;
    }
    if (formData.parentId && isCyclic(formData.parentId)) {
      setError('Cette unité ne peut pas être placée sous l’un de ses descendants.');
      return;
    }
    onSave({
      ...formData,
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      parentId: formData.parentId || null,
    });
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-[hsl(var(--destructive)/.1)] p-3 text-sm font-semibold text-[hsl(var(--destructive))]">{error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nom de l'unité *" value={formData.name} onChange={(value: string) => setFormData(current => ({ ...current, name: value }))} testId="input-org-name" help="Nom lisible de la direction, du département, du secteur ou du service." />
        <Field label="Code" value={formData.code} onChange={(value: string) => setFormData(current => ({ ...current, code: value }))} placeholder="Ex: UNITE-01" help="Identifiant court utilisé pour retrouver rapidement cette unité." />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Type *
          <select value={formData.type} onChange={event => setFormData(current => ({ ...current, type: event.target.value as OrgNode['type'] }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))]">
            <option value="direction">Direction</option><option value="department">Département</option><option value="sector">Secteur</option><option value="service">Service</option>
          </select>
          <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">Définit le niveau de l’unité dans votre organisation.</span>
        </label>
        <label className="block text-sm font-semibold">Unité Parente
          <select value={formData.parentId} onChange={event => setFormData(current => ({ ...current, parentId: event.target.value }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))]">
            <option value="">Aucune (Racine)</option>
            {parentOptions.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}
          </select>
          <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">L’unité parente permet de construire la hiérarchie.</span>
        </label>
      </div>
       <div className="mt-2 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <div><label className="block text-sm font-semibold">Modules autorisés pour cette unité</label><p className="mt-1 text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">Ces modules pourront ensuite être attribués aux rôles de cette unité.</p></div>
          <span className="mono shrink-0 text-[10px] text-[hsl(var(--muted-foreground))]">{formData.moduleIds.length} sélectionné(s)</span>
        </div>
        {availableModules.length > 0 ? <div className="mt-3 grid gap-2 sm:grid-cols-2">
           {availableModules.map(module => {
            const enabled = formData.moduleIds.includes(module.id);
             const packs = module.featurePacks ?? [];
             return <div key={module.id} className={`rounded-lg border p-3 transition ${enabled ? 'border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.06)]' : 'hover:bg-[hsl(var(--muted)/.5)]'}`}>
               <label className="flex cursor-pointer items-start gap-3">
                 <input data-testid={`checkbox-org-module-${module.id}`} type="checkbox" checked={enabled} onChange={() => setFormData(current => {
                   const nextModules = enabled ? current.moduleIds.filter(id => id !== module.id) : [...current.moduleIds, module.id];
                   const nextPackIds = { ...current.modulePackIds };
                    const nextFeatures = { ...current.moduleFeatures };
                    if (enabled) {
                      delete nextPackIds[module.id];
                      delete nextFeatures[module.id];
                    }
                    return { ...current, moduleIds: nextModules, modulePackIds: nextPackIds, moduleFeatures: nextFeatures };
                 })} className="mt-0.5 accent-[hsl(var(--primary))]" />
                 <span><strong className="block text-xs">{module.name}</strong><small className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">{enabled ? 'Sélectionnez les packs de ce module.' : module.description}</small></span>
               </label>
               {enabled && packs.length > 0 && <div className="mt-3 border-t pt-2">{packs.map(pack => {
                 const selected = formData.modulePackIds[module.id]?.includes(pack.id) ?? false;
                 return <label key={pack.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-[10px] hover:bg-[hsl(var(--card))]"><input data-testid={`checkbox-org-pack-${module.id}-${pack.id}`} type="checkbox" checked={selected} onChange={() => setFormData(current => {
                   const currentIds = current.modulePackIds[module.id] ?? [];
                   const nextIds = currentIds.includes(pack.id) ? currentIds.filter(id => id !== pack.id) : [...currentIds, pack.id];
                    const selectedPacks = packs.filter(candidate => nextIds.includes(candidate.id));
                    const featureIds = selectedPacks.flatMap(candidate => candidate.featureIds);
                    return { ...current, modulePackIds: { ...current.modulePackIds, [module.id]: nextIds }, moduleFeatures: { ...current.moduleFeatures, [module.id]: [...getEffectiveModuleFeatureIds(module, featureIds)] } };
                 })} className="mt-0.5 accent-[hsl(var(--primary))]" /><span><strong className="block">{pack.name}</strong><span className="text-[9px] text-[hsl(var(--muted-foreground))]">{pack.featureIds.length} fonctionnalité(s)</span></span></label>;
               })}</div>}
               {enabled && packs.length === 0 && <p className="mt-3 border-t pt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Aucun pack configuré dans ce module.</p>}
                {enabled && (packs.length === 0 || (formData.modulePackIds[module.id]?.length ?? 0) > 0) && <div className="mt-3 border-t pt-2"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Fonctionnalités de l’unité</p><div className="grid gap-1 sm:grid-cols-2">{getModuleFeatureOptions(module).map(feature => {
                  const selected = (formData.moduleFeatures[module.id] ?? []).includes(feature.id);
                  return <label key={feature.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-[10px] hover:bg-[hsl(var(--card))]"><input data-testid={`checkbox-org-feature-${module.id}-${feature.id}`} type="checkbox" checked={selected} onChange={() => setFormData(current => {
                    const currentIds = new Set(current.moduleFeatures[module.id] ?? getModuleFeatureOptions(module).map(item => item.id));
                    if (currentIds.has(feature.id)) currentIds.delete(feature.id); else currentIds.add(feature.id);
                    return { ...current, moduleFeatures: { ...current.moduleFeatures, [module.id]: [...getEffectiveModuleFeatureIds(module, [...currentIds])] } };
                  })} className="mt-0.5 accent-[hsl(var(--primary))]" /><span>{feature.label}</span></label>;
                })}</div><p className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Le pack propose un rôle de départ ; vous pouvez ajouter ou retirer des fonctionnalités.</p></div>}
             </div>;
          })}
        </div> : <p className="mt-3 rounded-lg bg-[hsl(var(--muted))] p-3 text-xs text-[hsl(var(--muted-foreground))]">Aucun module n’est encore autorisé pour cette entreprise. Les modules doivent d’abord être activés au niveau de l’entreprise par MAXIMUS.</p>}
      </div>
       <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t pt-4 sm:flex-row">
        <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-bold hover:bg-[hsl(var(--muted))]">Annuler</button>
        <ActionButton primary onClick={handleSave} disabled={!formData.name} testId="btn-save-org">Enregistrer</ActionButton>
      </div>
    </div>
  );
}