import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Layers3,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Brand } from '@/components/app-ui';
import { getPublishedCatalogSnapshot, type CatalogSnapshot } from '@/lib/catalog-workflow';
import { provisionCompanyAccess } from '@/lib/company-access-provisioning';
import {
  getConfiguredModules,
  type Company,
  type Module,
  type ModuleId,
  type OrgNode,
  type StoreData,
} from '@/lib/store';

type Mutate = (fn: (data: StoreData) => void, message?: string) => void;
type OnboardingCompany = Company & {
  onboardingCompleted?: boolean;
  onboardingStep?: number;
};
type UnitType = OrgNode['type'];

const steps = [
  { number: 1, label: 'Votre activité', shortLabel: 'Activité' },
  { number: 2, label: 'Vos modules', shortLabel: 'Modules' },
  { number: 3, label: 'Votre unité', shortLabel: 'Unité' },
  { number: 4, label: 'Vérification', shortLabel: 'Résumé' },
] as const;

const unitTypes: { value: UnitType; label: string; description: string }[] = [
  { value: 'direction', label: 'Direction', description: 'Le niveau racine de votre organisation' },
  { value: 'sector', label: 'Secteur', description: 'Une activité ou une grande équipe' },
  { value: 'service', label: 'Service', description: 'Un service rattaché à l’organisation' },
  { value: 'department', label: 'Département', description: 'Une équipe ou un département' },
];

function getRootNode(data: StoreData, companyId: string) {
  return data.orgNodes.find((node) => node.companyId === companyId && !node.parentId);
}

function initialCode(companyName: string) {
  const code = companyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 5)
    .toUpperCase();
  return code || 'RACINE';
}

function selectedPackIdsFor(
  moduleId: ModuleId,
  company: Company,
  preset: CatalogSnapshot['sectorPresets'][number] | undefined,
) {
  const requested = company.requestedModulePackIds?.[moduleId];
  if (requested?.length) return [...requested];
  return [...(preset?.modulePackIds?.[moduleId] ?? [])];
}

export function CompanyOnboardingPage({
  data,
  company,
  mutate,
  onComplete,
  onExit,
}: {
  data: StoreData;
  company: Company;
  mutate: Mutate;
  onComplete: () => void;
  onExit: () => void;
}) {
  const catalog = useMemo(() => getPublishedCatalogSnapshot(data), [data]);
  const configuredModules = useMemo(
    () =>
      getConfiguredModules({
        moduleOverrides: catalog.moduleOverrides,
        removedModules: catalog.removedModules,
      }).filter((module) => {
        const catalogStatus = catalog.moduleStatuses[module.id] ?? module.status;
        return !catalog.removedModules.includes(module.id) && (catalogStatus === 'ACTIF' || catalogStatus === 'BETA');
      }),
    [catalog],
  );
  const sectors = catalog.sectorPresets ?? [];
  const companyModuleIds = useMemo(
    () => new Set(company.allowedModules.length ? company.allowedModules : company.requestedModules),
    [company.allowedModules, company.requestedModules],
  );
  const availableModuleIds = useMemo(
    () => new Set(configuredModules.map((module) => module.id)),
    [configuredModules],
  );
  const rootNode = useMemo(() => getRootNode(data, company.id), [data, company.id]);
  const initialSector = useMemo(
    () =>
      sectors.find(
        (sector) =>
          sector.id === company.requestedBusinessProfileId ||
          sector.id === company.sector ||
          sector.name === company.sector,
      ) ?? sectors[0],
    [company.requestedBusinessProfileId, company.sector, sectors],
  );
  const initialModuleIds = useMemo(() => {
    const onboardingSelection = company.onboardingSelectedModuleIds?.filter(
      (moduleId) => availableModuleIds.has(moduleId) && companyModuleIds.has(moduleId),
    );
    if (onboardingSelection?.length) return onboardingSelection;
    const requested = company.requestedModules.filter(
      (moduleId) => availableModuleIds.has(moduleId) && companyModuleIds.has(moduleId),
    );
    if (requested.length) return requested;
    return (initialSector?.moduleIds ?? []).filter(
      (moduleId) => availableModuleIds.has(moduleId) && companyModuleIds.has(moduleId),
    );
  }, [availableModuleIds, company.onboardingSelectedModuleIds, company.requestedModules, companyModuleIds, initialSector]);
  const initialPackIds = useMemo(() => {
    if (company.onboardingModulePackIds) {
      return Object.fromEntries(
        Object.entries(company.onboardingModulePackIds)
          .filter(([moduleId]) => initialModuleIds.includes(moduleId as ModuleId))
          .map(([moduleId, packIds]) => [moduleId, [...(packIds ?? [])]]),
      ) as Partial<Record<ModuleId, string[]>>;
    }
    const packs: Partial<Record<ModuleId, string[]>> = {};
    initialModuleIds.forEach((moduleId) => {
      const selected = selectedPackIdsFor(moduleId, company, initialSector);
      if (selected.length) packs[moduleId] = selected;
    });
    return packs;
  }, [company, initialModuleIds, initialSector]);

  const [step, setStep] = useState(() => Math.min(Math.max(company.onboardingStep ?? 1, 1), 4));
  const [sectorId, setSectorId] = useState(initialSector?.id ?? '');
  const [selectedModuleIds, setSelectedModuleIds] = useState<ModuleId[]>(initialModuleIds);
  const [modulePackIds, setModulePackIds] =
    useState<Partial<Record<ModuleId, string[]>>>(initialPackIds);
  const [rootName, setRootName] = useState(company.onboardingRootName ?? rootNode?.name ?? company.name);
  const [rootCode, setRootCode] = useState(company.onboardingRootCode ?? rootNode?.code ?? initialCode(company.name));
  const [rootType, setRootType] = useState<UnitType>(company.onboardingRootType ?? rootNode?.type ?? 'direction');
  const [attempted, setAttempted] = useState(false);

  const selectedSector = sectors.find((sector) => sector.id === sectorId);
  const selectedModules = configuredModules.filter((module) => selectedModuleIds.includes(module.id));
  const completion = Math.round(((step - 1) / (steps.length - 1)) * 100);
  const canContinue =
    step === 1
      ? Boolean(selectedSector)
      : step === 2
        ? selectedModuleIds.length > 0
        : step === 3
          ? Boolean(rootName.trim() && rootCode.trim())
          : true;

  const chooseSector = (nextSectorId: string) => {
    setSectorId(nextSectorId);
    const nextSector = sectors.find((sector) => sector.id === nextSectorId);
    const nextIds = (nextSector?.moduleIds ?? []).filter(
      (moduleId) => availableModuleIds.has(moduleId) && companyModuleIds.has(moduleId),
    );
    setSelectedModuleIds(nextIds);
    const nextPacks: Partial<Record<ModuleId, string[]>> = {};
    nextIds.forEach((moduleId) => {
      const packIds = nextSector?.modulePackIds?.[moduleId] ?? [];
      if (packIds.length) nextPacks[moduleId] = [...packIds];
    });
    setModulePackIds(nextPacks);
    setAttempted(false);
  };

  const toggleModule = (moduleId: ModuleId) => {
    setSelectedModuleIds((current) => {
      if (current.includes(moduleId)) {
        setModulePackIds((packs) => {
          const next = { ...packs };
          delete next[moduleId];
          return next;
        });
        return current.filter((id) => id !== moduleId);
      }
      if (!companyModuleIds.has(moduleId)) return current;
      const module = configuredModules.find((candidate) => candidate.id === moduleId);
      const defaultPack = selectedSector?.modulePackIds?.[moduleId] ?? [];
      if (defaultPack.length || (module?.featurePacks?.length ?? 0) === 1) {
        setModulePackIds((packs) => ({
          ...packs,
          [moduleId]: [...(defaultPack.length ? defaultPack : [module?.featurePacks?.[0]?.id ?? '']).filter(Boolean)],
        }));
      }
      return [...current, moduleId];
    });
  };

  const updatePack = (moduleId: ModuleId, packId: string) => {
    setModulePackIds((current) => ({
      ...current,
      [moduleId]: packId ? [packId] : [],
    }));
  };

  const persistProgress = (nextStep: number) => {
    mutate((draft) => {
      const targetCompany = draft.companies.find((candidate) => candidate.id === company.id);
      if (!targetCompany) return;
      targetCompany.onboardingStep = nextStep;
      targetCompany.onboardingSelectedModuleIds = [...selectedModuleIds];
      targetCompany.onboardingModulePackIds = Object.fromEntries(
        Object.entries(modulePackIds).map(([moduleId, packIds]) => [moduleId, [...(packIds ?? [])]]),
      ) as Partial<Record<ModuleId, string[]>>;
      targetCompany.onboardingRootName = rootName.trim();
      targetCompany.onboardingRootCode = rootCode.trim();
      targetCompany.onboardingRootType = rootType;
      targetCompany.requestedBusinessProfileId = selectedSector?.id;
      targetCompany.sector = selectedSector?.name ?? targetCompany.sector;
    }, 'Progression enregistrée.');
  };

  const goNext = () => {
    setAttempted(true);
    if (!canContinue) return;
    if (step < 4) {
      persistProgress(step + 1);
      setStep((current) => current + 1);
      setAttempted(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((current) => current - 1);
      setAttempted(false);
    }
  };

  const completeOnboarding = () => {
    setAttempted(true);
    if (!selectedSector || !selectedModuleIds.length || !rootName.trim() || !rootCode.trim()) return;
    mutate(
      (draft) => {
        const targetCompany =
          (draft.companies.find((candidate) => candidate.id === company.id) as OnboardingCompany | undefined) ??
          (company as OnboardingCompany);
        provisionCompanyAccess(draft, targetCompany, {
          moduleIds: selectedModuleIds,
          modulePackIds,
          root: {
            name: rootName.trim(),
            code: rootCode.trim(),
            type: rootType,
          },
        });
        targetCompany.sector = selectedSector.name;
        targetCompany.requestedBusinessProfileId = selectedSector.id;
        targetCompany.onboardingCompleted = true;
        targetCompany.onboardingStep = 4;
        delete targetCompany.onboardingSelectedModuleIds;
        delete targetCompany.onboardingModulePackIds;
        delete targetCompany.onboardingRootName;
        delete targetCompany.onboardingRootCode;
        delete targetCompany.onboardingRootType;
      },
      'Configuration de votre espace terminée.',
    );
    onComplete();
  };

  const renderProgress = () => (
    <div className="flex items-center gap-2 sm:gap-3" aria-label="Progression de la configuration">
      {steps.map((item, index) => (
        <div key={item.number} className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                item.number < step
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                  : item.number === step
                    ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] ring-4 ring-[hsl(var(--accent)/.13)]'
                    : 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]'
              }`}
              aria-current={item.number === step ? 'step' : undefined}
            >
              {item.number < step ? <Check size={15} strokeWidth={3} /> : item.number}
            </span>
            <span className={`hidden truncate text-xs font-bold sm:block ${item.number <= step ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
              {item.label}
            </span>
            <span className={`truncate text-[11px] font-bold sm:hidden ${item.number <= step ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
              {item.shortLabel}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`h-px min-w-2 flex-1 ${item.number < step ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--border))]'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderSectorStep = () => (
    <section aria-labelledby="onboarding-step-title">
      <div className="mb-7 max-w-2xl">
        <span className="mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">01 · Le point de départ</span>
        <h1 id="onboarding-step-title" className="mt-3 text-3xl font-bold tracking-[-.055em] text-[hsl(var(--foreground))] sm:text-4xl">
          Parlons de votre activité.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Ce choix nous aide à vous proposer une première configuration cohérente. Vous pourrez toujours l’affiner ensuite.
        </p>
      </div>
      {sectors.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {sectors.map((sector) => {
            const active = sector.id === sectorId;
            const count = sector.moduleIds.filter((moduleId) => availableModuleIds.has(moduleId)).length;
            return (
              <button
                key={sector.id}
                type="button"
                data-testid={`sector-option-${sector.id}`}
                aria-pressed={active}
                onClick={() => chooseSector(sector.id)}
                className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/.45)] hover:shadow-[0_10px_25px_hsl(var(--primary)/.08)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.35)] ${
                  active
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.075)] shadow-[0_8px_24px_hsl(var(--primary)/.1)]'
                    : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                }`}
              >
                <span className={`mb-8 flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                  <Building2 size={18} />
                </span>
                <span className="block text-base font-bold">{sector.name}</span>
                <span className="mt-1 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  Une base prête à l’emploi avec {count} module{count > 1 ? 's' : ''} recommandé{count > 1 ? 's' : ''} pour cette activité.
                </span>
                <span className={`mt-5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] ${active ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                  {active ? <CheckCircle2 size={13} /> : <Layers3 size={13} />}
                  {count} module{count > 1 ? 's' : ''} disponible{count > 1 ? 's' : ''}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/.35)] p-8 text-center">
          <CircleHelp className="mx-auto text-[hsl(var(--muted-foreground))]" size={24} />
          <h2 className="mt-3 text-base font-bold">Aucune activité n’est publiée pour le moment</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Votre administrateur doit publier un catalogue avant de poursuivre la configuration.
          </p>
        </div>
      )}
      {attempted && !selectedSector && sectors.length > 0 && (
        <p className="mt-4 text-sm font-semibold text-[hsl(var(--destructive))]" role="alert">
          Sélectionnez votre activité pour continuer.
        </p>
      )}
    </section>
  );

  const renderModulesStep = () => (
    <section aria-labelledby="onboarding-step-title">
      <div className="mb-7 max-w-2xl">
        <span className="mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">02 · Les bons outils</span>
        <h1 id="onboarding-step-title" className="mt-3 text-3xl font-bold tracking-[-.055em] sm:text-4xl">
          Composez votre espace de travail.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Nous avons préparé une sélection pour <strong className="text-[hsl(var(--foreground))]">{selectedSector?.name ?? 'votre activité'}</strong>. Gardez uniquement ce qui est utile aujourd’hui.
        </p>
      </div>
      {configuredModules.length ? (
        <div className="space-y-3">
          {configuredModules.map((module) => {
            const active = selectedModuleIds.includes(module.id);
            const moduleEnabled = companyModuleIds.has(module.id);
            const packs = module.featurePacks ?? [];
            const selectedPack = modulePackIds[module.id]?.[0] ?? '';
            return (
              <div
                key={module.id}
                className={`rounded-2xl border p-4 transition sm:p-5 ${!moduleEnabled ? 'opacity-60' : active ? 'border-[hsl(var(--primary)/.45)] bg-[hsl(var(--card))] shadow-[0_6px_18px_hsl(var(--primary)/.055)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)]'}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    id={`module-${module.id}`}
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleModule(module.id)}
                    disabled={!moduleEnabled}
                    className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                    data-testid={`checkbox-module-${module.id}`}
                  />
                  <label htmlFor={`module-${module.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">{module.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] ${!moduleEnabled ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]' : module.status === 'BETA' ? 'bg-[hsl(var(--accent)/.2)] text-[hsl(var(--foreground))]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}>
                        {!moduleEnabled ? 'À activer' : module.status === 'BETA' ? 'Bêta' : 'Disponible'}
                      </span>
                    </span>
                    <span className="mt-1 block max-w-2xl text-xs leading-5 text-[hsl(var(--muted-foreground))]">{module.description}</span>
                    {!moduleEnabled && (
                      <span className="mt-2 block text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                        Ce module est publié mais n’est pas encore activé pour votre entreprise.
                      </span>
                    )}
                  </label>
                  <span className={`mt-0.5 hidden h-6 w-6 shrink-0 items-center justify-center rounded-full sm:flex ${active ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                    {active ? <Check size={14} /> : <Layers3 size={14} />}
                  </span>
                </div>
                {active && packs.length > 0 && (
                  <div className="ml-7 mt-4 max-w-md">
                    <label htmlFor={`pack-${module.id}`} className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">
                      Niveau de configuration
                    </label>
                    <div className="relative">
                      <select
                        id={`pack-${module.id}`}
                        value={selectedPack}
                        onChange={(event) => updatePack(module.id, event.target.value)}
                        className="w-full appearance-none rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2.5 pr-9 text-xs font-semibold focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.14)]"
                        data-testid={`select-pack-${module.id}`}
                      >
                        <option value="">Configuration standard</option>
                        {packs.map((pack) => (
                          <option key={pack.id} value={pack.id}>{pack.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    {selectedPack && (
                      <p className="mt-1.5 text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">
                        {packs.find((pack) => pack.id === selectedPack)?.description ?? 'Une configuration adaptée à votre équipe.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/.35)] p-8 text-center">
          <Layers3 className="mx-auto text-[hsl(var(--muted-foreground))]" size={24} />
          <h2 className="mt-3 text-base font-bold">Le catalogue ne contient aucun module actif</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Revenez vers votre administrateur pour publier au moins un module disponible.
          </p>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
        <span>{selectedModules.length} module{selectedModules.length > 1 ? 's' : ''} sélectionné{selectedModules.length > 1 ? 's' : ''}</span>
        <span>Vous pourrez en ajouter plus tard</span>
      </div>
      {attempted && selectedModuleIds.length === 0 && (
        <p className="mt-3 text-sm font-semibold text-[hsl(var(--destructive))]" role="alert">Choisissez au moins un module.</p>
      )}
    </section>
  );

  const renderUnitStep = () => (
    <section aria-labelledby="onboarding-step-title">
      <div className="mb-7 max-w-2xl">
        <span className="mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">03 · Le premier repère</span>
        <h1 id="onboarding-step-title" className="mt-3 text-3xl font-bold tracking-[-.055em] sm:text-4xl">
          Où commence votre organisation ?
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Cette première unité sera votre point d’entrée dans MAXIMUS. Vous pourrez ensuite créer vos équipes et vos sites.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6">
          <div className="space-y-5">
            <label className="block text-sm font-bold">
              Nom de l’unité
              <input
                value={rootName}
                onChange={(event) => setRootName(event.target.value)}
                placeholder="Ex. Direction générale"
                className="mt-2 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-3 text-sm font-normal focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.14)]"
                data-testid="input-onboarding-unit-name"
              />
              <span className="mt-1.5 block text-[11px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">Le nom visible par les personnes de votre entreprise.</span>
            </label>
            <label className="block text-sm font-bold">
              Code court
              <input
                value={rootCode}
                onChange={(event) => setRootCode(event.target.value.toUpperCase())}
                placeholder="Ex. DIRECTION"
                maxLength={18}
                className="mono mt-2 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-3 text-sm font-normal uppercase focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.14)]"
                data-testid="input-onboarding-unit-code"
              />
              <span className="mt-1.5 block text-[11px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">Un repère simple utilisé dans vos listes et exports.</span>
            </label>
            <label className="block text-sm font-bold">
              Type d’unité
              <div className="relative mt-2">
                <select
                  value={rootType}
                  onChange={(event) => setRootType(event.target.value as UnitType)}
                  className="w-full appearance-none rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-3 pr-10 text-sm font-normal focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.14)]"
                  data-testid="select-onboarding-unit-type"
                >
                  {unitTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              </div>
              <span className="mt-1.5 block text-[11px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">
                {unitTypes.find((type) => type.value === rootType)?.description}
              </span>
            </label>
          </div>
        </div>
        <div className="rounded-2xl bg-[hsl(var(--sidebar))] p-5 text-[hsl(var(--sidebar-foreground))] sm:p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--sidebar-primary)/.18)] text-[hsl(var(--sidebar-primary))]">
            <ShieldCheck size={18} />
          </div>
          <h2 className="mt-5 text-base font-bold">Une base claire, dès le premier jour</h2>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--sidebar-foreground)/.68)]">
            MAXIMUS utilisera cette unité pour organiser vos accès, vos rôles et vos futures équipes. Rien n’est figé.
          </p>
          <div className="mt-6 space-y-3 border-t border-[hsl(var(--sidebar-border))] pt-5 text-xs">
            <div className="flex items-center justify-between gap-3"><span className="text-[hsl(var(--sidebar-foreground)/.62)]">Activité</span><strong>{selectedSector?.name ?? 'À définir'}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[hsl(var(--sidebar-foreground)/.62)]">Modules</span><strong>{selectedModules.length}</strong></div>
          </div>
        </div>
      </div>
      {attempted && (!rootName.trim() || !rootCode.trim()) && (
        <p className="mt-4 text-sm font-semibold text-[hsl(var(--destructive))]" role="alert">Renseignez le nom et le code de votre première unité.</p>
      )}
    </section>
  );

  const renderSummaryStep = () => (
    <section aria-labelledby="onboarding-step-title">
      <div className="mb-7 max-w-2xl">
        <span className="mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">04 · Prêt à commencer</span>
        <h1 id="onboarding-step-title" className="mt-3 text-3xl font-bold tracking-[-.055em] sm:text-4xl">
          Vérifiez votre configuration.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Tout est prêt. Relisez ces quelques éléments avant d’ouvrir votre espace MAXIMUS.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Activité</span>
          <p className="mt-3 text-lg font-bold">{selectedSector?.name ?? 'Non sélectionnée'}</p>
          <button type="button" onClick={() => setStep(1)} className="mt-4 text-xs font-bold text-[hsl(var(--primary))] hover:underline">Modifier</button>
        </div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Modules</span>
          <p className="mt-3 text-lg font-bold">{selectedModules.length} sélectionné{selectedModules.length > 1 ? 's' : ''}</p>
          <button type="button" onClick={() => setStep(2)} className="mt-4 text-xs font-bold text-[hsl(var(--primary))] hover:underline">Modifier</button>
        </div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Unité racine</span>
          <p className="mt-3 truncate text-lg font-bold">{rootName || 'À renseigner'}</p>
          <p className="mono mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{rootCode || '—'} · {unitTypes.find((type) => type.value === rootType)?.label}</p>
          <button type="button" onClick={() => setStep(3)} className="mt-3 text-xs font-bold text-[hsl(var(--primary))] hover:underline">Modifier</button>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Sparkles size={16} /></span>
          <div>
            <h2 className="text-sm font-bold">Ce qui va se passer ensuite</h2>
            <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Votre espace sera créé avec les modules choisis et une première unité organisationnelle. Vous pourrez immédiatement inviter votre équipe et compléter votre structure.
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.9)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Brand large homeHref="/" />
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
            data-testid="button-exit-onboarding"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Quitter la configuration</span>
            <span className="sm:hidden">Quitter</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-6 sm:px-8 sm:py-9 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <aside className="lg:pt-2">
          <div className="mb-5 flex items-center justify-between lg:block">
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Configuration</p>
              <p className="mt-1 text-sm font-bold">{company.name}</p>
            </div>
            <span className="mono text-xs font-bold text-[hsl(var(--primary))] lg:mt-7 lg:block">{String(completion).padStart(2, '0')}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted))] lg:mb-8 lg:h-1">
            <div className="h-full rounded-full bg-[hsl(var(--primary))] transition-all duration-300" style={{ width: `${Math.max(completion, 8)}%` }} />
          </div>
          <nav className="hidden space-y-1 lg:block" aria-label="Étapes de configuration">
            {steps.map((item) => (
              <button
                key={item.number}
                type="button"
                onClick={() => item.number < step && setStep(item.number)}
                disabled={item.number >= step}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold transition ${item.number === step ? 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : item.number < step ? 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]' : 'cursor-default text-[hsl(var(--muted-foreground))]'}`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${item.number < step ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : item.number === step ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))]'}`}>
                  {item.number < step ? <Check size={12} strokeWidth={3} /> : item.number}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-7 hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] p-4 lg:block">
            <CircleHelp size={16} className="text-[hsl(var(--primary))]" />
            <p className="mt-3 text-xs font-bold">Besoin d’aide ?</p>
            <p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Chaque choix peut être modifié après l’ouverture de votre espace.</p>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-8 lg:hidden">{renderProgress()}</div>
          <div className="card-surface min-h-[34rem] rounded-3xl p-5 sm:p-8 lg:p-10">
            {step === 1 && renderSectorStep()}
            {step === 2 && renderModulesStep()}
            {step === 3 && renderUnitStep()}
            {step === 4 && renderSummaryStep()}
            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={step === 1 ? onExit : goBack}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs font-bold text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                data-testid="button-onboarding-back"
              >
                <ArrowLeft size={15} />
                {step === 1 ? 'Quitter' : 'Retour'}
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={step === 1 && sectors.length === 0}
                  className="btn inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-[0_5px_14px_hsl(var(--primary)/.18)] disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="button-onboarding-next"
                >
                  Continuer
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={completeOnboarding}
                  disabled={!selectedSector || !selectedModuleIds.length || !rootName.trim() || !rootCode.trim()}
                  className="btn inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-[0_5px_14px_hsl(var(--primary)/.18)] disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="button-complete-onboarding"
                >
                  Ouvrir mon espace
                  <Check size={15} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
