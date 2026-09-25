import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  FlaskConical,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type { Module } from '@/lib/store';
import { createLaboFeatureId, validateLaboFeatures } from '@/lib/labo-composer';
import type {
  LaboFeatureDefinition,
  LaboFieldDefinition,
  LaboRecordFeatureDefinition,
  LaboWorkflowStage,
} from '@/lib/labo-composer';

type LaboModule = Module & { laboFeatures?: LaboFeatureDefinition[] };

type LaboDraft = {
  customModules: Module[];
  moduleOverrides: Record<string, Partial<Module>>;
  laboFeatureCatalog: LaboFeatureDefinition[];
};

type WorkbenchProps = {
  modules: Module[];
  draft: LaboDraft;
  onDraftChange: (nextDraft: LaboDraft) => void;
  onPublish: () => Promise<void>;
};

const panelClass = 'rounded-2xl border border-[#dedbd3] bg-[#fbfaf7] shadow-[0_10px_28px_rgba(44,50,56,.05)]';
const inputClass =
  'w-full rounded-xl border border-[#d8d6ce] bg-[#f7f5ef] px-3.5 py-2.5 text-sm text-[#26323a] outline-none transition placeholder:text-[#9aa09e] focus:border-[#286c73] focus:ring-2 focus:ring-[#286c73]/10';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8d6ce] bg-[#fbfaf7] px-3 py-2 text-xs font-semibold text-[#46535a] transition hover:border-[#286c73]/40 hover:bg-[#eef5f3] hover:text-[#1d5c62] disabled:cursor-not-allowed disabled:opacity-50';

function moduleWithFeatures(module: Module, draft: LaboDraft): LaboModule {
  const override = draft.moduleOverrides[module.id] ?? {};
  const custom = draft.customModules.find(item => item.id === module.id);
  const legacyFeatures =
    (custom as LaboModule | undefined)?.laboFeatures ??
    (override as LaboModule).laboFeatures ??
    (module as LaboModule).laboFeatures ??
    [];
  const laboFeatureIds =
    custom?.laboFeatureIds ??
    override.laboFeatureIds ??
    module.laboFeatureIds ??
    legacyFeatures.map(feature => feature.id);
  const featureById = new Map([
    ...draft.laboFeatureCatalog.map(feature => [feature.id, feature] as const),
    ...legacyFeatures.map(feature => [feature.id, feature] as const),
  ]);

  return {
    ...module,
    ...override,
    ...(custom ?? {}),
    laboFeatureIds,
    laboFeatures: laboFeatureIds
      .map(id => featureById.get(id))
      .filter((feature): feature is LaboFeatureDefinition => Boolean(feature)),
  };
}

function makeField(index: number): LaboFieldDefinition {
  return {
    id: `field-${index + 1}`,
    label: index === 0 ? 'Titre' : `Champ ${index + 1}`,
    type: 'text',
    required: index === 0,
  };
}

function makeStage(index: number): LaboWorkflowStage {
  return {
    id: `stage-${index + 1}`,
    label: index === 0 ? 'À traiter' : index === 1 ? 'Terminé' : `Étape ${index + 1}`,
    requiredFieldIds: [],
  };
}

export function LaboWorkbenchPage({ modules, draft, onDraftChange, onPublish }: WorkbenchProps) {
  const [target, setTarget] = useState(modules[0]?.id ?? 'new');
  const [moduleLabel, setModuleLabel] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [featureLabel, setFeatureLabel] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');
  const [fields, setFields] = useState<LaboFieldDefinition[]>([makeField(0)]);
  const [workflowEnabled, setWorkflowEnabled] = useState(false);
  const [stages, setStages] = useState<LaboWorkflowStage[]>([makeStage(0), makeStage(1)]);
  const [showFields, setShowFields] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [publishError, setPublishError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [publishing, setPublishing] = useState(false);

  const catalog = draft.laboFeatureCatalog ?? [];
  const selectedModule = target === 'new' ? undefined : modules.find(module => module.id === target);
  const configuredTarget = selectedModule ? moduleWithFeatures(selectedModule, draft) : undefined;
  const associatedIds = configuredTarget?.laboFeatureIds ?? [];
  const catalogFeatures = catalog.filter(
    (feature): feature is LaboRecordFeatureDefinition => feature.kind === 'records',
  );

  const selectTarget = (value: string) => {
    setTarget(value);
    setValidationErrors([]);
    setPublishError('');
    setSavedMessage('');
    if (value === 'new') {
      setModuleLabel('');
      setModuleDescription('');
      return;
    }
    const module = modules.find(item => item.id === value);
    setModuleLabel(module?.name ?? '');
    setModuleDescription(module?.description ?? '');
  };

  const updateField = (index: number, patch: Partial<LaboFieldDefinition>) => {
    const previousId = fields[index]?.id;
    setFields(current => current.map((field, fieldIndex) =>
      fieldIndex === index ? { ...field, ...patch } : field,
    ));
    if (previousId && patch.id && patch.id !== previousId) {
      setStages(current => current.map(stage => ({
        ...stage,
        requiredFieldIds: stage.requiredFieldIds.map(id => id === previousId ? patch.id as string : id),
      })));
    }
  };

  const persist = async (nextDraft: LaboDraft, successMessage: string, nextTarget?: string) => {
    setValidationErrors([]);
    setPublishError('');
    setSavedMessage('');
    setPublishing(true);
    onDraftChange(nextDraft);
    try {
      await onPublish();
      setSavedMessage(successMessage);
      if (nextTarget) setTarget(nextTarget);
      return true;
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'L’enregistrement a échoué.');
      return false;
    } finally {
      setPublishing(false);
    }
  };

  const buildModuleAssociation = (
    featureId: string,
    add: boolean,
  ): { nextDraft: LaboDraft; moduleId: string } | null => {
    const nextDraft: LaboDraft = {
      customModules: [...draft.customModules],
      moduleOverrides: { ...draft.moduleOverrides },
      laboFeatureCatalog: [...catalog],
    };

    if (target === 'new') {
      if (!moduleLabel.trim() || !moduleDescription.trim()) {
        setValidationErrors(['Indiquez le nom et la description du nouveau module.']);
        return null;
      }
      const moduleId = createLaboFeatureId(moduleLabel, 'module') || `module-${Date.now()}`;
      const existing = nextDraft.customModules.find(module => module.id === moduleId);
      const currentIds = existing?.laboFeatureIds ?? [];
      const nextIds = add
        ? [...new Set([...currentIds, featureId])]
        : currentIds.filter(id => id !== featureId);
      const existingFeatures = existing?.features ?? [];
      const nextFeatures = add
        ? [...new Set([...existingFeatures, featureId])]
        : existingFeatures.filter(id => id !== featureId);
      const nextModule: Module = {
        ...(existing ?? {}),
        id: moduleId as Module['id'],
        name: moduleLabel.trim(),
        description: moduleDescription.trim(),
        features: nextFeatures,
        laboFeatureIds: nextIds,
        status: 'ACTIF',
      };
      nextDraft.customModules = [
        ...nextDraft.customModules.filter(module => module.id !== moduleId),
        nextModule,
      ];
      return { nextDraft, moduleId };
    }

    if (!selectedModule) {
      setValidationErrors(['Choisissez un module cible.']);
      return null;
    }
    const base = moduleWithFeatures(selectedModule, draft);
    const currentIds = base.laboFeatureIds ?? [];
    const nextIds = add
      ? [...new Set([...currentIds, featureId])]
      : currentIds.filter(id => id !== featureId);
    const currentFeatures = base.features ?? [];
    const nextFeatures = add
      ? [...new Set([...currentFeatures, featureId])]
      : currentFeatures.filter(id => id !== featureId);
    nextDraft.moduleOverrides[target] = {
      ...(nextDraft.moduleOverrides[target] ?? {}),
      features: nextFeatures,
      laboFeatureIds: nextIds,
    } as Partial<Module>;
    return { nextDraft, moduleId: target };
  };

  const associateCatalogFeature = async (feature: LaboRecordFeatureDefinition, add: boolean) => {
    const isAlreadyAssociated = associatedIds.includes(feature.id);
    if (add && isAlreadyAssociated) return;
    if (!add && !isAlreadyAssociated) return;
    const association = buildModuleAssociation(feature.id, add);
    if (!association) return;
    const result = add
      ? `« ${feature.label} » est associée au module.`
      : `« ${feature.label} » n’est plus associée au module. Ses fiches existantes sont conservées.`;
    await persist(association.nextDraft, result, association.moduleId);
  };

  const createFeature = async () => {
    const feature: LaboRecordFeatureDefinition = {
      id: createLaboFeatureId(featureLabel, 'labo') || 'labo-feature',
      label: featureLabel.trim(),
      description: featureDescription.trim(),
      kind: 'records',
      fields,
      ...(workflowEnabled ? { workflow: { stages } } : {}),
    };
    const errors = [
      ...(!featureLabel.trim() ? ['Donnez un nom à la fonctionnalité.'] : []),
      ...validateLaboFeatures([feature]),
      ...(catalog.some(item => item.id === feature.id)
        ? [`« ${feature.label} » existe déjà dans le catalogue LABO.`]
        : []),
    ];
    if (errors.length > 0) {
      setValidationErrors([...new Set(errors)]);
      return;
    }

    const association = buildModuleAssociation(feature.id, true);
    if (!association) return;
    association.nextDraft.laboFeatureCatalog = [...catalog, feature];
    const wasSaved = await persist(
      association.nextDraft,
      `« ${feature.label} » est enregistrée au catalogue et associée au module.`,
      association.moduleId,
    );
    if (!wasSaved) return;
    setFeatureLabel('');
    setFeatureDescription('');
    setFields([makeField(0)]);
    setWorkflowEnabled(false);
    setStages([makeStage(0), makeStage(1)]);
  };

  const addField = () => setFields(current => [...current, makeField(current.length)]);
  const removeField = (index: number) => {
    const removedId = fields[index]?.id;
    setFields(current => current.filter((_, fieldIndex) => fieldIndex !== index));
    if (removedId) {
      setStages(current => current.map(stage => ({
        ...stage,
        requiredFieldIds: stage.requiredFieldIds.filter(id => id !== removedId),
      })));
    }
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

  return (
    <main className="min-h-[100dvh] bg-[#f1efe9] px-4 py-5 text-[#26323a] sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 border-b border-[#d8d5cd] pb-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-[#286c73]">
            <FlaskConical size={15} strokeWidth={2.4} />
            MAXIMUS / LABO
          </div>
          <h1 className="text-3xl font-black tracking-[-.05em] text-[#26323a] sm:text-4xl">
            Fonctionnalités des modules
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687479]">
            Choisissez un module, associez une fiche existante ou créez-en une nouvelle. Toute nouvelle fiche est ajoutée au catalogue LABO.
          </p>
        </header>

        <div className="space-y-5">
          <section className={`${panelClass} p-5 sm:p-6`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="block flex-1 text-sm font-bold">
                Module cible
                <select
                  data-testid="select-target-module"
                  value={target}
                  onChange={event => selectTarget(event.target.value)}
                  className={`${inputClass} mt-2`}
                >
                  <option value="new">Créer un nouveau module…</option>
                  {modules.map(module => (
                    <option key={module.id} value={module.id}>{module.name}</option>
                  ))}
                </select>
              </label>
              {selectedModule && (
                <p className="pb-2 text-xs text-[#788286]">
                  {associatedIds.length} fonctionnalité{associatedIds.length === 1 ? '' : 's'} LABO associée{associatedIds.length === 1 ? '' : 's'}
                </p>
              )}
            </div>
            {target === 'new' && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Nom du module
                  <input
                    data-testid="input-module-name"
                    value={moduleLabel}
                    onChange={event => setModuleLabel(event.target.value)}
                    placeholder="Ex. Qualité terrain"
                    className={`${inputClass} mt-2 font-normal`}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Description
                  <input
                    data-testid="input-module-description"
                    value={moduleDescription}
                    onChange={event => setModuleDescription(event.target.value)}
                    placeholder="À quoi sert cet espace ?"
                    className={`${inputClass} mt-2 font-normal`}
                  />
                </label>
              </div>
            )}
          </section>

          <section className={`${panelClass} overflow-hidden`}>
            <div className="border-b border-[#e5e1d8] px-5 py-4 sm:px-6">
              <h2 className="text-lg font-black tracking-[-.03em]">Catalogue LABO</h2>
              <p className="mt-1 text-xs leading-5 text-[#788286]">
                Comme les fonctionnalités d’un pack, choisissez celles qui appartiennent à ce module.
              </p>
            </div>
            <div className="divide-y divide-[#ece9e1]">
              {catalogFeatures.length === 0 ? (
                <p className="px-5 py-5 text-sm text-[#788286]">
                  Le catalogue est vide. Créez une fiche ci-dessous pour la rendre disponible aux autres modules.
                </p>
              ) : (
                catalogFeatures.map(feature => {
                  const associated = associatedIds.includes(feature.id);
                  return (
                    <article key={feature.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold">{feature.label}</h3>
                        <p className="mt-1 text-xs text-[#788286]">
                          {feature.fields.length} champ{feature.fields.length === 1 ? '' : 's'}
                          {feature.workflow ? ` · ${feature.workflow.stages.length} étapes` : ''}
                          {feature.description ? ` · ${feature.description}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        data-testid={`${associated ? 'button-remove' : 'button-associate'}-feature-${feature.id}`}
                        onClick={() => void associateCatalogFeature(feature, !associated)}
                        disabled={publishing || (target === 'new' && (!moduleLabel.trim() || !moduleDescription.trim()))}
                        className={associated ? buttonClass : 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#286c73] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#205b61] disabled:cursor-not-allowed disabled:opacity-50'}
                      >
                        {associated ? <><Check size={14} /> Associée · retirer</> : <><Plus size={14} /> Associer au module</>}
                      </button>
                    </article>
                  );
                })
              )}
            </div>
            <p className="border-t border-[#e5e1d8] bg-[#f7f5ef] px-5 py-3 text-xs leading-5 text-[#788286] sm:px-6">
              Une association ne déplace pas les données : chaque module garde ses propres fiches.
            </p>
          </section>

          <section className={`${panelClass} overflow-hidden`}>
            <div className="border-b border-[#e5e1d8] px-5 py-4 sm:px-6">
              <h2 className="text-lg font-black tracking-[-.03em]">Créer une fonctionnalité</h2>
              <p className="mt-1 text-xs leading-5 text-[#788286]">
                Elle sera enregistrée dans le catalogue et associée à « {target === 'new' ? moduleLabel || 'votre module' : selectedModule?.name} ».
              </p>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Nom de la fonctionnalité
                  <input
                    data-testid="input-feature-name"
                    value={featureLabel}
                    onChange={event => setFeatureLabel(event.target.value)}
                    placeholder="Ex. Visites de contrôle"
                    className={`${inputClass} mt-2 font-normal`}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Description <span className="font-normal text-[#899394]">(facultatif)</span>
                  <input
                    data-testid="input-feature-description"
                    value={featureDescription}
                    onChange={event => setFeatureDescription(event.target.value)}
                    placeholder="À quoi sert cette fiche ?"
                    className={`${inputClass} mt-2 font-normal`}
                  />
                </label>
              </div>

              <div className="rounded-xl border border-[#e5e1d8]">
                <button
                  type="button"
                  data-testid="button-toggle-definition"
                  aria-expanded={showFields}
                  onClick={() => setShowFields(value => !value)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-bold">Champs de la fiche</span>
                    <span className="mt-0.5 block text-xs text-[#788286]">
                      {fields.length} champ{fields.length === 1 ? '' : 's'} · le premier champ « Titre » est déjà prêt
                    </span>
                  </span>
                  {showFields ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                </button>
                {showFields && (
                  <div className="space-y-3 border-t border-[#e5e1d8] bg-[#f8f6f0] p-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid gap-2 rounded-xl border border-[#e4e1d9] bg-[#fbfaf7] p-3 sm:grid-cols-[1fr_.8fr_auto_auto] sm:items-center">
                        <input
                          data-testid={`input-field-label-${index}`}
                          value={field.label}
                          onChange={event => updateField(index, {
                            label: event.target.value,
                            id: field.id.startsWith('field-')
                              ? createLaboFeatureId(event.target.value, 'field') || `field-${index + 1}`
                              : field.id,
                          })}
                          className={inputClass}
                          placeholder="Nom du champ"
                        />
                        <select
                          data-testid={`select-field-type-${index}`}
                          value={field.type}
                          onChange={event => updateField(index, {
                            type: event.target.value as LaboFieldDefinition['type'],
                            options: event.target.value === 'select' ? field.options ?? ['Option 1'] : undefined,
                          })}
                          className={inputClass}
                        >
                          <option value="text">Texte</option>
                          <option value="number">Nombre</option>
                          <option value="date">Date</option>
                          <option value="select">Choix</option>
                          <option value="boolean">Oui / non</option>
                        </select>
                        <label className="flex items-center gap-2 whitespace-nowrap text-xs text-[#687479]">
                          <input
                            data-testid={`checkbox-field-required-${index}`}
                            type="checkbox"
                            checked={field.required}
                            onChange={event => updateField(index, { required: event.target.checked })}
                            className="accent-[#286c73]"
                          />
                          Requis
                        </label>
                        <button
                          type="button"
                          data-testid={`button-remove-field-${index}`}
                          aria-label="Supprimer le champ"
                          disabled={fields.length === 1}
                          onClick={() => removeField(index)}
                          className="rounded-lg p-2 text-[#a86158] hover:bg-[#f6e9e4] disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                        {field.type === 'select' && (
                          <input
                            data-testid={`input-field-options-${index}`}
                            value={(field.options ?? []).join(', ')}
                            onChange={event => updateField(index, {
                              options: event.target.value.split(',').map(value => value.trim()).filter(Boolean),
                            })}
                            className={`${inputClass} sm:col-span-3`}
                            placeholder="Choix séparés par des virgules"
                          />
                        )}
                      </div>
                    ))}
                    <button type="button" data-testid="button-add-field" onClick={addField} className={buttonClass}>
                      <Plus size={14} /> Ajouter un champ
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#e5e1d8] px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold">Workflow</p>
                    <p className="mt-0.5 text-xs text-[#788286]">Facultatif · ajoutez des étapes seulement si nécessaire.</p>
                  </div>
                  <button
                    type="button"
                    data-testid="checkbox-workflow-enabled"
                    role="switch"
                    aria-checked={workflowEnabled}
                    onClick={() => setWorkflowEnabled(value => !value)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${workflowEnabled ? 'bg-[#286c73]' : 'bg-[#d1d3ca]'}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-[#fbfaf7] shadow-sm transition-transform ${workflowEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {workflowEnabled && (
                  <div className="mt-4 space-y-2 border-t border-[#e5e1d8] pt-4">
                    {stages.map((stage, index) => (
                      <div key={stage.id} className="rounded-xl border border-[#e1ded6] bg-[#f8f6f0] p-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dcebe5] text-xs font-bold text-[#286c73]">{index + 1}</span>
                          <input
                            data-testid={`input-stage-label-${index}`}
                            value={stage.label}
                            onChange={event => setStages(current => current.map((item, stageIndex) =>
                              stageIndex === index
                                ? {
                                    ...item,
                                    label: event.target.value,
                                    id: item.id.startsWith('stage-')
                                      ? createLaboFeatureId(event.target.value, 'stage') || `stage-${index + 1}`
                                      : item.id,
                                  }
                                : item,
                            ))}
                            className={inputClass}
                            placeholder="Nom de l’étape"
                          />
                          {stages.length > 2 && (
                            <button
                              type="button"
                              data-testid={`button-remove-stage-${index}`}
                              aria-label="Supprimer l’étape"
                              onClick={() => setStages(current => current.filter((_, stageIndex) => stageIndex !== index))}
                              className="rounded-lg p-2 text-[#a86158] hover:bg-[#f6e9e4]"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 pl-9">
                          {fields.map(field => (
                            <button
                              type="button"
                              data-testid={`button-stage-field-${index}-${field.id}`}
                              key={field.id}
                              onClick={() => setStages(current => current.map((item, stageIndex) =>
                                stageIndex === index
                                  ? {
                                      ...item,
                                      requiredFieldIds: item.requiredFieldIds.includes(field.id)
                                        ? item.requiredFieldIds.filter(id => id !== field.id)
                                        : [...item.requiredFieldIds, field.id],
                                    }
                                  : item,
                              ))}
                              className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${stage.requiredFieldIds.includes(field.id) ? 'border-[#286c73] bg-[#e6f1ed] text-[#286c73]' : 'border-[#e2dfd7] text-[#8a9292] hover:border-[#b9c8c4]'}`}
                            >
                              {stage.requiredFieldIds.includes(field.id) ? 'Requis · ' : ''}{field.label || 'Champ sans nom'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      data-testid="button-add-stage"
                      onClick={() => setStages(current => [
                        ...current,
                        { id: `stage-${Date.now()}`, label: `Étape ${current.length + 1}`, requiredFieldIds: [] },
                      ])}
                      className={buttonClass}
                    >
                      <Plus size={14} /> Ajouter une étape
                    </button>
                  </div>
                )}
              </div>

              {validationErrors.length > 0 && (
                <div data-testid="status-validation-errors" className="rounded-xl border border-[#e7c9bf] bg-[#fbefeb] p-3 text-xs leading-5 text-[#9a554b]">
                  <div className="mb-1 flex items-center gap-2 font-bold"><CircleAlert size={14} /> Vérifiez les informations</div>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {validationErrors.map(error => <li key={error}>{error}</li>)}
                  </ul>
                </div>
              )}
              {publishError && (
                <div data-testid="status-publish-error" className="rounded-xl border border-[#e7c9bf] bg-[#fbefeb] p-3 text-xs leading-5 text-[#9a554b]">
                  {publishError}
                </div>
              )}
              {savedMessage && (
                <div data-testid="status-published" className="flex items-center gap-2 rounded-xl border border-[#c4ddd1] bg-[#edf7f1] p-3 text-xs font-semibold text-[#286c73]">
                  <Check size={15} /> {savedMessage}
                </div>
              )}
              <button
                type="button"
                data-testid="button-publish-labo"
                onClick={() => void createFeature()}
                disabled={publishing || (target === 'new' && (!moduleLabel.trim() || !moduleDescription.trim()))}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#286c73] px-4 py-3 text-sm font-bold text-[#f8faf5] transition hover:bg-[#205b61] disabled:cursor-wait disabled:opacity-60"
              >
                <Save size={16} /> {publishing ? 'Enregistrement…' : 'Créer et ajouter au catalogue'}
              </button>
              <p className="text-center text-xs text-[#899394]">
                Les fonctions natives restent dans leur module. Aucun enregistrement existant n’est déplacé.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}