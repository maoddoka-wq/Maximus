import { presenceFeatureDefinitions, presenceFeatureDependencies, presenceFeaturePacks } from './presence-features';
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
  adminPassword?: string;
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
export interface Product { id: string; sku: string; name: string; category: string; stock: number; threshold: number; price: number; }
export interface Movement { id: string; product: string; quantity: number; type: 'ENTRÉE' | 'SORTIE'; date: string; user: string; location: string; }
export interface Sale { id: string; reference: string; client: string; amount: number; status: Status; date: string; items: { productId: string; quantity: number }[]; discount?: number; taxRate?: number; paymentMethod?: string; paidAmount?: number; }
export interface Payment { id: string; reference: string; invoice: string; amount: number; status: Status; date: string; }
export interface Activity { id: string; user: string; action: string; module: string; object: string; date: string; status: Status; }
export interface OrgNode { id: string; companyId?: string; code?: string; name: string; type: 'direction' | 'sector' | 'service' | 'department'; parentId: string | null; email?: string; phone?: string; location?: string; moduleIds?: ModuleId[]; modulePackIds?: Partial<Record<ModuleId, string[]>>; moduleFeatures?: Partial<Record<ModuleId, string[]>>; managerEmployeeId?: string; }
export interface PurchaseOrder { id: string; reference: string; supplier: string; subject: string; amount: number; date: string; status: Status; productId?: string; quantity?: number; }
export interface AccountingEntry { id: string; reference: string; journal: string; label: string; debit: number; credit: number; date: string; status: Status; }
export interface PayrollSlip { id: string; reference: string; employee: string; period: string; gross: number; net: number; status: Status; }
export interface CrmOpportunity { id: string; client: string; contact: string; subject: string; amount: number; nextAction: string; status: Status; }
export interface SupplierRecord { id: string; name: string; contact: string; phone: string; category: string; score: number; status: Status; }
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
  payments: Payment[];
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
  { id: 'commerce', name: 'Gestion commerciale', description: 'Ventes, clients et performance commerciale.', features: ['Clients', 'Devis et commandes', 'Chiffre d’affaires'], featurePacks: [
    { id: 'commerce-consultation', name: 'Consultation commerciale', description: 'Consulter les clients et le suivi commercial.', featureIds: ['clients', 'dashboard'] },
    { id: 'commerce-gestion', name: 'Gestion commerciale', description: 'Gérer les ventes, clients et indicateurs.', featureIds: ['clients', 'sales', 'products', 'reports'] },
  ], status: 'ACTIF' },
  { id: 'stocks', name: 'Gestion de stock', description: 'Articles, entrées, sorties et niveaux de stock.', features: ['Articles', 'Entrées et sorties', 'Alertes de seuil'], featureDependencies: { 'entrees-et-sorties': ['articles'], 'alertes-de-seuil': ['articles'] }, featurePacks: [
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
  { id: 'agroalimentaire', name: 'Agroalimentaire', moduleIds: ['commerce', 'stocks'] },
  { id: 'services', name: 'Services', moduleIds: ['commerce', 'stocks', 'presences'] },
  { id: 'commerce', name: 'Commerce', moduleIds: ['commerce', 'stocks'] },
];

export function getConfiguredModules(data: Pick<StoreData, 'moduleOverrides' | 'removedModules'>): Module[] {
  return modules
    .filter(module => !data.removedModules?.includes(module.id))
    .map(module => ({ ...module, ...(data.moduleOverrides?.[module.id] ?? {}) }));
}

export function emptyStoreData(): StoreData {
  return {
    companies: [], employees: [], roles: [], products: [], movements: [], sales: [], payments: [],
    activities: [], controlTasks: [], domainEvents: [], auditEntries: [], orgNodes: [], notifications: [],
    purchaseOrders: [], accountingEntries: [], payrollSlips: [], crmOpportunities: [], supplierRecords: [],
    deliveries: [], businessDocuments: [], subscriptions: [], commerceStates: {},
    sectorPresets: sectorPresets.map(preset => ({ ...preset, moduleIds: [...preset.moduleIds] })),
    moduleStatuses: Object.fromEntries(modules.map(module => [module.id, module.status])) as ModuleStatusMap,
    moduleOverrides: {}, removedModules: [], catalogVersion: 1, organizationVersion: 1,
  };
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