import type {
  Activity,
  Company,
  ControlTask,
  DomainEvent,
  Employee,
  Movement,
  Product,
  Sale,
  StoreData,
} from './store';
import { getConfiguredModules } from './store';
import type { Module, ModuleFeaturePack, Role, SectorPreset, OrgNode, CompanySubscription } from './store';
import { getCatalogImpact, getCatalogSnapshot, validateCatalogDraft } from './catalog-workflow';
import type { ModuleId } from './module-ids';

export type AssistantTone = 'watch' | 'positive' | 'neutral';
export type AssistantTrend = 'up' | 'down' | 'steady';

export type AssistantInsight = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  value?: string;
  trend?: string;
  trendDirection?: AssistantTrend;
  source?: string;
  tone?: AssistantTone;
  proposedAction?: {
    label: string;
    detail: string;
    impact?: string;
  };
};

export type AssistantScope = {
  company: Company | null;
  companyId: string;
  userLabel: string;
  visibleEmployees: Employee[];
  products: Product[];
  movements: Movement[];
  sales: Sale[];
  activities: Activity[];
  controlTasks: ControlTask[];
  domainEvents: DomainEvent[];
  allowedModules: ModuleId[];
  isCompanyAdmin: boolean;
  isSectorManager: boolean;
};

export type AssistantAnswer = {
  answer: string;
  citations: string[];
  insights: AssistantInsight[];
  suggestedQuestions: string[];
  proposedActions: AssistantInsight['proposedAction'][];
};

export type AdminAssistantScope = {
  userLabel: string;
  companies: Company[];
  employees: Employee[];
  roles: Role[];
  orgNodes: OrgNode[];
  subscriptions: CompanySubscription[];
  modules: Module[];
  sectorPresets: SectorPreset[];
  moduleStatuses: StoreData['moduleStatuses'];
  removedModules: ModuleId[];
  catalogDraftPresent: boolean;
  catalogImpact: ReturnType<typeof getCatalogImpact>;
  catalogValidation: ReturnType<typeof validateCatalogDraft>;
};

const completedTaskStatuses = new Set(['VALIDÉ', 'TERMINÉ', 'REFUSÉ']);
const highRiskTaskStatuses = new Set(['HAUTE', 'CRITIQUE']);

function belongsToCompany(item: { companyId?: string }, companyId: string): boolean {
  return Boolean(companyId && item.companyId === companyId);
}

function hasModule(allowedModules: ModuleId[], ...modules: ModuleId[]): boolean {
  return modules.some(module => allowedModules.includes(module));
}

function moduleLabel(moduleId: ModuleId): string {
  return {
    commerce: 'commerce',
    ecommerce: 'e-commerce',
    stocks: 'stocks',
    presences: 'présences',
    paie: 'paie',
    ventes: 'ventes',
    achats: 'achats',
    comptabilite: 'comptabilité',
    finance: 'finance',
    rh: 'ressources humaines',
    crm: 'CRM',
    fournisseurs: 'fournisseurs',
    logistique: 'logistique',
    documents: 'documents',
    rapports: 'rapports',
  }[moduleId] ?? moduleId;
}

export function buildAssistantScope({
  data,
  companyId,
  userLabel,
  visibleEmployees,
  allowedModules,
  isCompanyAdmin,
  isSectorManager,
}: {
  data: StoreData;
  companyId: string;
  userLabel: string;
  visibleEmployees: Employee[];
  allowedModules: ModuleId[];
  isCompanyAdmin: boolean;
  isSectorManager: boolean;
}): AssistantScope {
  const company = data.companies.find(item => item.id === companyId) ?? null;
  const companyEmployees = data.employees.filter(item => belongsToCompany(item, companyId));
  const scopedEmployees = isCompanyAdmin
    ? companyEmployees
    : isSectorManager
      ? visibleEmployees.filter(item => belongsToCompany(item, companyId))
      : visibleEmployees.filter(item => item.id === visibleEmployees[0]?.id && belongsToCompany(item, companyId));

  return {
    company,
    companyId,
    userLabel,
    visibleEmployees: scopedEmployees,
    products: hasModule(allowedModules, 'stocks')
      ? data.products.filter(item => belongsToCompany(item, companyId))
      : [],
    movements: hasModule(allowedModules, 'stocks')
      ? data.movements.filter(item => belongsToCompany(item, companyId))
      : [],
    sales: hasModule(allowedModules, 'commerce', 'ventes')
      ? data.sales.filter(item => belongsToCompany(item, companyId))
      : [],
    activities: data.activities.filter(item => belongsToCompany(item, companyId)),
    controlTasks: data.controlTasks.filter(item => belongsToCompany(item, companyId)),
    domainEvents: data.domainEvents.filter(item => belongsToCompany(item, companyId)),
    allowedModules,
    isCompanyAdmin,
    isSectorManager,
  };
}

export function buildAssistantInsights(scope: AssistantScope): AssistantInsight[] {
  const insights: AssistantInsight[] = [];
  const lowStockProducts = scope.products.filter(product => product.stock <= product.threshold);
  const openTasks = scope.controlTasks.filter(task => !completedTaskStatuses.has(task.status));
  const highRiskTasks = openTasks.filter(task => highRiskTaskStatuses.has(task.priority));
  const recentSales = [...scope.sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  if (hasModule(scope.allowedModules, 'stocks') && lowStockProducts.length > 0) {
    const firstProducts = lowStockProducts.slice(0, 3).map(product => product.name).join(', ');
    insights.push({
      id: 'stock-threshold',
      eyebrow: 'Stocks',
      title: `${lowStockProducts.length} article${lowStockProducts.length > 1 ? 's' : ''} sous le seuil`,
      summary: `${firstProducts}${lowStockProducts.length > 3 ? ' et d’autres' : ''} demande${lowStockProducts.length > 1 ? 'nt' : ''} une vérification.`,
      value: String(lowStockProducts.length),
      trend: 'À surveiller',
      trendDirection: 'down',
      source: 'Articles et seuils de stock',
      tone: 'watch',
      proposedAction: {
        label: 'Préparer une vérification',
        detail: 'Lister les articles sous seuil et leurs derniers mouvements.',
        impact: 'Aucune modification ne sera effectuée sans confirmation.',
      },
    });
  }

  if (openTasks.length > 0) {
    insights.push({
      id: 'open-tasks',
      eyebrow: 'Coordination',
      title: `${openTasks.length} tâche${openTasks.length > 1 ? 's' : ''} à suivre`,
      summary: highRiskTasks.length
        ? `${highRiskTasks.length} priorité${highRiskTasks.length > 1 ? 's' : ''} haute${highRiskTasks.length > 1 ? 's' : ''} ou critique${highRiskTasks.length > 1 ? 's' : ''} demande${highRiskTasks.length > 1 ? 'nt' : ''} une décision.`
        : 'Les tâches ouvertes sont regroupées dans votre périmètre autorisé.',
      value: String(openTasks.length),
      trend: highRiskTasks.length ? 'Décision attendue' : 'Suivi en cours',
      trendDirection: highRiskTasks.length ? 'down' : 'steady',
      source: 'Contrôle et coordination',
      tone: highRiskTasks.length ? 'watch' : 'neutral',
      proposedAction: {
        label: 'Préparer la liste de suivi',
        detail: 'Rassembler les tâches ouvertes avec leur responsable et leur échéance.',
        impact: 'La liste sera seulement préparée pour validation.',
      },
    });
  }

  if (hasModule(scope.allowedModules, 'commerce', 'ventes') && recentSales.length > 0) {
    const total = recentSales.reduce((sum, sale) => sum + sale.amount, 0);
    insights.push({
      id: 'sales-pulse',
      eyebrow: 'Activité commerciale',
      title: 'Les dernières ventes sont disponibles',
      summary: `${recentSales.length} vente${recentSales.length > 1 ? 's' : ''} récente${recentSales.length > 1 ? 's' : ''} pour un total de ${new Intl.NumberFormat('fr-FR').format(total)} FCFA.`,
      value: `${new Intl.NumberFormat('fr-FR').format(total)} FCFA`,
      trend: 'Données autorisées',
      trendDirection: 'steady',
      source: 'Ventes de l’entreprise',
      tone: 'positive',
    });
  }

  if (scope.visibleEmployees.length > 0) {
    insights.push({
      id: 'team-scope',
      eyebrow: 'Périmètre',
      title: `${scope.visibleEmployees.length} personne${scope.visibleEmployees.length > 1 ? 's' : ''} visible${scope.visibleEmployees.length > 1 ? 's' : ''}`,
      summary: scope.isCompanyAdmin
        ? 'La synthèse couvre les employés de cette entreprise.'
        : scope.isSectorManager
          ? 'La synthèse reste limitée à votre unité et à ses équipes descendantes.'
          : 'La synthèse reste limitée à votre propre compte.',
      value: String(scope.visibleEmployees.length),
      trend: 'Accès contrôlé',
      trendDirection: 'steady',
      source: 'Organisation et permissions',
      tone: 'neutral',
    });
  }

  return insights;
}

function answerForStock(scope: AssistantScope): AssistantAnswer {
  const lowStock = scope.products.filter(product => product.stock <= product.threshold);
  if (!lowStock.length) {
    return {
      answer: 'Aucun article sous son seuil n’est visible dans votre périmètre. Je n’ai consulté que les stocks autorisés de cette entreprise.',
      citations: ['Articles et seuils de stock'],
      insights: buildAssistantInsights(scope),
      suggestedQuestions: ['Quelles sont les dernières ventes ?', 'Quelles tâches demandent une décision ?'],
      proposedActions: [],
    };
  }

  return {
    answer: `${lowStock.length} article${lowStock.length > 1 ? 's sont' : ' est'} sous le seuil : ${lowStock.map(product => `${product.name} (${product.stock}/${product.threshold})`).join(', ')}. Je peux préparer une liste de vérification, mais je ne créerai aucune commande sans votre confirmation.`,
    citations: ['Articles et seuils de stock', 'Mouvements de stock'],
    insights: buildAssistantInsights(scope),
    suggestedQuestions: ['Quels mouvements concernent ces articles ?', 'Préparer une liste de vérification'],
    proposedActions: buildAssistantInsights(scope).filter(insight => insight.proposedAction).map(insight => insight.proposedAction!),
  };
}

function answerForTasks(scope: AssistantScope): AssistantAnswer {
  const openTasks = scope.controlTasks.filter(task => !completedTaskStatuses.has(task.status));
  const taskSummary = openTasks.slice(0, 4).map(task => `${task.title} (${task.priority})`).join('; ');
  return {
    answer: openTasks.length
      ? `${openTasks.length} tâche${openTasks.length > 1 ? 's sont' : ' est'} ouverte${openTasks.length > 1 ? 's' : ''}${taskSummary ? ` : ${taskSummary}` : ''}. Les tâches sont présentées sans modifier leur statut.`
      : 'Aucune tâche ouverte n’est visible dans votre périmètre actuel.',
    citations: ['Contrôle et coordination'],
    insights: buildAssistantInsights(scope),
    suggestedQuestions: ['Quels articles sont sous le seuil ?', 'Résumer mon périmètre de données'],
    proposedActions: [],
  };
}

export function answerAssistantQuestion(scope: AssistantScope, rawQuestion: string): AssistantAnswer {
  const question = rawQuestion.trim().toLocaleLowerCase('fr-FR');
  const insights = buildAssistantInsights(scope);
  const visibleModuleNames = scope.allowedModules.slice(0, 5).map(moduleLabel).join(', ');

  if (/(stock|rupture|article|inventaire|mouvement)/.test(question) && hasModule(scope.allowedModules, 'stocks')) {
    return answerForStock(scope);
  }
  if (/(tâche|taches|coordination|priorité|problème|anomalie|risque)/.test(question)) {
    return answerForTasks(scope);
  }
  if (/(vente|chiffre|commande|commercial)/.test(question) && hasModule(scope.allowedModules, 'commerce', 'ventes')) {
    const total = scope.sales.reduce((sum, sale) => sum + sale.amount, 0);
    return {
      answer: scope.sales.length
        ? `${scope.sales.length} vente${scope.sales.length > 1 ? 's sont' : ' est'} visible${scope.sales.length > 1 ? 's' : ''} dans votre périmètre, pour un total de ${new Intl.NumberFormat('fr-FR').format(total)} FCFA. Je n’ai pas inclus les données sans rattachement explicite à cette entreprise.`
        : 'Aucune vente rattachée explicitement à cette entreprise n’est visible dans votre périmètre.',
      citations: ['Ventes de l’entreprise'],
      insights,
      suggestedQuestions: ['Quels articles sont sous le seuil ?', 'Quelles tâches demandent une décision ?'],
      proposedActions: [],
    };
  }
  if (/(équipe|employé|personne|organisation|périmètre|droit|permission)/.test(question)) {
    return {
      answer: `${scope.visibleEmployees.length} personne${scope.visibleEmployees.length > 1 ? 's sont' : ' est'} visible${scope.visibleEmployees.length > 1 ? 's' : ''} dans votre périmètre. ${scope.isCompanyAdmin ? 'Vous consultez l’espace complet de l’entreprise.' : scope.isSectorManager ? 'Votre accès est limité à votre secteur et à ses équipes descendantes.' : 'Votre accès est limité à votre propre fiche.'}`,
      citations: ['Organisation et permissions'],
      insights,
      suggestedQuestions: ['Quelles tâches demandent une décision ?', 'Quels modules sont accessibles ?'],
      proposedActions: [],
    };
  }

  return {
    answer: `Je peux analyser les données autorisées de ${scope.company?.name ?? 'votre entreprise'} : ${visibleModuleNames || 'aucun module opérationnel'}. Essayez une question sur les stocks, les ventes, les tâches ou votre périmètre d’accès.`,
    citations: ['Périmètre de session'],
    insights,
    suggestedQuestions: ['Quels articles sont sous le seuil ?', 'Quelles tâches demandent une décision ?', 'Résumer mon périmètre de données'],
    proposedActions: [],
  };
}

function adminModuleLabel(module: Module): string {
  return `${module.name} (${module.id})`;
}

function adminPackSummary(module: Module): string {
  const packs = module.featurePacks ?? [];
  if (!packs.length) return 'aucun pack défini';
  return packs.map(pack => `${pack.name} [${pack.id}]`).join(', ');
}

function adminCatalogKnowledge(scope: AdminAssistantScope): string {
  const moduleSummary = scope.modules
    .map(module => `${adminModuleLabel(module)} : ${adminPackSummary(module)}`)
    .join('; ');
  return [
    'Le catalogue MAXIMUS suit une chaîne contrôlée : module → fonctionnalités → pack → permissions → accès entreprise.',
    `Modules configurés : ${moduleSummary || 'aucun'}.`,
    'Un pack regroupe des fonctionnalités et leurs droits (voir, créer, modifier).',
    'Un secteur compose ensuite des modules, des packs et des fonctionnalités avant publication.',
    'Une entreprise reçoit uniquement les modules et sélections explicitement autorisés.',
  ].join(' ');
}

function adminOrganizationKnowledge(scope: AdminAssistantScope): string {
  const activeCompanies = scope.companies.filter(company => company.status === 'ACTIF').length;
  const rootNodes = scope.orgNodes.filter(node => !node.parentId).length;
  return [
    `Le parcours organisationnel est : entreprise → unités et secteurs → rôles et permissions → employés → managers.`,
    `${activeCompanies} entreprise(s) active(s), ${scope.orgNodes.length} unité(s) enregistrée(s), dont ${rootNodes} racine(s), ${scope.roles.length} rôle(s) et ${scope.employees.length} employé(s).`,
    'Les droits doivent rester bornés par l’entreprise, l’unité, le rôle et les modules autorisés.',
    'La session serveur reste la source du périmètre : un identifiant d’entreprise fourni par le navigateur ne peut pas élargir l’accès.',
  ].join(' ');
}

export function buildAdminAssistantScope(data: StoreData, userLabel: string): AdminAssistantScope {
  const catalog = getCatalogSnapshot(data);
  const draftValidation = data.catalogDraft
    ? validateCatalogDraft(data)
    : { errors: [], warnings: [] };

  return {
    userLabel,
    companies: [...data.companies],
    employees: [...data.employees],
    roles: [...data.roles],
    orgNodes: [...data.orgNodes],
    subscriptions: [...data.subscriptions],
    modules: getConfiguredModules(data),
    sectorPresets: [...catalog.sectorPresets],
    moduleStatuses: catalog.moduleStatuses,
    removedModules: [...catalog.removedModules],
    catalogDraftPresent: Boolean(data.catalogDraft),
    catalogImpact: getCatalogImpact(data),
    catalogValidation: draftValidation,
  };
}

export function buildAdminAssistantInsights(scope: AdminAssistantScope): AssistantInsight[] {
  const activeCompanies = scope.companies.filter(company => company.status === 'ACTIF');
  const pendingCompanies = scope.companies.filter(company => company.status === 'EN ATTENTE' || company.status === 'BROUILLON');
  const packCount = scope.modules.reduce((total, module) => total + (module.featurePacks?.length ?? 0), 0);
  const inactiveModules = scope.modules.filter(module => scope.moduleStatuses?.[module.id] === 'INACTIF' || scope.removedModules.includes(module.id));
  const insights: AssistantInsight[] = [
    {
      id: 'admin-catalog',
      eyebrow: 'Catalogue',
      title: `${scope.modules.length} module${scope.modules.length > 1 ? 's' : ''} et ${packCount} pack${packCount > 1 ? 's' : ''}`,
      summary: 'La chaîne module, fonctionnalités, packs et permissions est disponible pour préparer les accès.',
      value: `${scope.modules.length}/${packCount}`,
      trend: 'Configuration globale',
      trendDirection: 'steady',
      source: 'Catalogue MAXIMUS',
      tone: 'positive',
    },
    {
      id: 'admin-companies',
      eyebrow: 'Entreprises',
      title: `${activeCompanies.length} entreprise${activeCompanies.length > 1 ? 's' : ''} active${activeCompanies.length > 1 ? 's' : ''}`,
      summary: pendingCompanies.length
        ? `${pendingCompanies.length} demande${pendingCompanies.length > 1 ? 's' : ''} reste${pendingCompanies.length > 1 ? 'nt' : ''} à traiter.`
        : 'Aucune demande en attente dans le périmètre administratif.',
      value: String(activeCompanies.length),
      trend: pendingCompanies.length ? 'À traiter' : 'Stable',
      trendDirection: pendingCompanies.length ? 'down' : 'steady',
      source: 'Registre des entreprises',
      tone: pendingCompanies.length ? 'watch' : 'neutral',
    },
    {
      id: 'admin-organization',
      eyebrow: 'Organisation',
      title: `${scope.orgNodes.length} unité${scope.orgNodes.length > 1 ? 's' : ''} et ${scope.roles.length} rôle${scope.roles.length > 1 ? 's' : ''}`,
      summary: 'La structure est lue avant les employés afin de préserver le périmètre des droits.',
      value: String(scope.employees.length),
      trend: 'Employés suivis',
      trendDirection: 'steady',
      source: 'Organisation et accès',
      tone: 'neutral',
    },
  ];

  if (scope.catalogDraftPresent) {
    insights.push({
      id: 'admin-draft',
      eyebrow: 'Publication',
      title: scope.catalogValidation.errors.length
        ? `${scope.catalogValidation.errors.length} erreur${scope.catalogValidation.errors.length > 1 ? 's' : ''} dans le brouillon`
        : 'Brouillon de catalogue à vérifier',
      summary: scope.catalogValidation.errors[0]
        ?? `${scope.catalogImpact.changedModules} module(s) et ${scope.catalogImpact.changedSectors} secteur(s) ont changé.`,
      trend: scope.catalogValidation.errors.length ? 'Bloqué' : 'Validation requise',
      trendDirection: 'down',
      source: 'Validation du catalogue',
      tone: 'watch',
      proposedAction: {
        label: 'Revoir avant publication',
        detail: 'Contrôler les modules, packs, dépendances et secteurs avant toute publication.',
        impact: 'Aucune modification ne sera publiée automatiquement.',
      },
    });
  }

  if (inactiveModules.length) {
    insights.push({
      id: 'admin-inactive-modules',
      eyebrow: 'Disponibilité',
      title: `${inactiveModules.length} module${inactiveModules.length > 1 ? 's' : ''} non disponible${inactiveModules.length > 1 ? 's' : ''}`,
      summary: inactiveModules.map(module => module.name).join(', '),
      trend: 'À contrôler',
      trendDirection: 'down',
      source: 'Statut du catalogue',
      tone: 'watch',
    });
  }

  return insights;
}

export function answerAdminAssistantQuestion(scope: AdminAssistantScope, rawQuestion: string): AssistantAnswer {
  const question = rawQuestion.trim().toLocaleLowerCase('fr-FR');
  const insights = buildAdminAssistantInsights(scope);
  const catalogSummary = adminCatalogKnowledge(scope);
  const organizationSummary = adminOrganizationKnowledge(scope);

  if (/(module|catalogue|fonctionnalité|fonctionnalites|pack|permission|droit)/.test(question)) {
    const mentionedModule = scope.modules.find(module =>
      question.includes(module.id) || question.includes(module.name.toLocaleLowerCase('fr-FR')),
    );
    const answer = mentionedModule
      ? `${adminModuleLabel(mentionedModule)} propose ${mentionedModule.features.length} fonctionnalité(s). Packs disponibles : ${adminPackSummary(mentionedModule)}. ${mentionedModule.featureDependencies && Object.keys(mentionedModule.featureDependencies).length ? 'Ses dépendances doivent être respectées avant publication.' : ''}`
      : catalogSummary;
    return {
      answer,
      citations: ['Catalogue des modules', 'Packs métiers et permissions', 'Règles de publication'],
      insights,
      suggestedQuestions: ['Comment créer un pack sécurisé ?', 'Comment affecter un module à une entreprise ?', 'Comment vérifier les permissions d’un rôle ?'],
      proposedActions: [],
    };
  }

  if (/(organis|secteur|unité|unite|entreprise|employé|employe|manager|rôle|role)/.test(question)) {
    return {
      answer: organizationSummary,
      citations: ['Registre des entreprises', 'Organisation et accès', 'Gouvernance par unité'],
      insights,
      suggestedQuestions: ['Quel est le parcours complet de création d’une entreprise ?', 'Comment limiter un rôle à son unité ?', 'Comment préparer un secteur ?'],
      proposedActions: [],
    };
  }

  if (/(publier|publication|brouillon|validation|catalogue|retirer|maintenance)/.test(question)) {
    const validation = scope.catalogValidation.errors.length
      ? `Le brouillon est bloqué par : ${scope.catalogValidation.errors.join(' ')}`
      : scope.catalogDraftPresent
        ? `Le brouillon est valide à ce stade. Impact estimé : ${scope.catalogImpact.changedModules} module(s), ${scope.catalogImpact.changedSectors} secteur(s), ${scope.catalogImpact.affectedCompanies} entreprise(s) et ${scope.catalogImpact.affectedUnits} unité(s).`
        : 'Aucun brouillon de catalogue n’est ouvert.';
    return {
      answer: `${validation} La publication reste une décision administrative explicite ; l’assistant ne la déclenche jamais.`,
      citations: ['Workflow du catalogue', 'Validation avant publication'],
      insights,
      suggestedQuestions: ['Quels packs sont disponibles ?', 'Quels secteurs utilisent ce module ?', 'Quelles entreprises seraient affectées ?'],
      proposedActions: [],
    };
  }

  return {
    answer: `Je suis l’assistant de l’administration principale MAXIMUS. Je peux vous aider à comprendre et configurer le catalogue, les modules, les fonctionnalités, les packs, les permissions, les secteurs, les entreprises et l’organisation. ${catalogSummary} ${organizationSummary}`,
    citations: ['Contexte administratif MAXIMUS', 'Catalogue et organisation'],
    insights,
    suggestedQuestions: ['Explique-moi le mécanisme complet de MAXIMUS.', 'Comment créer un pack avec des permissions sûres ?', 'Comment créer et organiser une entreprise ?'],
    proposedActions: [],
  };
}