import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ExternalLink,
  Factory,
  Flag,
  KeyRound,
  Layers3,
  RotateCcw,
  ShieldCheck,
  Target,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { ModuleId } from '@/lib/store';

type GuideProps = {
  companyId: string;
  companyName: string;
  allowedModules: ModuleId[];
  onNavigate: (path: string) => void;
};

type GuideStep = {
  id: string;
  number: string;
  title: string;
  eyebrow: string;
  icon: typeof Target;
  objective: string;
  actions: string[];
  outcome: string;
  check: string;
  mistakes: string[];
  links?: { label: string; path: string; module?: ModuleId }[];
};

const moduleOrder: ModuleId[] = ['commerce', 'ecommerce', 'stocks', 'presences'];

const baseSteps: GuideStep[] = [
  {
    id: 'preparation',
    number: '01',
    title: 'Préparer le cadrage',
    eyebrow: 'Avant toute saisie',
    icon: Target,
    objective:
      'Réunir les informations et les personnes qui permettront de prendre des décisions cohérentes dès le premier jour.',
    actions: [
      'Désigner un administrateur responsable du paramétrage et un remplaçant.',
      'Lister les unités, équipes et flux à représenter dans MAXIMUS.',
      'Rassembler les référentiels de départ : identifiants, responsables, articles, horaires et règles internes.',
    ],
    outcome:
      'Le périmètre est partagé avec les bons interlocuteurs et les sources de référence sont disponibles.',
    check:
      'Demandez à un autre responsable de relire le périmètre. Il doit pouvoir expliquer ce qui sera géré dans MAXIMUS et ce qui ne le sera pas.',
    mistakes: [
      'Commencer par créer des comptes sans avoir défini les unités et leurs responsables.',
      'Importer des données dont la source ou la date de mise à jour n’est pas connue.',
    ],
  },
  {
    id: 'identity',
    number: '02',
    title: 'Poser l’identité de l’entreprise',
    eyebrow: 'Repères officiels',
    icon: Factory,
    objective:
      'Renseigner un profil fiable afin que les utilisateurs reconnaissent immédiatement le bon espace entreprise.',
    actions: [
      'Compléter le nom, les coordonnées, le profil d’activité et les informations de contact de référence.',
      'Vérifier l’orthographe, les formats de téléphone et l’adresse utilisée pour les échanges administratifs.',
      'Faire valider ces informations par la personne qui porte la responsabilité légale ou opérationnelle.',
    ],
    outcome:
      'Le profil de l’entreprise est exploitable et ne crée pas d’ambiguïté dans les invitations, documents ou contrôles.',
    check:
      'Ouvrez le profil comme un utilisateur nouvellement invité et vérifiez que le nom et les contacts sont immédiatement compréhensibles.',
    mistakes: [
      'Utiliser le nom court dans un écran et la raison sociale dans un autre.',
      'Laisser une adresse personnelle ou un ancien numéro comme contact de référence.',
    ],
    links: [{ label: 'Ouvrir le profil entreprise', path: '/entreprise/profil' }],
  },
  {
    id: 'modules',
    number: '03',
    title: 'Choisir les modules et leurs dépendances',
    eyebrow: 'Périmètre fonctionnel',
    icon: Layers3,
    objective:
      'Activer uniquement les capacités nécessaires et vérifier leurs prérequis avant de construire les droits.',
    actions: [
      'Confirmer la liste des modules autorisés pour cette entreprise.',
      'Pour chaque module, noter les données de référence et les responsables qui devront le maintenir.',
      'Vérifier les dépendances avant de planifier les tests : un flux aval ne doit pas être configuré sans son référentiel amont.',
    ],
    outcome:
      'Le périmètre fonctionnel est explicite, compris par l’équipe et aligné avec les modules autorisés.',
    check:
      'Pour chaque module retenu, faites expliquer le flux principal de bout en bout par son responsable, sans ouvrir un droit inutile.',
    mistakes: [
      'Activer un module pour résoudre un besoin ponctuel sans propriétaire durable.',
      'Tester une sortie ou un rapport avant d’avoir préparé ses données sources.',
    ],
    links: [
      { label: 'Configurer Commerce', path: '/entreprise/commerce', module: 'commerce' },
      { label: 'Configurer E-commerce', path: '/entreprise/ecommerce', module: 'ecommerce' },
      { label: 'Configurer Stocks', path: '/entreprise/stocks', module: 'stocks' },
      { label: 'Configurer Présences', path: '/entreprise/presences', module: 'presences' },
    ],
  },
  {
    id: 'structure',
    number: '04',
    title: 'Construire la structure et les unités',
    eyebrow: 'Organisation lisible',
    icon: Factory,
    objective:
      'Reproduire l’organisation réelle avec une hiérarchie assez précise pour affecter les responsabilités, sans créer de niveaux artificiels.',
    actions: [
      'Créer les unités qui correspondent aux responsabilités réelles de l’entreprise, sans imposer de catégories prédéfinies.',
      'Renseigner un code, un contact et un responsable pour chaque unité opérationnelle.',
      'Vérifier que chaque employé et chaque flux futur pourra être rattaché à une unité identifiable.',
    ],
    outcome:
      'La carte de l’organisation permet de comprendre qui décide, où se trouve une activité et à qui remonter un sujet.',
    check:
      'Partez d’un employé et remontez jusqu’à la direction. Puis partez d’une unité et identifiez son responsable sans interprétation.',
    mistakes: [
      'Créer une unité par personne plutôt que par responsabilité durable.',
      'Laisser des unités sans responsable ou avec un responsable qui n’a pas encore de compte.',
    ],
    links: [
      {
        label: 'Gérer la structure et les unités',
        path: '/entreprise/organisation?tab=structure',
      },
    ],
  },
  {
    id: 'roles',
    number: '05',
    title: 'Définir les rôles et permissions',
    eyebrow: 'Accès maîtrisés',
    icon: KeyRound,
    objective:
      'Accorder les accès selon les responsabilités réelles, avec le minimum de privilèges nécessaire à chaque rôle.',
    actions: [
      'Créer les rôles à partir des activités à réaliser, pas à partir des noms des personnes.',
      'Attribuer les permissions module par module et distinguer consultation, saisie, validation et administration.',
      'Prévoir une revue par un responsable métier pour les rôles qui valident, suppriment ou exportent.',
    ],
    outcome:
      'Chaque responsabilité dispose d’un rôle compréhensible et les accès sensibles ont un propriétaire identifié.',
    check:
      'Pour chaque permission sensible, répondez à trois questions : qui l’utilise, pourquoi, et qui vérifie son usage ?',
    mistakes: [
      'Donner les droits d’administrateur pour contourner une configuration incomplète.',
      'Copier un rôle existant sans vérifier les permissions héritées ou devenues inutiles.',
    ],
    links: [{ label: 'Configurer les rôles', path: '/entreprise/roles' }],
  },
  {
    id: 'employees',
    number: '06',
    title: 'Inviter les employés et managers',
    eyebrow: 'Comptes responsables',
    icon: UsersRound,
    objective:
      'Rattacher chaque compte à la bonne unité et au bon rôle, puis rendre les managers capables d’exercer leur périmètre.',
    actions: [
      'Créer ou inviter les employés avec une adresse professionnelle vérifiée.',
      'Affecter chaque personne à une unité, un rôle et, si nécessaire, un manager de référence.',
      'Faire confirmer aux managers leur périmètre et leur capacité à traiter les validations attendues.',
    ],
    outcome:
      'Les comptes sont traçables, correctement rattachés et prêts à participer aux parcours métier.',
    check:
      'Testez un compte standard et un compte manager : chacun ne doit voir et modifier que ce qui correspond à son rôle.',
    mistakes: [
      'Créer des comptes génériques partagés entre plusieurs personnes.',
      'Inviter une personne avant d’avoir stabilisé son unité ou son rôle.',
    ],
    links: [{ label: 'Gérer les employés', path: '/entreprise/employes' }],
  },
  {
    id: 'business',
    number: '07',
    title: 'Configurer chaque métier',
    eyebrow: 'Données de départ',
    icon: ClipboardCheck,
    objective:
      'Préparer les référentiels et règles nécessaires au fonctionnement quotidien de chaque module autorisé.',
    actions: [
      'Choisir un scénario métier représentatif et identifier ses données d’entrée, sa validation et son résultat.',
      'Configurer les référentiels utiles au module : articles, clients, horaires, règles ou canaux selon le périmètre retenu.',
      'Attribuer un propriétaire de maintenance et une fréquence de revue pour chaque référentiel critique.',
    ],
    outcome:
      'Chaque module autorisé possède un premier parcours réaliste, des données lisibles et une personne responsable de leur qualité.',
    check:
      'Réalisez le parcours avec une donnée de test clairement identifiée, puis vérifiez le résultat dans le module et dans le contrôle.',
    mistakes: [
      'Saisir des données de production pour tester une configuration incertaine.',
      'Configurer l’écran sans documenter qui maintient les valeurs dans le temps.',
    ],
    links: [
      { label: 'Ouvrir Commerce', path: '/entreprise/commerce', module: 'commerce' },
      { label: 'Ouvrir E-commerce', path: '/entreprise/ecommerce', module: 'ecommerce' },
      { label: 'Ouvrir Stocks', path: '/entreprise/stocks', module: 'stocks' },
      { label: 'Ouvrir Présences', path: '/entreprise/presences', module: 'presences' },
    ],
  },
  {
    id: 'tests',
    number: '08',
    title: 'Tester la sécurité et les parcours',
    eyebrow: 'Avant la bascule',
    icon: ShieldCheck,
    objective:
      'Prouver que les flux attendus fonctionnent et qu’un utilisateur ne peut pas dépasser son périmètre.',
    actions: [
      'Exécuter les scénarios principaux avec un compte standard, un manager et un administrateur.',
      'Vérifier les refus d’accès, les validations, les rattachements et la traçabilité des décisions.',
      'Noter les écarts, les corriger dans la configuration puis rejouer le scénario complet.',
    ],
    outcome:
      'Les parcours critiques sont reproductibles, les accès sont proportionnés et les anomalies restantes sont connues.',
    check:
      'Faites signer une grille de recette par les responsables métier et conservez une preuve des tests refusés comme des tests réussis.',
    mistakes: [
      'Tester uniquement avec le compte administrateur.',
      'Considérer un écran accessible comme une preuve que toutes ses actions sont autorisées.',
    ],
    links: [{ label: 'Ouvrir le contrôle & la coordination', path: '/entreprise/controle' }],
  },
  {
    id: 'production',
    number: '09',
    title: 'Préparer la mise en production',
    eyebrow: 'Go / no-go',
    icon: Flag,
    objective:
      'Passer en usage réel avec une décision explicite, des responsables joignables et un plan de retour arrière.',
    actions: [
      'Valider le périmètre de lancement, la date, les responsables et les canaux d’escalade.',
      'Vérifier une dernière fois les invitations, les rôles sensibles et les données importées.',
      'Communiquer les règles de connexion, le premier parcours à réaliser et le point de contact support.',
    ],
    outcome:
      'La mise en production est une décision pilotée, comprise par les équipes et réversible si un risque apparaît.',
    check:
      'Avant le go, une personne non impliquée dans le paramétrage doit pouvoir retrouver le plan d’action et les critères d’arrêt.',
    mistakes: [
      'Lancer tous les modules en même temps sans pilote de démarrage.',
      'Confondre absence d’erreur visible et validation complète du parcours.',
    ],
  },
  {
    id: 'follow-up',
    number: '10',
    title: 'Installer la routine de suivi',
    eyebrow: 'Après le lancement',
    icon: RotateCcw,
    objective:
      'Maintenir la qualité de l’organisation, des droits et des données après la mise en production.',
    actions: [
      'Planifier une revue régulière des comptes, rôles, managers et unités.',
      'Suivre les contrôles, incidents, demandes d’évolution et données qui nécessitent une correction.',
      'Documenter chaque changement important et réutiliser les scénarios de recette après une évolution sensible.',
    ],
    outcome:
      'L’entreprise conserve une configuration compréhensible et les écarts sont traités avant de devenir des risques.',
    check:
      'Fixez une date de prochaine revue et un responsable. Une étape non planifiée finit généralement par être oubliée.',
    mistakes: [
      'Ne revoir les permissions qu’après un départ ou un incident.',
      'Changer un rôle ou un référentiel sans rejouer le parcours qui en dépend.',
    ],
    links: [{ label: 'Suivre le contrôle & la coordination', path: '/entreprise/controle' }],
  },
];

const storageKeyFor = (companyId: string) => `maximus:setup-guide:${companyId}`;

export function CompanySetupGuide({
  companyId,
  companyName,
  allowedModules,
  onNavigate,
}: GuideProps) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [openStep, setOpenStep] = useState('preparation');
  const skipPersistOnce = useRef(false);

  useEffect(() => {
    skipPersistOnce.current = true;
    try {
      const stored = window.localStorage.getItem(storageKeyFor(companyId));
      if (!stored) {
        setCompleted([]);
        return;
      }
      const parsed: unknown = JSON.parse(stored);
      setCompleted(
        Array.isArray(parsed)
          ? parsed.filter((step): step is string => typeof step === 'string')
          : [],
      );
    } catch {
      setCompleted([]);
    }
  }, [companyId]);

  useEffect(() => {
    if (skipPersistOnce.current) {
      skipPersistOnce.current = false;
      return;
    }
    try {
      window.localStorage.setItem(storageKeyFor(companyId), JSON.stringify(completed));
    } catch {
      // La progression reste utilisable si le navigateur bloque le stockage local.
    }
  }, [companyId, completed]);

  const steps = useMemo(() => baseSteps, []);
  const completedSet = useMemo(() => new Set(completed), [completed]);
  const progress = Math.round((completed.length / steps.length) * 100);
  const permittedModules = moduleOrder.filter(module => allowedModules.includes(module));

  const toggleComplete = (stepId: string) => {
    setCompleted(current =>
      current.includes(stepId)
        ? current.filter(id => id !== stepId)
        : [...current, stepId],
    );
  };

  const resetProgress = () => {
    if (
      window.confirm(
        `Réinitialiser la progression de ${companyName} ? Les validations manuelles de ce guide seront supprimées.`,
      )
    ) {
      setCompleted([]);
      setOpenStep('preparation');
    }
  };

  const navigateTo = (path: string) => {
    onNavigate(path);
  };

  return (
    <div className="min-w-0 space-y-6" data-testid="company-setup-guide">
      <section className="card-surface relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[24px] border-[hsl(var(--primary)/.08)]" />
        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">
              Parcours administrateur · {companyName}
            </p>
            <h1 className="mt-3 max-w-3xl text-2xl font-black tracking-[-.045em] sm:text-4xl">
              Configurer l’entreprise, sans angle mort.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Suivez un chemin concret de la préparation au suivi quotidien. Validez chaque étape
              lorsque le contrôle est fait : cette progression est enregistrée uniquement pour
              cette entreprise et ce navigateur.
            </p>
          </div>
          <div className="rounded-xl border border-[hsl(var(--primary)/.22)] bg-[hsl(var(--primary)/.07)] p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                  Progression manuelle
                </p>
                <p className="mt-1 text-3xl font-black tracking-[-.06em]">{progress}%</p>
              </div>
              <p className="mono text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                {completed.length}/{steps.length} étapes
              </p>
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-[hsl(var(--card))]"
              role="progressbar"
              aria-label="Progression de la configuration"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              type="button"
              onClick={resetProgress}
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
              data-testid="button-reset-setup-progress"
            >
              <RotateCcw size={14} />
              Réinitialiser la progression
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="card-surface h-fit p-3 lg:sticky lg:top-24">
          <div className="flex items-center justify-between px-2 py-2">
            <p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
              Feuille de route
            </p>
            <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px] font-bold">
              {steps.length}
            </span>
          </div>
          <nav aria-label="Étapes du guide" className="mt-1 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {steps.map(step => {
              const isDone = completedSet.has(step.id);
              const isOpen = openStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setOpenStep(step.id);
                    document.getElementById(`setup-step-${step.id}`)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }}
                  className={`flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                    isOpen
                      ? 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--foreground))]'
                      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.7)]'
                  }`}
                  aria-current={isOpen ? 'step' : undefined}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isDone
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                        : 'border border-[hsl(var(--border))]'
                    }`}
                  >
                    {isDone ? <Check size={13} /> : step.number}
                  </span>
                  <span className="truncate font-semibold">{step.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/.32)] px-4 py-3 text-xs leading-5 text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between">
            <p>
              <strong className="text-[hsl(var(--foreground))]">Méthode :</strong> lisez l’objectif,
              exécutez les actions, puis utilisez le contrôle anti-oubli avant de valider.
            </p>
            <span className="shrink-0 font-semibold">{permittedModules.length} module(s) autorisé(s)</span>
          </div>

          {steps.map(step => {
            const StepIcon = step.icon;
            const isDone = completedSet.has(step.id);
            const isOpen = openStep === step.id;
            const visibleLinks = step.links?.filter(link => !link.module || permittedModules.includes(link.module));
            const restrictedLinks = step.links?.filter(link => link.module && !permittedModules.includes(link.module));

            return (
              <article
                key={step.id}
                id={`setup-step-${step.id}`}
                className={`card-surface scroll-mt-24 overflow-hidden transition-[border-color,box-shadow] ${
                  isDone ? 'border-[hsl(var(--primary)/.35)]' : ''
                }`}
              >
                <div className="flex items-start gap-3 p-4 sm:p-5">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isDone
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--primary))]'
                    }`}
                  >
                    {isDone ? <Check size={19} /> : <StepIcon size={19} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
                      {step.number} · {step.eyebrow}
                    </p>
                    <h2 className="mt-1 text-base font-black tracking-[-.025em] sm:text-lg">{step.title}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenStep(isOpen ? '' : step.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                    aria-label={isOpen ? `Réduire ${step.title}` : `Afficher ${step.title}`}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-[hsl(var(--border))] px-4 pb-5 pt-4 sm:px-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoBlock title="Objectif" icon={<Target size={15} />} text={step.objective} />
                      <InfoBlock
                        title="Résultat attendu"
                        icon={<CheckCircle2 size={15} />}
                        text={step.outcome}
                        tone="positive"
                      />
                    </div>

                    <div className="mt-5">
                      <h3 className="text-xs font-black uppercase tracking-[.12em]">Actions concrètes</h3>
                      <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                        {step.actions.map((action, index) => (
                          <li
                            key={action}
                            className="relative rounded-lg bg-[hsl(var(--muted)/.5)] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]"
                          >
                            <span className="mono mb-2 block text-[10px] font-bold text-[hsl(var(--primary))]">
                              0{index + 1}
                            </span>
                            {action}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <InfoBlock
                        title="Contrôle anti-oubli"
                        icon={<ClipboardCheck size={15} />}
                        text={step.check}
                        tone="positive"
                      />
                      <div className="rounded-lg border border-[hsl(var(--destructive)/.18)] bg-[hsl(var(--destructive)/.045)] p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--destructive))]">
                          <AlertTriangle size={15} />
                          Erreurs fréquentes
                        </div>
                        <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                          {step.mistakes.map(mistake => (
                            <li key={mistake} className="flex gap-2">
                              <span aria-hidden="true">•</span>
                              <span>{mistake}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {(visibleLinks?.length || restrictedLinks?.length) ? (
                      <div className="mt-5 border-t border-[hsl(var(--border))] pt-4">
                        <p className="text-xs font-black uppercase tracking-[.12em]">Accès directs</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {visibleLinks?.map(link => (
                            <GuideLink key={link.path} label={link.label} path={link.path} onNavigate={navigateTo} />
                          ))}
                        </div>
                        {!!restrictedLinks?.length && (
                          <p className="mt-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
                            Les accès aux modules non autorisés sont masqués. Pour les ouvrir, vérifiez
                            d’abord le périmètre de l’entreprise.
                          </p>
                        )}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-col gap-3 border-t border-[hsl(var(--border))] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {isDone
                          ? 'Étape validée manuellement pour cette entreprise.'
                          : 'Validez uniquement après avoir réalisé le contrôle anti-oubli.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleComplete(step.id)}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-bold transition ${
                          isDone
                            ? 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]'
                            : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90'
                        }`}
                        data-testid={`button-complete-step-${step.id}`}
                      >
                        {isDone ? <RotateCcw size={14} /> : <Check size={14} />}
                        {isDone ? 'Marquer comme à revoir' : 'Valider cette étape'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </main>
      </div>
    </div>
  );
}

function InfoBlock({
  title,
  icon,
  text,
  tone = 'default',
}: {
  title: string;
  icon: ReactNode;
  text: string;
  tone?: 'default' | 'positive';
}) {
  return (
    <div
      className={`rounded-lg border p-3.5 ${
        tone === 'positive'
          ? 'border-[hsl(var(--primary)/.18)] bg-[hsl(var(--primary)/.045)]'
          : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/.28)]'
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-bold">
        <span className="text-[hsl(var(--primary))]">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{text}</p>
    </div>
  );
}

function GuideLink({
  label,
  path,
  onNavigate,
}: {
  label: string;
  path: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <a
      href={path}
      onClick={event => {
        event.preventDefault();
        onNavigate(path);
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold transition hover:-translate-y-px hover:border-[hsl(var(--primary)/.4)] hover:bg-[hsl(var(--muted))]"
    >
      <ExternalLink size={13} className="text-[hsl(var(--primary))]" />
      <span>{label}</span>
      <ArrowRight size={13} className="text-[hsl(var(--muted-foreground))]" />
    </a>
  );
}

export default CompanySetupGuide;