import { presenceFeatureDefinitions, presenceFeatureDependencies, presenceFeaturePacks } from './presence-features';
import { ecommerceFeatureDefinitions, ecommerceFeatureDependencies, ecommerceFeaturePacks } from './ecommerce-features';
import type { ModuleId } from './module-ids';
import { buildSubscriptionForCompany, type CompanySubscription } from './subscription-model';
import type { CatalogDraft } from './catalog-workflow';

export type { ModuleId } from './module-ids';
export type {
  CompanySubscription,
  InvoiceStatus,
  PaymentMethodType,
  SubscriptionEventType,
  SubscriptionHistoryEntry,
  SubscriptionInterval,
  SubscriptionLimits,
  SubscriptionPaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from './subscription-model';
export { subscriptionPlans } from './subscription-model';

export type Status = 'ACTIF' | 'EN ATTENTE' | 'SUSPENDU' | 'REFUSÉ' | 'ARCHIVÉ' | 'BROUILLON' | 'VALIDÉ' | 'CONFIRMÉ';
export type ModuleAvailability = 'ACTIF' | 'BETA' | 'MAINTENANCE' | 'INACTIF';
export type ModuleStatusMap = Partial<Record<ModuleId, ModuleAvailability>>;

export interface Company {
  id: string;
  name: string;
  manager: string;
  email: string;
  phone: string;
  country: string;
  sector: string;
  status: Status;
  requestedModules: ModuleId[];
  requestedModulePackIds?: Partial<Record<ModuleId, string[]>>;
  requestedBusinessProfileId?: string;
  requestedModuleFeatures?: Partial<Record<ModuleId, string[]>>;
  requestedModulePermissions?: Partial<Record<ModuleId, Partial<Record<string, string[]>>>>;
  allowedModules: ModuleId[];
  refusedModules: ModuleId[];
  createdAt: string;
  profilePhoto?: string;
  primaryColor?: string;
  accentColor?: string;
  sidebarColor?: string;
  managerRoleId?: string;
}

export interface ModuleFeaturePack {
  id: string;
  name: string;
  description?: string;
  featureIds: string[];
  featurePermissions?: Partial<Record<string, string[]>>;
}

export interface Module {
  id: ModuleId;
  name: string;
  description: string;
  features: string[];
  featureDependencies?: Partial<Record<string, string[]>>;
  featurePacks?: ModuleFeaturePack[];
  status: 'ACTIF' | 'BETA';
}

export type ModuleOverrides = Partial<Record<ModuleId, Partial<Pick<Module, 'name' | 'description' | 'features' | 'featureDependencies' | 'featurePacks'>>>>;
export interface SectorBusinessProfile { id: string; name: string; description?: string; modulePackIds?: Partial<Record<ModuleId, string[]>>; moduleFeatures: Partial<Record<ModuleId, string[]>>; }
export interface SectorPreset { id: string; name: string; moduleIds: ModuleId[]; modulePackIds?: Partial<Record<ModuleId, string[]>>; moduleFeatures?: Partial<Record<ModuleId, string[]>>; businessProfiles?: SectorBusinessProfile[]; }
export interface Employee { id: string; firstName: string; lastName: string; email: string; phone: string; position: string; department: string; subDepartment: string; role: string; status: Status; loginPassword?: string; isSectorAdmin?: boolean; companyId?: string; sectorId?: string; roleId?: string; }
export interface Role { id: string; name: string; description: string; modulePermissions: Record<string, string[]>; companyId?: string; sectorId?: string; packId?: string; packModuleId?: ModuleId; }
export interface Product { id: string; sku: string; name: string; category: string; stock: number; threshold: number; price: number; companyId?: string; }
export interface Movement { id: string; product: string; quantity: number; type: 'ENTRÉE' | 'SORTIE'; date: string; user: string; location: string; companyId?: string; }
export interface Sale { id: string; reference: string; client: string; amount: number; status: Status; date: string; items: { productId: string; quantity: number }[]; discount?: number; taxRate?: number; paymentStatus?: 'NON_PAYÉ' | 'PARTIEL' | 'PAYÉ'; paidAmount?: number; paymentMethod?: 'ESPÈCES' | 'MOBILE MONEY' | 'VIREMENT' | 'CRÉDIT'; companyId?: string; }
export interface Activity { id: string; user: string; action: string; module: string; object: string; date: string; status: Status; companyId?: string; }
export interface OrgNode { id: string; companyId?: string; code?: string; name: string; type?: string; parentId: string | null; email?: string; phone?: string; location?: string; moduleIds?: ModuleId[]; modulePackIds?: Partial<Record<ModuleId, string[]>>; moduleFeatures?: Partial<Record<ModuleId, string[]>>; managerEmployeeId?: string; }
export interface PurchaseOrder { id: string; reference: string; supplier: string; subject: string; amount: number; date: string; status: Status; productId?: string; quantity?: number; companyId?: string; }
export interface AccountingEntry { id: string; reference: string; journal: string; label: string; debit: number; credit: number; date: string; status: Status; }
export interface PayrollSlip { id: string; reference: string; employee: string; period: string; gross: number; net: number; status: Status; }
export interface CrmOpportunity { id: string; client: string; contact: string; subject: string; amount: number; nextAction: string; status: Status; }
export interface SupplierRecord { id: string; name: string; contact: string; phone: string; category: string; score: number; status: Status; companyId?: string; }
export interface Delivery { id: string; reference: string; recipient: string; destination: string; driver: string; date: string; status: Status; }
export interface BusinessDocument { id: string; name: string; category: string; owner: string; updatedAt: string; version: number; status: Status; }
export type NotificationAudience = 'all' | 'admin' | 'company';
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';
export type ControlTaskStatus = 'À FAIRE' | 'EN COURS' | 'VALIDÉ' | 'REFUSÉ' | 'TERMINÉ';
export type ControlTaskPriority = 'BASSE' | 'NORMALE' | 'HAUTE' | 'CRITIQUE';
export type DomainEventType = 'TASK_CREATED' | 'TASK_STATUS_CHANGED' | 'APPROVAL_GRANTED' | 'APPROVAL_REFUSED' | 'SYSTEM';
export interface ControlTask { id: string; title: string; description: string; companyId?: string; sectorId?: string; moduleId?: ModuleId; assigneeEmployeeId?: string; assigneeName?: string; createdBy: string; status: ControlTaskStatus; priority: ControlTaskPriority; requiresApproval?: boolean; dueDate?: string; relatedObject?: string; createdAt: string; updatedAt: string; }
export interface DomainEvent { id: string; type: DomainEventType; label: string; summary: string; companyId?: string; moduleId?: ModuleId; actorName: string; entityType: string; entityId?: string; severity: NotificationSeverity; createdAt: string; }
export interface AuditEntry { id: string; action: string; summary: string; companyId?: string; moduleId?: ModuleId; actorName: string; entityType: string; entityId?: string; createdAt: string; }
export interface AppNotification { id: string; title: string; text: string; read: boolean; date: string; audience?: NotificationAudience; companyId?: string; module?: ModuleId; severity?: NotificationSeverity; href?: string; }
export interface NotificationContext { isAdmin: boolean; companyId?: string; }

export interface StoreData {
  companies: Company[];
  employees: Employee[];
  roles: Role[];
  products: Product[];
  movements: Movement[];
  sales: Sale[];
  activities: Activity[];
  controlTasks: ControlTask[];
  domainEvents: DomainEvent[];
  auditEntries: AuditEntry[];
  orgNodes: OrgNode[];
  notifications: AppNotification[];
  purchaseOrders: PurchaseOrder[];
  accountingEntries: AccountingEntry[];
  payrollSlips: PayrollSlip[];
  crmOpportunities: CrmOpportunity[];
  supplierRecords: SupplierRecord[];
  deliveries: Delivery[];
  businessDocuments: BusinessDocument[];
  subscriptions: CompanySubscription[];
  commerceStates: Record<string, unknown>;
  sectorPresets: SectorPreset[];
  moduleStatuses?: ModuleStatusMap;
  moduleOverrides?: ModuleOverrides;
  removedModules?: ModuleId[];
  catalogDraft?: CatalogDraft;
  catalogVersion?: number;
  organizationVersion?: number;
}

export const modules: Module[] = [
  { id: 'commerce', name: 'Gestion commerciale', description: 'Piloter les ventes, les clients, les achats et la performance commerciale.', features: ['Clients', 'Devis et commandes', 'Chiffre d’affaires'], featurePacks: [
    { id: 'commerce-consultation', name: 'Consultation commerciale', description: 'Consulter les clients et le suivi commercial.', featureIds: ['clients', 'dashboard'] },
    { id: 'commerce-gestion', name: 'Gestion commerciale', description: 'Gérer les ventes, clients et indicateurs.', featureIds: ['clients', 'sales', 'products', 'reports'] },
  ], status: 'ACTIF' },
  { id: 'ecommerce', name: 'E-commerce', description: 'Boutique en ligne, catalogue public et commandes clients.', features: ecommerceFeatureDefinitions.map(feature => feature.label), featureDependencies: ecommerceFeatureDependencies, featurePacks: ecommerceFeaturePacks.map(pack => ({ ...pack, featureIds: [...pack.featureIds], featurePermissions: Object.fromEntries(Object.entries(pack.featurePermissions).map(([featureId, permissions]) => [featureId, [...permissions]])) })), status: 'ACTIF' },
  { id: 'stocks', name: 'Gestion de stock', description: 'Suivre les articles, les entrées, les sorties et les niveaux de stock.', features: ['Articles', 'Entrées et sorties', 'Alertes de seuil'], featureDependencies: { 'entrees-et-sorties': ['articles'], 'alertes-de-seuil': ['articles'] }, featurePacks: [
    { id: 'stock-consultation', name: 'Consultation du stock', description: 'Consulter les articles et les niveaux de stock.', featureIds: ['dashboard', 'products', 'reports'] },
    { id: 'stock-gestion', name: 'Gestionnaire de stock', description: 'Gérer les entrées, sorties et inventaires.', featureIds: ['dashboard', 'products', 'entries', 'exits', 'inventory', 'reports'] },
    { id: 'stock-responsable', name: 'Responsable de stock', description: 'Piloter les opérations et les paramètres du stock.', featureIds: ['dashboard', 'products', 'entries', 'exits', 'requests', 'inventory', 'reports', 'references', 'users', 'settings'] },
  ], status: 'ACTIF' },
  { id: 'presences', name: 'Présences', description: 'Pointage, absences, horaires et suivi quotidien des équipes.', features: presenceFeatureDefinitions.map(feature => feature.label), featureDependencies: presenceFeatureDependencies, featurePacks: presenceFeaturePacks, status: 'ACTIF' },
];

export const stockSubmodules = [
  { id: 'dashboard', name: 'Tableau de bord' },
  { id: 'products', name: 'Articles' },
  { id: 'entries', name: 'Entrées de stock' },
  { id: 'exits', name: 'Sorties de stock' },
  { id: 'requests', name: 'Demandes' },
  { id: 'inventory', name: 'Inventaire' },
  { id: 'reports', name: 'Rapports' },
  { id: 'references', name: 'Référentiels' },
  { id: 'users', name: 'Utilisateurs' },
  { id: 'settings', name: 'Paramètres' },
] as const;
export const stockSubmoduleDependencies: Partial<Record<string, string[]>> = {
  entries: ['products'], exits: ['products'], requests: ['products'], inventory: ['products'],
  reports: ['products'], references: ['products'], users: ['products'], settings: ['products'],
};

export const sectorPresets: SectorPreset[] = [
  { id: 'distribution', name: 'Distribution', moduleIds: ['commerce', 'stocks'], modulePackIds: { stocks: ['stock-gestion'], commerce: ['commerce-gestion'] } },
  { id: 'agroalimentaire', name: 'Agroalimentaire', moduleIds: ['commerce', 'stocks'], modulePackIds: { stocks: ['stock-gestion'], commerce: ['commerce-gestion'] } },
  { id: 'services', name: 'Services', moduleIds: ['commerce', 'stocks', 'presences'], modulePackIds: { stocks: ['stock-consultation'], commerce: ['commerce-consultation'], presences: ['presence-consultation'] } },
  { id: 'commerce', name: 'Commerce', moduleIds: ['commerce', 'stocks', 'ecommerce'], modulePackIds: { commerce: ['commerce-gestion'], stocks: ['stock-gestion'], ecommerce: ['ecommerce-gestion'] } },
];

// These legacy presets are intentionally no longer offered for new companies.
// Keeping the ids here lets normalization clean old persisted payloads without
// changing the compatibility data used to repair historical pack selections.
export const retiredSectorPresetIds = ['distribution', 'agroalimentaire', 'services', 'commerce'] as const;
const isRetiredSectorPreset = (preset: Pick<SectorPreset, 'id'>) =>
  retiredSectorPresetIds.includes(preset.id as (typeof retiredSectorPresetIds)[number]);

export function getConfiguredModules(data: Pick<StoreData, 'moduleOverrides' | 'removedModules'>): Module[] {
  return modules
    .filter(module => !data.removedModules?.includes(module.id))
    .map(module => {
      const override = data.moduleOverrides?.[module.id];
      if (!override || typeof override !== 'object') return module;

      const featurePacks = Array.isArray(override.featurePacks)
        ? override.featurePacks
            .filter((pack): pack is ModuleFeaturePack => Boolean(pack && typeof pack === 'object'))
            .map(pack => ({
              ...pack,
              id: typeof pack.id === 'string' ? pack.id : '',
              name: typeof pack.name === 'string' ? pack.name : '',
              description: typeof pack.description === 'string' ? pack.description : '',
              featureIds: Array.isArray(pack.featureIds)
                ? pack.featureIds.filter((featureId): featureId is string => typeof featureId === 'string')
                : [],
              featurePermissions:
                pack.featurePermissions && typeof pack.featurePermissions === 'object' && !Array.isArray(pack.featurePermissions)
                  ? Object.fromEntries(
                      Object.entries(pack.featurePermissions).map(([featureId, permissions]) => [
                        featureId,
                        Array.isArray(permissions)
                          ? permissions.filter((permission): permission is string => typeof permission === 'string')
                          : [],
                      ]),
                    )
                  : {},
            }))
            .filter(pack => pack.id.length > 0)
        : module.featurePacks;

      return {
        ...module,
        ...override,
        name: typeof override.name === 'string' ? override.name : module.name,
        description: typeof override.description === 'string' ? override.description : module.description,
        features: Array.isArray(override.features)
          ? override.features.filter((feature): feature is string => typeof feature === 'string')
          : module.features,
        featureDependencies:
          override.featureDependencies &&
          typeof override.featureDependencies === 'object' &&
          !Array.isArray(override.featureDependencies)
            ? override.featureDependencies
            : module.featureDependencies,
        featurePacks,
      };
    });
}

function restoreBuiltInSectorPackSelections(presets: SectorPreset[]): SectorPreset[] {
  return presets.map(preset => {
    const builtIn = sectorPresets.find(candidate => candidate.id === preset.id);
    if (!builtIn) return preset;
    return {
      ...preset,
      modulePackIds: {
        ...builtIn.modulePackIds,
        ...(preset.modulePackIds ?? {}),
      },
    };
  });
}

export function emptyStoreData(): StoreData {
  return {
    companies: [], employees: [], roles: [], products: [], movements: [], sales: [],
    activities: [], controlTasks: [], domainEvents: [], auditEntries: [], orgNodes: [], notifications: [],
    purchaseOrders: [], accountingEntries: [], payrollSlips: [], crmOpportunities: [], supplierRecords: [],
    deliveries: [], businessDocuments: [], subscriptions: [], commerceStates: {},
    sectorPresets: structuredClone(sectorPresets.filter((preset) => !isRetiredSectorPreset(preset))),
    moduleStatuses: Object.fromEntries(modules.map(module => [module.id, module.status])) as ModuleStatusMap,
    moduleOverrides: {}, removedModules: [], catalogVersion: 1, organizationVersion: 1,
  };
}

const storeArrayKeys = [
  'companies',
  'employees',
  'roles',
  'products',
  'movements',
  'sales',
  'activities',
  'controlTasks',
  'domainEvents',
  'auditEntries',
  'orgNodes',
  'notifications',
  'purchaseOrders',
  'accountingEntries',
  'payrollSlips',
  'crmOpportunities',
  'supplierRecords',
  'deliveries',
  'businessDocuments',
  'subscriptions',
  'sectorPresets',
] as const;

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function normalizeStringArrayMap(value: unknown): Partial<Record<string, string[]>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, items]) => [key, normalizeStringArray(items)]),
  );
}

export function normalizeStoreData(input: Partial<StoreData> | null | undefined): StoreData {
  const defaults = emptyStoreData();
  const source = input && typeof input === 'object' ? input : {};
  const normalized = { ...defaults, ...source } as StoreData;
  delete (normalized as StoreData & { payments?: unknown }).payments;

  for (const key of storeArrayKeys) {
    if (!Array.isArray(source[key])) {
      normalized[key] = defaults[key] as never;
    }
  }
  const companyText = (value: unknown) => typeof value === 'string' ? value : '';
  normalized.companies = normalized.companies
    .filter((company): company is NonNullable<typeof company> => Boolean(company && typeof company === 'object'))
    .map(company => {
      const raw = company as Company & Record<string, unknown>;
      const normalizedCompany: Company = {
        ...company,
        name: companyText(raw.name),
        manager: companyText(raw.manager),
        email: companyText(raw.email),
        phone: companyText(raw.phone),
        country: companyText(raw.country),
        sector: companyText(raw.sector),
        requestedModules: normalizeStringArray(raw.requestedModules) as ModuleId[],
        allowedModules: normalizeStringArray(raw.allowedModules) as ModuleId[],
        refusedModules: normalizeStringArray(raw.refusedModules) as ModuleId[],
      };
      if (raw.requestedModulePackIds !== undefined) {
        normalizedCompany.requestedModulePackIds = normalizeStringArrayMap(raw.requestedModulePackIds) as Partial<Record<ModuleId, string[]>>;
      }
      if (raw.requestedModuleFeatures !== undefined) {
        normalizedCompany.requestedModuleFeatures = normalizeStringArrayMap(raw.requestedModuleFeatures) as Partial<Record<ModuleId, string[]>>;
      }
      return normalizedCompany;
    });
  if (!source.commerceStates || Array.isArray(source.commerceStates) || typeof source.commerceStates !== 'object') {
    normalized.commerceStates = defaults.commerceStates;
  }
  if (!source.moduleOverrides || Array.isArray(source.moduleOverrides) || typeof source.moduleOverrides !== 'object') {
    normalized.moduleOverrides = defaults.moduleOverrides;
  }
  if (!source.moduleStatuses || Array.isArray(source.moduleStatuses) || typeof source.moduleStatuses !== 'object') {
    normalized.moduleStatuses = defaults.moduleStatuses;
  }
  if (!Array.isArray(source.removedModules)) {
    normalized.removedModules = defaults.removedModules;
  }
  if (Array.isArray(source.sectorPresets)) {
    normalized.sectorPresets = restoreBuiltInSectorPackSelections(normalized.sectorPresets)
      .filter((preset) => !isRetiredSectorPreset(preset));
  }
  if (normalized.catalogDraft?.sectorPresets) {
    normalized.catalogDraft = {
      ...normalized.catalogDraft,
      sectorPresets: restoreBuiltInSectorPackSelections(normalized.catalogDraft.sectorPresets)
        .filter((preset) => !isRetiredSectorPreset(preset)),
    };
  }

  return normalized;
}

export function sanitizeStoreData(data: Partial<StoreData> | null | undefined): StoreData {
  const safe = structuredClone(normalizeStoreData(data)) as StoreData;
  const stripCredentials = <T extends object>(value: T): T => {
    const copy = { ...value } as Record<string, unknown>;
    delete copy.loginPassword;
    delete copy.adminPassword;
    return copy as T;
  };
  safe.companies = safe.companies.map(company => stripCredentials(company));
  safe.employees = safe.employees.map(employee => stripCredentials(employee));
  return safe;
}

export function getCompanyDirectoryCompanies(companies: Company[]): Company[] {
  return companies.filter(company => company.status !== 'EN ATTENTE');
}

export function seedData(): StoreData { return emptyStoreData(); }

export function uid(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
export const money = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA';
export const shortMoney = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

export function getVisibleNotifications(notifications: AppNotification[], context: NotificationContext) {
  return notifications.filter(notification => {
    if (context.isAdmin) return true;
    if (notification.audience === 'admin') return false;
    return !notification.companyId || notification.companyId === context.companyId;
  });
}

export function addNotification(draft: StoreData, input: Omit<Partial<AppNotification>, 'read' | 'title' | 'text'> & Pick<AppNotification, 'title' | 'text'>) {
  draft.notifications.unshift({
    ...input,
    id: input.id ?? uid('notification'),
    title: input.title,
    text: input.text,
    read: false,
    date: input.date ?? 'À l’instant',
    audience: input.audience ?? 'all',
    severity: input.severity ?? 'info',
  });
  draft.notifications = draft.notifications.slice(0, 100);
}

export function recordControlEvent(
  draft: StoreData,
  input: {
    type: DomainEventType;
    label: string;
    summary: string;
    actorName: string;
    entityType: string;
    entityId?: string;
    companyId?: string;
    moduleId?: ModuleId;
    severity?: NotificationSeverity;
  },
) {
  const createdAt = new Date().toISOString();
  draft.domainEvents.unshift({
    id: uid('event'), type: input.type, label: input.label, summary: input.summary,
    companyId: input.companyId, moduleId: input.moduleId, actorName: input.actorName,
    entityType: input.entityType, entityId: input.entityId, severity: input.severity ?? 'info', createdAt,
  });
  draft.auditEntries.unshift({
    id: uid('audit'),
    action: input.label.toUpperCase().replaceAll(' ', '_'),
    summary: input.summary, companyId: input.companyId, moduleId: input.moduleId,
    actorName: input.actorName, entityType: input.entityType, entityId: input.entityId, createdAt,
  });
  draft.domainEvents = draft.domainEvents.slice(0, 200);
  draft.auditEntries = draft.auditEntries.slice(0, 200);
}