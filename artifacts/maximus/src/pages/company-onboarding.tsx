import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleHelp,
  Layers3,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Brand } from '@/components/app-ui';
import { getPublishedCatalogSnapshot, type CatalogSnapshot } from '@/lib/catalog-workflow';
import { provisionCompanyAccess } from '@/lib/company-access-provisioning';
import { activeModuleIds, getCustomerNeeds, isNeedAvailable, moduleIdsForNeed, type CustomerNeed } from '@/lib/onboarding-catalog';
import {
  getConfiguredModules,
  type Company,
  type ModuleId,
  type StoreData,
} from '@/lib/store';

type Mutate = (fn: (data: StoreData) => void, message?: string) => void;
type OnboardingCompany = Company & {
  onboardingCompleted?: boolean;
  onboardingStep?: number;
};

const steps = [
  { number: 1, label: 'Votre activité', shortLabel: 'Activité' },
  { number: 2, label: 'Vos priorités', shortLabel: 'Priorités' },
  { number: 3, label: 'Votre base', shortLabel: 'Base' },
  { number: 4, label: 'C’est prêt', shortLabel: 'Résumé' },
] as const;

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
  const customerNeeds = useMemo(() => getCustomerNeeds({
    moduleOverrides: catalog.moduleOverrides,
    removedModules: catalog.removedModules,
  }), [catalog.moduleOverrides, catalog.removedModules]);
  const sectors = catalog.sectorPresets ?? [];
  const companyModuleIds = useMemo(
    () => new Set(company.allowedModules.length ? company.allowedModules : company.requestedModules),
    [company.allowedModules, company.requestedModules],
  );
  const enabledModuleIds = useMemo(
    () => new Set([...activeModuleIds({
      moduleOverrides: catalog.moduleOverrides,
      moduleStatuses: catalog.moduleStatuses,
      removedModules: catalog.removedModules,
    })].filter(moduleId => companyModuleIds.has(moduleId))),
    [catalog.moduleOverrides, catalog.moduleStatuses, catalog.removedModules, companyModuleIds],
  );
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
      (moduleId) => enabledModuleIds.has(moduleId),
    );
    if (onboardingSelection?.length) return onboardingSelection;
    const requested = company.requestedModules.filter(
      (moduleId) => enabledModuleIds.has(moduleId),
    );
    if (requested.length) return requested;
    return (initialSector?.moduleIds ?? []).filter(
      (moduleId) => enabledModuleIds.has(moduleId),
    );
  }, [company.onboardingSelectedModuleIds, company.requestedModules, enabledModuleIds, initialSector]);
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
  const [attempted, setAttempted] = useState(false);

  const selectedSector = sectors.find((sector) => sector.id === sectorId);
  const selectedModules = configuredModules.filter((module) => selectedModuleIds.includes(module.id));
  const completion = Math.round(((step - 1) / (steps.length - 1)) * 100);
  const canContinue = step === 1
    ? Boolean(selectedSector)
    : step === 2
      ? selectedModuleIds.length > 0
      : true;

  const chooseSector = (nextSectorId: string) => {
    setSectorId(nextSectorId);
    const nextSector = sectors.find((sector) => sector.id === nextSectorId);
    const nextIds = (nextSector?.moduleIds ?? []).filter(
      (moduleId) => enabledModuleIds.has(moduleId),
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

  const toggleNeed = (need: CustomerNeed) => {
    const moduleIds = moduleIdsForNeed(need, enabledModuleIds);
    if (moduleIds.length !== need.moduleIds.length) return;
    const wasSelected = moduleIds.every(moduleId => selectedModuleIds.includes(moduleId));
    setSelectedModuleIds(current => {
      if (wasSelected) return current.filter(moduleId => !moduleIds.includes(moduleId));
      return [...new Set([...current, ...moduleIds])];
    });
    setModulePackIds(current => {
      const next = { ...current };
      if (wasSelected) {
        moduleIds.forEach(moduleId => delete next[moduleId]);
        return next;
      }
      moduleIds.forEach(moduleId => {
        const module = configuredModules.find(candidate => candidate.id === moduleId);
        const defaultPack = selectedSector?.modulePackIds?.[moduleId] ?? [];
        const packIds = defaultPack.length
          ? defaultPack
          : (module?.featurePacks?.length ?? 0) === 1
            ? [module?.featurePacks?.[0]?.id ?? '']
            : [];
        if (packIds.length) next[moduleId] = packIds.filter(Boolean);
      });
      return next;
    });
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
      targetCompany.requestedBusinessProfileId = selectedSector?.id;
      targetCompany.sector = selectedSector?.name ?? targetCompany.sector;
      delete targetCompany.onboardingRootName;
      delete targetCompany.onboardingRootCode;
      delete targetCompany.onboardingRootType;
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
    if (!selectedSector || !selectedModuleIds.length) return;
    mutate(
      (draft) => {
        const targetCompany =
          (draft.companies.find((candidate) => candidate.id === company.id) as OnboardingCompany | undefined) ??
          (company as OnboardingCompany);
        provisionCompanyAccess(draft, targetCompany, {
          moduleIds: selectedModuleIds,
          modulePackIds,
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
          Commençons par votre activité.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Nous allons préparer un espace adapté à votre entreprise. Vous pourrez toujours modifier vos choix plus tard.
        </p>
      </div>
      {sectors.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {sectors.map((sector) => {
            const active = sector.id === sectorId;
            const count = sector.moduleIds.filter((moduleId) => enabledModuleIds.has(moduleId)).length;
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
                  Une base prête à l’emploi avec {count} besoin{count > 1 ? 's' : ''} recommandé{count > 1 ? 's' : ''}.
                </span>
                <span className={`mt-5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] ${active ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                  {active ? <CheckCircle2 size={13} /> : <Layers3 size={13} />}
                  Activité sélectionnée
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
        <span className="mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">02 · Vos priorités</span>
        <h1 id="onboarding-step-title" className="mt-3 text-3xl font-bold tracking-[-.055em] sm:text-4xl">
          Que voulez-vous faire en premier ?
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Choisissez simplement vos priorités. MAXIMUS prépare automatiquement les bons outils pour vous.
        </p>
      </div>
      {customerNeeds.length ? (
        <div className="space-y-3">
          {customerNeeds.map((need) => {
            const moduleEnabled = isNeedAvailable(need, enabledModuleIds);
            const needModuleIds = moduleIdsForNeed(need, enabledModuleIds);
            const active = moduleEnabled && needModuleIds.every(moduleId => selectedModuleIds.includes(moduleId));
            return (
              <button
                key={need.id}
                type="button"
                onClick={() => toggleNeed(need)}
                disabled={!moduleEnabled}
                data-testid={`checkbox-business-need-${need.id}`}
                className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition sm:p-5 ${!moduleEnabled ? 'cursor-not-allowed opacity-55' : active ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.06)] shadow-[0_6px_18px_hsl(var(--primary)/.055)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] hover:border-[hsl(var(--primary)/.4)]'}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                  {active ? <Check size={17} strokeWidth={3} /> : <Layers3 size={17} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{need.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] ${!moduleEnabled ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]' : active ? 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                      {!moduleEnabled ? 'Bientôt disponible' : active ? 'Ajouté' : 'Ajouter'}
                    </span>
                  </span>
                  <span className="mt-1 block max-w-2xl text-xs leading-5 text-[hsl(var(--muted-foreground))]">{need.description}</span>
                  {!moduleEnabled && <span className="mt-2 block text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Cette option sera disponible après activation par MAXIMUS.</span>}
                </span>
                <span className={`mt-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full sm:flex ${active ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                  {active ? <Check size={14} /> : <ArrowRight size={14} />}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/.35)] p-8 text-center">
          <Layers3 className="mx-auto text-[hsl(var(--muted-foreground))]" size={24} />
          <h2 className="mt-3 text-base font-bold">Aucune option de gestion n’est disponible</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Votre espace ne peut pas encore être préparé. Revenez un peu plus tard ou contactez MAXIMUS.
          </p>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
        <span>{selectedModules.length} priorité{selectedModules.length > 1 ? 's' : ''} sélectionnée{selectedModules.length > 1 ? 's' : ''}</span>
        <span>Vous pourrez en ajouter plus tard</span>
      </div>
      {attempted && selectedModuleIds.length === 0 && (
        <p className="mt-3 text-sm font-semibold text-[hsl(var(--destructive))]" role="alert">Choisissez au moins une priorité.</p>
      )}
    </section>
  );

  const renderUnitStep = () => (
    <section aria-labelledby="onboarding-step-title">
      <div className="mb-7 max-w-2xl">
        <span className="mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">03 · Une base prête</span>
        <h1 id="onboarding-step-title" className="mt-3 text-3xl font-bold tracking-[-.055em] sm:text-4xl">
          Nous préparons votre espace automatiquement.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Vous n’avez rien de technique à configurer. MAXIMUS crée une base simple que vous pourrez enrichir quand vous le souhaitez.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-2xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.045)] p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
            <Building2 size={22} />
          </div>
          <h2 className="mt-6 text-xl font-bold">Votre base de départ</h2>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Une base <strong className="text-[hsl(var(--foreground))]">Direction</strong> sera créée pour votre entreprise, avec votre accès administrateur prêt à l’emploi.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[hsl(var(--card))] px-3 py-2">Direction</span>
            <span className="rounded-full bg-[hsl(var(--card))] px-3 py-2">Accès administrateur</span>
            <span className="rounded-full bg-[hsl(var(--card))] px-3 py-2">Modifiable plus tard</span>
          </div>
        </div>
        <div className="rounded-2xl bg-[hsl(var(--sidebar))] p-5 text-[hsl(var(--sidebar-foreground))] sm:p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--sidebar-primary)/.18)] text-[hsl(var(--sidebar-primary))]">
            <ShieldCheck size={18} />
          </div>
          <h2 className="mt-5 text-base font-bold">Rien n’est bloquant</h2>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--sidebar-foreground)/.68)]">
            Vous pourrez ajouter vos employés, créer d’autres équipes et ajuster votre organisation depuis l’accueil.
          </p>
          <div className="mt-6 space-y-3 border-t border-[hsl(var(--sidebar-border))] pt-5 text-xs">
            <div className="flex items-center justify-between gap-3"><span className="text-[hsl(var(--sidebar-foreground)/.62)]">Activité</span><strong>{selectedSector?.name ?? 'À définir'}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[hsl(var(--sidebar-foreground)/.62)]">Priorités</span><strong>{selectedModules.length}</strong></div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderSummaryStep = () => (
    <section aria-labelledby="onboarding-step-title">
      <div className="mb-7 max-w-2xl">
        <span className="mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">04 · Prêt à commencer</span>
        <h1 id="onboarding-step-title" className="mt-3 text-3xl font-bold tracking-[-.055em] sm:text-4xl">
          Votre espace est presque prêt.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Voici ce que MAXIMUS va préparer pour vous. Vous pourrez commencer immédiatement après l’ouverture.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Activité</span>
          <p className="mt-3 text-lg font-bold">{selectedSector?.name ?? 'Non sélectionnée'}</p>
          <button type="button" onClick={() => setStep(1)} className="mt-4 text-xs font-bold text-[hsl(var(--primary))] hover:underline">Modifier</button>
        </div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Priorités</span>
          <p className="mt-3 text-lg font-bold">{selectedModules.length} choisie{selectedModules.length > 1 ? 's' : ''}</p>
          <button type="button" onClick={() => setStep(2)} className="mt-4 text-xs font-bold text-[hsl(var(--primary))] hover:underline">Modifier</button>
        </div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Base de départ</span>
          <p className="mt-3 truncate text-lg font-bold">Direction</p>
          <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Accès administrateur prêt à l’emploi</p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Sparkles size={16} /></span>
          <div>
            <h2 className="text-sm font-bold">Ce qui va se passer ensuite</h2>
            <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Votre espace sera créé avec vos priorités, une base Direction et un accès administrateur. Depuis l’accueil, vous pourrez ensuite ajouter votre équipe, vos produits et vos ventes quand vous le souhaitez.
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
                  disabled={!selectedSector || !selectedModuleIds.length}
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
