import { useState } from 'react';
import { Check, CircleAlert, FlaskConical, Plus } from 'lucide-react';
import type { Module } from '@/lib/store';
import { getModuleFeatureOptions } from '@/lib/module-features';
import {
  createLaboFeatureId,
  createLaboReuseFeatureId,
  type LaboFeatureDefinition,
  type LaboReusedFeatureDefinition,
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

type NativeFeature = {
  sourceModule: Module;
  id: string;
  label: string;
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

function nativeFeaturesOf(modules: Module[]): NativeFeature[] {
  return modules.flatMap(sourceModule => {
    const module = sourceModule as LaboModule;
    const laboIds = new Set([
      ...(module.laboFeatureIds ?? []),
      ...(module.laboFeatures ?? []).map(feature => feature.id),
    ]);

    return getModuleFeatureOptions(module)
      .filter(feature => !laboIds.has(feature.id))
      .map(feature => ({
        sourceModule,
        id: feature.id,
        label: feature.label,
      }));
  });
}

function getReuseDefinition(
  sourceModule: Module,
  feature: NativeFeature,
  catalog: LaboFeatureDefinition[],
): LaboReusedFeatureDefinition {
  const existing = catalog.find(item =>
    item.kind === 'reuse'
    && item.sourceModuleId === sourceModule.id
    && item.sourceFeatureId === feature.id,
  );
  if (existing?.kind === 'reuse') return existing;

  return {
    id: createLaboReuseFeatureId(sourceModule.id, feature.id),
    label: feature.label,
    description: `Fonctionnalité native de ${sourceModule.name}.`,
    kind: 'reuse',
    sourceModuleId: sourceModule.id,
    sourceFeatureId: feature.id,
  };
}

export function LaboWorkbenchPage({ modules, draft, onDraftChange, onPublish }: WorkbenchProps) {
  const [target, setTarget] = useState(modules[0]?.id ?? 'new');
  const [moduleLabel, setModuleLabel] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [publishError, setPublishError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [publishing, setPublishing] = useState(false);

  const catalog = draft.laboFeatureCatalog ?? [];
  const selectedModule = target === 'new' ? undefined : modules.find(module => module.id === target);
  const configuredTarget = selectedModule ? moduleWithFeatures(selectedModule, draft) : undefined;
  const associatedIds = configuredTarget?.laboFeatureIds ?? [];
  const nativeFeatures = nativeFeaturesOf(modules).filter(
    feature => !selectedModule || feature.sourceModule.id !== selectedModule.id,
  );
  const nativeAssociationsCount =
    configuredTarget?.laboFeatures?.filter(feature => feature.kind === 'reuse').length ?? 0;

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
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'L’enregistrement a échoué.');
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
      const duplicate = modules.find(module => module.id === moduleId);
      if (duplicate) {
        setValidationErrors([`« ${moduleLabel.trim()} » correspond déjà au module « ${duplicate.name} ». Sélectionnez-le dans la liste.`]);
        return null;
      }
      const nextModule: Module = {
        id: moduleId as Module['id'],
        name: moduleLabel.trim(),
        description: moduleDescription.trim(),
        features: [],
        laboFeatureIds: [featureId],
        status: 'ACTIF',
      };
      nextDraft.customModules = [...nextDraft.customModules, nextModule];
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

    nextDraft.moduleOverrides[target] = {
      ...(nextDraft.moduleOverrides[target] ?? {}),
      laboFeatureIds: nextIds,
    } as Partial<Module>;
    return { nextDraft, moduleId: target };
  };

  const toggleNativeFeature = async (feature: NativeFeature, add: boolean) => {
    const definition = getReuseDefinition(feature.sourceModule, feature, catalog);
    const matchingId = catalog.find(item => item.id === definition.id);
    const sameSource = matchingId?.kind === 'reuse'
      && matchingId.sourceModuleId === feature.sourceModule.id
      && matchingId.sourceFeatureId === feature.id;
    if (add && matchingId && !sameSource) {
      setValidationErrors([`L’identifiant « ${definition.id} » est déjà utilisé dans le catalogue LABO.`]);
      return;
    }

    const association = buildModuleAssociation(definition.id, add);
    if (!association) return;
    if (add && !sameSource) {
      association.nextDraft.laboFeatureCatalog = [...catalog, definition];
    }

    const message = add
      ? `« ${feature.label} » est montée depuis ${feature.sourceModule.name}.`
      : `« ${feature.label} » a été retirée du module cible. La source et ses données sont conservées.`;
    await persist(association.nextDraft, message, association.moduleId);
  };

  const groupedFeatures = modules
    .filter(module => nativeFeatures.some(feature => feature.sourceModule.id === module.id))
    .map(sourceModule => ({
      sourceModule,
      features: nativeFeatures.filter(feature => feature.sourceModule.id === sourceModule.id),
    }));

  return (
    <main className="min-h-[100dvh] bg-[#f1efe9] px-4 py-5 text-[#26323a] sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 border-b border-[#d8d5cd] pb-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-[#286c73]">
            <FlaskConical size={15} strokeWidth={2.4} />
            MAXIMUS / LABO
          </div>
          <h1 className="text-3xl font-black tracking-[-.05em] text-[#26323a] sm:text-4xl">
            Composer les fonctionnalités
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687479]">
            Choisissez un module cible et montez-y directement des fonctionnalités natives déjà disponibles.
            Leur module source reste inchangé.
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
                  {nativeAssociationsCount} fonctionnalité{nativeAssociationsCount === 1 ? '' : 's'} montée{nativeAssociationsCount === 1 ? '' : 's'}
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
              <h2 className="text-lg font-black tracking-[-.03em]">Fonctionnalités natives</h2>
              <p className="mt-1 text-xs leading-5 text-[#788286]">
                Sélectionnez une fonction d’un autre module pour l’ajouter ici. Elle reste exécutée et administrée à sa source.
              </p>
            </div>

            {groupedFeatures.length === 0 ? (
              <p className="px-5 py-5 text-sm text-[#788286]">
                Aucune fonctionnalité d’un autre module n’est disponible pour ce choix.
              </p>
            ) : (
              <div className="divide-y divide-[#ece9e1]">
                {groupedFeatures.map(({ sourceModule, features }) => (
                  <section key={sourceModule.id} aria-label={`Fonctionnalités de ${sourceModule.name}`}>
                    <h3 className="bg-[#f7f5ef] px-5 py-2.5 text-[10px] font-black uppercase tracking-[.15em] text-[#768184] sm:px-6">
                      {sourceModule.name}
                    </h3>
                    <div className="divide-y divide-[#f0eee8]">
                      {features.map(feature => {
                        const definition = getReuseDefinition(sourceModule, feature, catalog);
                        const associated = associatedIds.includes(definition.id);
                        return (
                          <article key={`${sourceModule.id}-${feature.id}`} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold">{feature.label}</h4>
                              <p className="mt-1 text-xs text-[#788286]">
                                Fonctionnalité native · source : {sourceModule.name}
                              </p>
                            </div>
                            <button
                              type="button"
                              data-testid={`${associated ? 'button-remove' : 'button-associate'}-native-${sourceModule.id}-${feature.id}`}
                              aria-pressed={associated}
                              onClick={() => void toggleNativeFeature(feature, !associated)}
                              disabled={publishing || (target === 'new' && (!moduleLabel.trim() || !moduleDescription.trim()))}
                              className={associated
                                ? buttonClass
                                : 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#286c73] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#205b61] disabled:cursor-not-allowed disabled:opacity-50'}
                            >
                              {associated
                                ? <><Check size={14} /> Montée · retirer</>
                                : <><Plus size={14} /> Monter dans le module</>}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            <p className="border-t border-[#e5e1d8] bg-[#f7f5ef] px-5 py-3 text-xs leading-5 text-[#788286] sm:px-6">
              Le montage ajoute un accès à la fonctionnalité native. Il ne copie, ne déplace et ne supprime aucune donnée.
            </p>
          </section>

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
        </div>
      </div>
    </main>
  );
}