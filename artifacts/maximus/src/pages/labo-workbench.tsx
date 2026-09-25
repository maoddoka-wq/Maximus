import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Copy,
  FlaskConical,
  GitBranch,
  Layers3,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import type { Module } from '@/lib/store';
import { getModuleFeatureOptions } from '@/lib/module-features';
import {
  createLaboFeatureId,
  createLaboReuseFeatureId,
  validateLaboFeatures,
  type LaboFieldDefinition,
  type LaboFeatureDefinition,
  type LaboWorkflowStage,
} from '@/lib/labo-composer';

type LaboModule = Module & { laboFeatures?: LaboFeatureDefinition[] };

type LaboDraft = {
  customModules: Module[];
  moduleOverrides: Record<string, Partial<Module>>;
};

type WorkbenchProps = {
  modules: Module[];
  draft: LaboDraft;
  onDraftChange: (nextDraft: LaboDraft) => void;
  onPublish: () => Promise<void>;
};

type FeatureMode = 'records' | 'reuse';

const panelClass =
  'rounded-[22px] border border-[#dedbd3] bg-[#fbfaf7] shadow-[0_14px_40px_rgba(44,50,56,.06)]';
const inputClass =
  'w-full rounded-xl border border-[#d8d6ce] bg-[#f7f5ef] px-3.5 py-2.5 text-sm text-[#26323a] outline-none transition placeholder:text-[#9aa09e] focus:border-[#286c73] focus:ring-2 focus:ring-[#286c73]/10';
const smallButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8d6ce] bg-[#fbfaf7] px-3 py-2 text-xs font-semibold text-[#46535a] transition hover:border-[#286c73]/40 hover:bg-[#eef5f3] hover:text-[#1d5c62] disabled:cursor-not-allowed disabled:opacity-45';

function moduleWithFeatures(module: Module, draft: LaboDraft): LaboModule {
  const override = draft.moduleOverrides[module.id] ?? {};
  const custom = draft.customModules.find(item => item.id === module.id);
  return {
    ...module,
    ...override,
    ...(custom ?? {}),
    laboFeatures:
      (custom as LaboModule | undefined)?.laboFeatures ??
      (override as LaboModule).laboFeatures ??
      (module as LaboModule).laboFeatures ??
      [],
  };
}

function fieldId(label: string, index: number) {
  return createLaboFeatureId(label, 'field') || `field-${index + 1}`;
}

function stageId(label: string, index: number) {
  return createLaboFeatureId(label, 'stage') || `stage-${index + 1}`;
}

function makeField(index: number): LaboFieldDefinition {
  return { id: `field-${index + 1}`, label: index === 0 ? 'Nom' : `Champ ${index + 1}`, type: 'text', required: false };
}

function makeStage(index: number): LaboWorkflowStage {
  return { id: `stage-${index + 1}`, label: index === 0 ? 'À traiter' : 'Terminé', requiredFieldIds: [] };
}

function SectionLabel({ children, detail }: { children: string; detail?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[11px] font-black uppercase tracking-[.16em] text-[#516068]">{children}</h2>
      {detail && <span className="text-[11px] text-[#899394]">{detail}</span>}
    </div>
  );
}

export function LaboWorkbenchPage({ modules, draft, onDraftChange, onPublish }: WorkbenchProps) {
  const [target, setTarget] = useState<'new' | string>('new');
  const [moduleLabel, setModuleLabel] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [featureMode, setFeatureMode] = useState<FeatureMode>('records');
  const [featureLabel, setFeatureLabel] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');
  const [sourceModuleId, setSourceModuleId] = useState(modules[0]?.id ?? '');
  const [sourceFeatureId, setSourceFeatureId] = useState('');
  const [fields, setFields] = useState<LaboFieldDefinition[]>([makeField(0)]);
  const [workflowEnabled, setWorkflowEnabled] = useState(false);
  const [stages, setStages] = useState<LaboWorkflowStage[]>([makeStage(0), makeStage(1)]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ definition: true, workflow: false });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [publishError, setPublishError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const selectedModule = target === 'new'
    ? undefined
    : modules.find(module => module.id === target) ?? draft.customModules.find(module => module.id === target);
  const sourceModule = modules.find(module => module.id === sourceModuleId);
  const sourceOptions = sourceModule ? getModuleFeatureOptions(sourceModule) : [];
  const effectiveModules = useMemo(
    () => modules.map(module => moduleWithFeatures(module, draft)),
    [modules, draft],
  );
  const existingFeatureCount = selectedModule
    ? moduleWithFeatures(selectedModule, draft).laboFeatures?.length ?? 0
    : 0;

  const setTargetModule = (value: string) => {
    setTarget(value);
    setPublished(false);
    setValidationErrors([]);
    setPublishError('');
    if (value === 'new') {
      setModuleLabel('');
      setModuleDescription('');
    } else {
      const module = modules.find(item => item.id === value) ?? draft.customModules.find(item => item.id === value);
      setModuleLabel(module?.name ?? '');
      setModuleDescription(module?.description ?? '');
    }
  };

  const addField = () => setFields(current => [...current, makeField(current.length)]);
  const updateField = (index: number, patch: Partial<LaboFieldDefinition>) => {
    const previousId = fields[index]?.id;
    setFields(current => current.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field));
    if (previousId && patch.id && patch.id !== previousId) {
      setStages(current => current.map(stage => ({
        ...stage,
        requiredFieldIds: stage.requiredFieldIds.map(id => id === previousId ? patch.id as string : id),
      })));
    }
  };
  const removeField = (index: number) => {
    const removedId = fields[index]?.id;
    setFields(current => current.filter((_, fieldIndex) => fieldIndex !== index));
    if (removedId) setStages(current => current.map(stage => ({ ...stage, requiredFieldIds: stage.requiredFieldIds.filter(id => id !== removedId) })));
  };
  const moveField = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= fields.length) return;
    setFields(current => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };
  const updateStage = (index: number, patch: Partial<LaboWorkflowStage>) => {
    setStages(current => current.map((stage, stageIndex) => stageIndex === index ? { ...stage, ...patch } : stage));
  };

  const validate = () => {
    const errors: string[] = [];
    if (!moduleLabel.trim()) errors.push(target === 'new' ? 'Donnez un nom au nouveau module.' : 'Le module doit avoir un nom.');
    if (!moduleDescription.trim()) errors.push('Ajoutez une description opérationnelle au module.');
    if (!featureLabel.trim()) errors.push('Donnez un nom à la fonctionnalité.');
    if (featureMode === 'reuse') {
      if (!sourceModuleId || !sourceFeatureId) errors.push('Choisissez la fonctionnalité source à réutiliser.');
      const reuseId = createLaboReuseFeatureId(sourceModuleId, sourceFeatureId);
      if (selectedModule && moduleWithFeatures(selectedModule, draft).laboFeatures?.some(item => item.id === reuseId)) {
        errors.push('Cette fonctionnalité source est déjà réutilisée dans ce module.');
      }
    } else {
      const feature: LaboFeatureDefinition = {
        id: createLaboFeatureId(featureLabel, 'labo') || 'labo-feature',
        label: featureLabel.trim(),
        description: featureDescription.trim(),
        kind: 'records',
        fields,
        ...(workflowEnabled ? { workflow: { stages } } : {}),
      };
      errors.push(...validateLaboFeatures([feature]));
      if (selectedModule && moduleWithFeatures(selectedModule, draft).laboFeatures?.some(item => item.id === feature.id)) {
        errors.push(`La fonctionnalité « ${feature.label} » existe déjà dans ce module.`);
      }
    }
    setValidationErrors([...new Set(errors)]);
    return errors.length === 0;
  };

  const publish = async () => {
    setPublished(false);
    setPublishError('');
    if (!validate()) return;
    const feature: LaboFeatureDefinition = featureMode === 'reuse'
      ? {
          id: createLaboReuseFeatureId(sourceModuleId, sourceFeatureId),
          label: featureLabel.trim(),
          description: featureDescription.trim(),
          kind: 'reuse',
          sourceModuleId,
          sourceFeatureId,
        }
      : {
          id: createLaboFeatureId(featureLabel, 'labo') || 'labo-feature',
          label: featureLabel.trim(),
          description: featureDescription.trim(),
          kind: 'records',
          fields,
          ...(workflowEnabled ? { workflow: { stages } } : {}),
        };
    const nextDraft: LaboDraft = {
      customModules: [...draft.customModules],
      moduleOverrides: { ...draft.moduleOverrides },
    };
    if (target === 'new') {
      const newModuleId = createLaboFeatureId(moduleLabel, 'module') || `module-${Date.now()}`;
      const newModule: LaboModule = {
        id: newModuleId as Module['id'],
        name: moduleLabel.trim(),
        description: moduleDescription.trim(),
        features: [feature.id],
        status: 'ACTIF',
        laboFeatures: [feature],
      };
      nextDraft.customModules = [...nextDraft.customModules.filter(item => item.id !== newModule.id), newModule];
    } else {
      const base = moduleWithFeatures(selectedModule ?? modules[0], draft);
      const laboFeatures = [...(base.laboFeatures ?? []), feature];
      nextDraft.moduleOverrides[target] = {
        ...(nextDraft.moduleOverrides[target] ?? {}),
        features: [...new Set([...(base.features ?? []), feature.id])],
        laboFeatures,
      } as Partial<Module>;
    }
    onDraftChange(nextDraft);
    setPublishing(true);
    try {
      await onPublish();
      setPublished(true);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'La publication du brouillon a échoué.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#f1efe9] px-4 py-5 text-[#26323a] sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-7 flex flex-col justify-between gap-5 border-b border-[#d8d5cd] pb-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-[#286c73]">
              <FlaskConical size={15} strokeWidth={2.4} />
              MAXIMUS / LABO
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-[-.055em] text-[#26323a] sm:text-5xl">
              Composer des opérations utiles.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687479]">
              Assemblez des capacités existantes ou créez une fiche métier persistante, sans modifier le code de MAXIMUS.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-[#d8d5cd] bg-[#f8f6f0] px-3 py-2.5 text-xs text-[#687479]">
            <span className="h-2 w-2 rounded-full bg-[#4d9587]" />
            Atelier administrateur
            <span className="ml-1 font-mono text-[10px] text-[#9ba09e]">BROUILLON</span>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(390px,.88fr)]">
          <section className={`${panelClass} overflow-hidden`}>
            <div className="border-b border-[#e5e1d8] px-5 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[.16em] text-[#a07337]">01 / Cible</p>
                  <h2 className="text-xl font-black tracking-[-.035em]">Où ajouter cette capacité ?</h2>
                </div>
                <Boxes size={22} className="text-[#286c73]" />
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  data-testid="button-target-new-module"
                  onClick={() => setTargetModule('new')}
                  className={`rounded-2xl border p-4 text-left transition ${target === 'new' ? 'border-[#286c73] bg-[#eaf2ef] shadow-[inset_3px_0_0_#286c73]' : 'border-[#dedbd3] bg-[#f8f6f0] hover:border-[#b9c8c4]'}`}
                >
                  <span className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#dcebe5] text-[#286c73]"><Plus size={17} /></span>
                    {target === 'new' && <Check size={16} className="text-[#286c73]" />}
                  </span>
                  <strong className="mt-3 block text-sm">Nouveau module</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#788286]">Un espace métier isolé avec sa propre capacité.</span>
                </button>
                <button
                  type="button"
                  data-testid="button-target-existing-module"
                  onClick={() => setTargetModule(modules[0]?.id ?? 'new')}
                  className={`rounded-2xl border p-4 text-left transition ${target !== 'new' ? 'border-[#286c73] bg-[#eaf2ef] shadow-[inset_3px_0_0_#286c73]' : 'border-[#dedbd3] bg-[#f8f6f0] hover:border-[#b9c8c4]'}`}
                >
                  <span className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8e4d8] text-[#9a6c31]"><Layers3 size={17} /></span>
                    {target !== 'new' && <Check size={16} className="text-[#286c73]" />}
                  </span>
                  <strong className="mt-3 block text-sm">Module existant</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#788286]">Étendre un module déjà disponible dans MAXIMUS.</span>
                </button>
              </div>
              {target !== 'new' && (
                <label className="mt-4 block text-xs font-bold text-[#657177]">
                  Module cible
                  <select data-testid="select-target-module" value={target} onChange={event => setTargetModule(event.target.value)} className={`${inputClass} mt-1.5`}>
                    {modules.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}
                    {draft.customModules.map(module => <option key={module.id} value={module.id}>{module.name} · personnalisé</option>)}
                  </select>
                  <span className="mt-1.5 block font-normal text-[#909998]">{existingFeatureCount} capacité{existingFeatureCount > 1 ? 's' : ''} LABO déjà configurée{existingFeatureCount > 1 ? 's' : ''}.</span>
                </label>
              )}
              {target === 'new' && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-[#657177]">Nom du module
                    <input data-testid="input-module-name" value={moduleLabel} onChange={event => setModuleLabel(event.target.value)} placeholder="Ex. Qualité terrain" className={`${inputClass} mt-1.5`} />
                  </label>
                  <label className="text-xs font-bold text-[#657177]">Description
                    <input data-testid="input-module-description" value={moduleDescription} onChange={event => setModuleDescription(event.target.value)} placeholder="À quoi sert cet espace ?" className={`${inputClass} mt-1.5`} />
                  </label>
                </div>
              )}
            </div>

            <div className="border-b border-[#e5e1d8] px-5 py-5 sm:px-7">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[.16em] text-[#a07337]">02 / Capacité</p>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black tracking-[-.035em]">Quelle opération rendre disponible ?</h2>
                <Settings2 size={20} className="text-[#286c73]" />
              </div>
              <div className="mt-5 flex rounded-xl border border-[#dedbd3] bg-[#f2f0e9] p-1">
                <button type="button" data-testid="button-feature-records" onClick={() => setFeatureMode('records')} className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-bold transition ${featureMode === 'records' ? 'bg-[#fbfaf7] text-[#286c73] shadow-sm' : 'text-[#778186]'}`}>
                  Créer une fiche métier
                </button>
                <button type="button" data-testid="button-feature-reuse" onClick={() => setFeatureMode('reuse')} className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-bold transition ${featureMode === 'reuse' ? 'bg-[#fbfaf7] text-[#286c73] shadow-sm' : 'text-[#778186]'}`}>
                  Réutiliser une capacité
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                <label className="text-xs font-bold text-[#657177]">Nom de la fonctionnalité
                  <input data-testid="input-feature-name" value={featureLabel} onChange={event => setFeatureLabel(event.target.value)} placeholder={featureMode === 'records' ? 'Ex. Visite de contrôle' : 'Ex. Suivi des commandes'} className={`${inputClass} mt-1.5`} />
                </label>
                <label className="text-xs font-bold text-[#657177]">Description
                  <textarea data-testid="input-feature-description" value={featureDescription} onChange={event => setFeatureDescription(event.target.value)} placeholder="Décrivez le résultat attendu pour les équipes." rows={2} className={`${inputClass} mt-1.5 resize-none`} />
                </label>
              </div>
              {featureMode === 'reuse' ? (
                <div className="mt-4 grid gap-3 rounded-2xl border border-[#e0d8c9] bg-[#faf5e9] p-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-[#6e665a]">Module source
                    <select data-testid="select-source-module" value={sourceModuleId} onChange={event => { setSourceModuleId(event.target.value); setSourceFeatureId(''); }} className={`${inputClass} mt-1.5 border-[#e5dbc7] bg-[#fffaf0]`}>
                      {effectiveModules.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-[#6e665a]">Capacité source
                    <select data-testid="select-source-feature" value={sourceFeatureId} onChange={event => setSourceFeatureId(event.target.value)} className={`${inputClass} mt-1.5 border-[#e5dbc7] bg-[#fffaf0]`}>
                      <option value="">Sélectionner</option>
                      {sourceOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </label>
                  <p className="flex gap-2 text-[11px] leading-5 text-[#85785f] sm:col-span-2"><Copy size={14} className="mt-0.5 shrink-0" />Cette capacité restera liée à son module source. LABO ne duplique pas ses données.</p>
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-2xl border border-[#dedbd3]">
                  <button type="button" data-testid="button-toggle-definition" onClick={() => setExpanded(current => ({ ...current, definition: !current.definition }))} className="flex w-full items-center justify-between bg-[#f7f5ef] px-4 py-3 text-left text-sm font-bold">
                    <span className="flex items-center gap-2"><GitBranch size={16} className="text-[#286c73]" /> Structure de la fiche</span>
                    {expanded.definition ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {expanded.definition && (
                    <div className="space-y-3 border-t border-[#e5e1d8] p-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="grid gap-2 rounded-xl border border-[#e4e1d9] bg-[#fbfaf7] p-3 sm:grid-cols-[1.2fr_.85fr_auto_auto] sm:items-center">
                          <input data-testid={`input-field-label-${index}`} value={field.label} onChange={event => updateField(index, { label: event.target.value, id: field.id.startsWith('field-') ? fieldId(event.target.value, index) : field.id })} className={inputClass} placeholder="Nom du champ" />
                          <select data-testid={`select-field-type-${index}`} value={field.type} onChange={event => updateField(index, { type: event.target.value as LaboFieldDefinition['type'], options: event.target.value === 'select' ? field.options ?? ['Option 1'] : undefined })} className={inputClass}>
                            <option value="text">Texte</option><option value="number">Nombre</option><option value="date">Date</option><option value="select">Choix</option><option value="boolean">Oui / non</option>
                          </select>
                          <label className="flex items-center gap-2 whitespace-nowrap text-xs text-[#687479]"><input data-testid={`checkbox-field-required-${index}`} type="checkbox" checked={field.required} onChange={event => updateField(index, { required: event.target.checked })} className="accent-[#286c73]" /> Requis</label>
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" data-testid={`button-move-field-up-${index}`} aria-label="Monter le champ" disabled={index === 0} onClick={() => moveField(index, -1)} className="rounded-lg p-1.5 text-[#7c8789] hover:bg-[#eaf2ef] disabled:opacity-30"><ArrowUp size={14} /></button>
                            <button type="button" data-testid={`button-move-field-down-${index}`} aria-label="Descendre le champ" disabled={index === fields.length - 1} onClick={() => moveField(index, 1)} className="rounded-lg p-1.5 text-[#7c8789] hover:bg-[#eaf2ef] disabled:opacity-30"><ArrowDown size={14} /></button>
                            <button type="button" data-testid={`button-remove-field-${index}`} aria-label="Supprimer le champ" disabled={fields.length === 1} onClick={() => removeField(index)} className="rounded-lg p-1.5 text-[#a86158] hover:bg-[#f6e9e4] disabled:opacity-30"><Trash2 size={14} /></button>
                          </div>
                          {field.type === 'select' && <input data-testid={`input-field-options-${index}`} value={(field.options ?? []).join(', ')} onChange={event => updateField(index, { options: event.target.value.split(',').map(value => value.trim()).filter(Boolean) })} className={`${inputClass} sm:col-span-3`} placeholder="Choix séparés par des virgules" />}
                        </div>
                      ))}
                      <button type="button" data-testid="button-add-field" onClick={addField} className={smallButton}><Plus size={14} /> Ajouter un champ</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {featureMode === 'records' && (
              <div className="px-5 py-5 sm:px-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[.16em] text-[#a07337]">03 / Cycle</p>
                    <h2 className="text-xl font-black tracking-[-.035em]">Un workflow, si nécessaire</h2>
                    <p className="mt-1 text-xs leading-5 text-[#788286]">Les étapes restent dans l’ordre défini et les champs requis sont contrôlés avant l’avancement.</p>
                  </div>
                  <button type="button" data-testid="checkbox-workflow-enabled" aria-pressed={workflowEnabled} onClick={() => setWorkflowEnabled(value => !value)} className={`relative h-7 w-12 rounded-full transition ${workflowEnabled ? 'bg-[#286c73]' : 'bg-[#d1d3ca]'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-[#fbfaf7] shadow-sm transition-transform ${workflowEnabled ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                </div>
                {workflowEnabled && (
                  <div className="mt-4 rounded-2xl border border-[#dedbd3] bg-[#f7f5ef] p-4">
                    <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-[#5e6a70]">Étapes ordonnées</span><button type="button" data-testid="button-add-stage" onClick={() => setStages(current => [...current, makeStage(current.length)])} className={smallButton}><Plus size={13} /> Étape</button></div>
                    <div className="space-y-2">
                      {stages.map((stage, index) => (
                        <div key={stage.id} className="grid gap-2 sm:grid-cols-[30px_1fr] sm:items-start">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dcebe5] font-mono text-[11px] font-bold text-[#286c73]">{index + 1}</span>
                          <div className="rounded-xl border border-[#e1ded6] bg-[#fbfaf7] p-3">
                            <div className="flex gap-2"><input data-testid={`input-stage-label-${index}`} value={stage.label} onChange={event => updateStage(index, { label: event.target.value, id: stage.id.startsWith('stage-') ? stageId(event.target.value, index) : stage.id })} className={inputClass} placeholder="Nom de l'étape" />{stages.length > 2 && <button type="button" data-testid={`button-remove-stage-${index}`} aria-label="Supprimer l'étape" onClick={() => setStages(current => current.filter((_, stageIndex) => stageIndex !== index))} className="rounded-xl px-2 text-[#a86158] hover:bg-[#f6e9e4]"><X size={16} /></button>}</div>
                            <div className="mt-2 flex flex-wrap gap-1.5">{fields.map(field => <button type="button" data-testid={`button-stage-field-${index}-${field.id}`} key={field.id} onClick={() => updateStage(index, { requiredFieldIds: stage.requiredFieldIds.includes(field.id) ? stage.requiredFieldIds.filter(id => id !== field.id) : [...stage.requiredFieldIds, field.id] })} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${stage.requiredFieldIds.includes(field.id) ? 'border-[#286c73] bg-[#e6f1ed] text-[#286c73]' : 'border-[#e2dfd7] text-[#8a9292] hover:border-[#b9c8c4]'}`}>{stage.requiredFieldIds.includes(field.id) ? 'Requis · ' : ''}{field.label || 'Champ sans nom'}</button>)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <section className={`${panelClass} overflow-hidden`}>
              <div className="border-b border-[#e5e1d8] bg-[#283940] px-5 py-5 text-[#f4f3ed] sm:px-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[.18em] text-[#a6c8bd]">Aperçu de publication</span>
                  <span className="rounded-full border border-[#75958d]/40 px-2 py-1 text-[10px] text-[#b8d0c8]">{target === 'new' ? 'Nouveau' : 'Extension'}</span>
                </div>
                <h2 className="mt-5 text-2xl font-black tracking-[-.045em]">{moduleLabel.trim() || 'Votre module'}</h2>
                <p className="mt-1.5 text-sm leading-5 text-[#b6c2bf]">{moduleDescription.trim() || 'La description apparaîtra dans le catalogue MAXIMUS.'}</p>
              </div>
              <div className="space-y-4 px-5 py-5 sm:px-6">
                <div className="flex items-start gap-3"><span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#e5f0ec] text-[#286c73]"><GitBranch size={14} /></span><div><p className="text-sm font-bold">{featureLabel.trim() || 'Nom de la capacité'}</p><p className="mt-0.5 text-xs text-[#818b8d]">{featureMode === 'records' ? `${fields.length} champ${fields.length > 1 ? 's' : ''} · ${workflowEnabled ? `${stages.length} étapes` : 'sans workflow'}` : sourceModule && sourceFeatureId ? `Réutilise ${sourceModule.name}` : 'Source à sélectionner'}</p></div></div>
                <div className="border-t border-[#e5e1d8] pt-4 text-xs leading-5 text-[#788286]"><strong className="text-[#536168]">Ce qui sera conservé :</strong> le brouillon garde les modules et overrides existants. Seule la capacité décrite ici est ajoutée.</div>
                {validationErrors.length > 0 && <div data-testid="status-validation-errors" className="rounded-xl border border-[#e7c9bf] bg-[#fbefeb] p-3 text-xs leading-5 text-[#9a554b]"><div className="mb-1 flex items-center gap-2 font-bold"><CircleAlert size={14} /> Vérifiez la configuration</div><ul className="list-disc space-y-0.5 pl-5">{validationErrors.map(error => <li key={error}>{error}</li>)}</ul></div>}
                {publishError && <div data-testid="status-publish-error" className="rounded-xl border border-[#e7c9bf] bg-[#fbefeb] p-3 text-xs leading-5 text-[#9a554b]">{publishError}</div>}
                {published && <div data-testid="status-published" className="flex items-center gap-2 rounded-xl border border-[#c4ddd1] bg-[#edf7f1] p-3 text-xs font-semibold text-[#286c73]"><Check size={15} /> Brouillon publié dans le catalogue.</div>}
                <button type="button" data-testid="button-publish-labo" onClick={() => void publish()} disabled={publishing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#286c73] px-4 py-3 text-sm font-bold text-[#f8faf5] shadow-[0_8px_20px_rgba(40,108,115,.18)] transition hover:bg-[#205b61] disabled:cursor-wait disabled:opacity-60">
                  <Save size={16} /> {publishing ? 'Publication en cours…' : 'Publier dans le brouillon'}
                </button>
                <p className="text-center font-mono text-[9px] uppercase tracking-[.12em] text-[#9aa19f]">Publication contrôlée · aucune donnée métier déplacée</p>
              </div>
            </section>
            <section className="rounded-[22px] border border-[#dedbd3] bg-[#e9eee9] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#6f807c]">Capacités disponibles</p>
              <div className="mt-3 flex flex-wrap gap-2">{effectiveModules.map(module => <span key={module.id} className="rounded-full border border-[#cbd8d1] bg-[#f4f7f2] px-2.5 py-1 text-[11px] font-semibold text-[#5d706b]">{module.name}</span>)}</div>
              <p className="mt-3 text-xs leading-5 text-[#74817e]">Les capacités sources restent attachées à leur module d’origine et suivent ses règles d’accès.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}