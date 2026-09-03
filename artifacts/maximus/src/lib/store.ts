export type Status = 'ACTIF' | 'EN ATTENTE' | 'SUSPENDU' | 'REFUSÉ' | 'ARCHIVÉ' | 'BROUILLON' | 'VALIDÉ' | 'CONFIRMÉ';
export type ModuleId =
  | 'commerce'
  | 'ventes'
  | 'achats'
  | 'stocks'
  | 'finance'
  | 'comptabilite'
  | 'rh'
  | 'presences'
  | 'paie'
  | 'crm'
  | 'fournisseurs'
  | 'logistique'
  | 'documents'
  | 'rapports';

export interface Company { id: string; name: string; manager: string; email: string; phone: string; country: string; sector: string; status: Status; requestedModules: ModuleId[]; allowedModules: ModuleId[]; refusedModules: ModuleId[]; createdAt: string; adminPassword?: string; profilePhoto?: string; }
export interface Module { id: ModuleId; name: string; description: string; features: string[]; status: 'ACTIF' | 'BETA'; }
export type ModuleAvailability = 'ACTIF' | 'BETA' | 'INACTIF';
export type ModuleStatusMap = Partial<Record<ModuleId, ModuleAvailability>>;
export type ModuleOverrides = Partial<Record<ModuleId, Partial<Pick<Module, 'name' | 'description' | 'features'>>>>;
export interface SectorPreset { id: string; name: string; moduleIds: ModuleId[]; }
export interface Employee { id: string; firstName: string; lastName: string; email: string; phone: string; position: string; department: string; subDepartment: string; role: string; status: Status; loginPassword?: string; isSectorAdmin?: boolean; companyId?: string; sectorId?: string; roleId?: string; }
export interface Role { id: string; name: string; description: string; modulePermissions: Record<string, string[]>; companyId?: string; sectorId?: string; }
export interface Product { id: string; sku: string; name: string; category: string; stock: number; threshold: number; price: number; }
export interface Movement { id: string; product: string; quantity: number; type: 'ENTRÉE' | 'SORTIE'; date: string; user: string; location: string; }
export interface Sale { id: string; reference: string; client: string; amount: number; status: Status; date: string; items: { productId: string; quantity: number }[]; }
export interface Payment { id: string; reference: string; invoice: string; amount: number; status: Status; date: string; }
export interface Activity { id: string; user: string; action: string; module: string; object: string; date: string; status: Status; }
export interface OrgNode { id: string; companyId?: string; code?: string; name: string; type: 'direction' | 'sector' | 'service' | 'department'; parentId: string | null; email?: string; phone?: string; location?: string; moduleIds?: ModuleId[]; managerEmployeeId?: string; }
export interface PurchaseOrder { id: string; reference: string; supplier: string; subject: string; amount: number; date: string; status: Status; }
export interface AccountingEntry { id: string; reference: string; journal: string; label: string; debit: number; credit: number; date: string; status: Status; }
export interface PayrollSlip { id: string; reference: string; employee: string; period: string; gross: number; net: number; status: Status; }
export interface CrmOpportunity { id: string; client: string; contact: string; subject: string; amount: number; nextAction: string; status: Status; }
export interface SupplierRecord { id: string; name: string; contact: string; phone: string; category: string; score: number; status: Status; }
export interface Delivery { id: string; reference: string; recipient: string; destination: string; driver: string; date: string; status: Status; }
export interface BusinessDocument { id: string; name: string; category: string; owner: string; updatedAt: string; version: number; status: Status; }
export interface StoreData { companies: Company[]; employees: Employee[]; roles: Role[]; products: Product[]; movements: Movement[]; sales: Sale[]; payments: Payment[]; activities: Activity[]; orgNodes: OrgNode[]; notifications: { id: string; title: string; text: string; read: boolean; date: string }[]; purchaseOrders: PurchaseOrder[]; accountingEntries: AccountingEntry[]; payrollSlips: PayrollSlip[]; crmOpportunities: CrmOpportunity[]; supplierRecords: SupplierRecord[]; deliveries: Delivery[]; businessDocuments: BusinessDocument[]; sectorPresets: SectorPreset[]; moduleStatuses?: ModuleStatusMap; moduleOverrides?: ModuleOverrides; removedModules?: ModuleId[]; }
export interface StoreData { catalogVersion?: number; organizationVersion?: number; }

const today = new Date().toISOString();
export const modules: Module[] = [
  { id: 'commerce', name: 'Gestion commerciale', description: 'Ventes, clients et performance commerciale.', features: ['Clients', 'Devis et commandes', 'Chiffre d’affaires'], status: 'ACTIF' },
  { id: 'ventes', name: 'Ventes', description: 'Devis, commandes, factures et paiements clients.', features: ['Devis', 'Commandes', 'Facturation'], status: 'ACTIF' },
  { id: 'achats', name: 'Achats', description: 'Demandes, commandes et suivi des achats.', features: ['Demandes d’achat', 'Commandes fournisseurs', 'Réceptions'], status: 'ACTIF' },
  { id: 'stocks', name: 'Gestion de stock', description: 'Articles, entrées, sorties et niveaux de stock.', features: ['Articles', 'Entrées et sorties', 'Alertes de seuil'], status: 'ACTIF' },
  { id: 'finance', name: 'Finance', description: 'Trésorerie, paiements et pilotage financier.', features: ['Suivi des paiements', 'Trésorerie', 'Rapports financiers'], status: 'ACTIF' },
  { id: 'comptabilite', name: 'Comptabilité', description: 'Écritures, rapprochements et clôture comptable.', features: ['Plan comptable', 'Journaux', 'Rapprochement'], status: 'ACTIF' },
  { id: 'rh', name: 'Ressources humaines', description: 'Collaborateurs, rôles et organisation.', features: ['Employés', 'Rôles', 'Organisation'], status: 'ACTIF' },
  { id: 'presences', name: 'Présences', description: 'Présences et suivi quotidien des équipes.', features: ['Pointage', 'Historique', 'Rapports'], status: 'ACTIF' },
  { id: 'paie', name: 'Paie', description: 'Préparation et suivi des bulletins de salaire.', features: ['Périodes de paie', 'Bulletins', 'Déclarations'], status: 'ACTIF' },
  { id: 'crm', name: 'CRM / Clients', description: 'Fiches clients, opportunités et relances.', features: ['Fiches clients', 'Opportunités', 'Relances'], status: 'ACTIF' },
  { id: 'fournisseurs', name: 'Fournisseurs', description: 'Référentiel et relations fournisseurs.', features: ['Référentiel', 'Évaluation', 'Historique'], status: 'ACTIF' },
  { id: 'logistique', name: 'Logistique', description: 'Entrepôts, livraisons et transport.', features: ['Entrepôts', 'Livraisons', 'Transport'], status: 'ACTIF' },
  { id: 'documents', name: 'Documents', description: 'Classement et circulation des documents métier.', features: ['Classement', 'Partage', 'Versions'], status: 'ACTIF' },
  { id: 'rapports', name: 'Rapports', description: 'Synthèses et indicateurs pour décider plus vite.', features: ['Rapports métier', 'Filtres', 'Exports'], status: 'ACTIF' },
];
export const sectorPresets: SectorPreset[] = [
  { id: 'distribution', name: 'Distribution', moduleIds: ['commerce', 'ventes', 'achats', 'stocks', 'fournisseurs', 'logistique'] },
  { id: 'agroalimentaire', name: 'Agroalimentaire', moduleIds: ['achats', 'stocks', 'fournisseurs', 'logistique', 'commerce'] },
  { id: 'services', name: 'Services', moduleIds: ['commerce', 'stocks', 'finance', 'rh', 'presences', 'documents', 'rapports'] },
  { id: 'commerce', name: 'Commerce', moduleIds: ['commerce', 'ventes', 'stocks', 'finance'] },
];

export function seedData(): StoreData {
  return {
    catalogVersion: 2,
    organizationVersion: 3,
    sectorPresets: sectorPresets.map(preset => ({ ...preset, moduleIds: [...preset.moduleIds] })),
    companies: [
      { id: 'kora', name: 'KORA Distribution', manager: 'Aminata Diop', email: 'admin@kora.demo', adminPassword: 'Kora123!', phone: '+221 77 501 22 18', country: 'Sénégal', sector: 'Distribution', status: 'ACTIF', requestedModules: ['commerce', 'ventes', 'achats', 'stocks', 'finance', 'comptabilite', 'rh', 'presences', 'paie', 'crm', 'fournisseurs', 'logistique', 'documents', 'rapports'], allowedModules: ['commerce', 'ventes', 'achats', 'stocks', 'finance', 'comptabilite', 'rh', 'presences', 'paie', 'crm', 'fournisseurs', 'logistique', 'documents', 'rapports'], refusedModules: [], createdAt: '2024-04-12' },
      { id: 'teranga', name: 'Teranga Agro', manager: 'Moussa Fall', email: 'contact@teranga.demo', adminPassword: 'Kora123!', phone: '+221 76 210 08 34', country: 'Sénégal', sector: 'Agroalimentaire', status: 'EN ATTENTE', requestedModules: ['finance', 'stocks'], allowedModules: [], refusedModules: [], createdAt: '2024-06-18' },
      { id: 'naya', name: 'Naya Services', manager: 'Fatou Camara', email: 'hello@naya.demo', adminPassword: 'Kora123!', phone: '+225 07 44 19 02', country: 'Côte d’Ivoire', sector: 'Services', status: 'SUSPENDU', requestedModules: ['finance', 'rh'], allowedModules: ['finance', 'rh'], refusedModules: [], createdAt: '2024-03-02' },
    ],
    employees: [
      { id: 'demo-emp-awa', firstName: 'Awa', lastName: 'Ndiaye', email: 'awa.ndiaye@kora.demo', phone: '+221 77 640 28 91', position: 'Gestionnaire commerciale', department: 'Commerce', subDepartment: 'Ventes', role: 'Vendeuse', status: 'ACTIF', loginPassword: 'AwaKora2026!', companyId: 'kora' },
      { id: 'demo-emp-ibrahima', firstName: 'Ibrahima', lastName: 'Kane', email: 'ibrahima.kane@kora.demo', phone: '+221 76 512 44 08', position: 'Responsable magasin', department: 'Logistique', subDepartment: 'Stock', role: 'Magasinier', status: 'ACTIF', loginPassword: 'IbrahimaKora2026!', companyId: 'kora' },
      { id: 'demo-emp-ndeye', firstName: 'Ndeye', lastName: 'Sarr', email: 'ndeye.sarr@kora.demo', phone: '+221 78 304 19 62', position: 'Assistante RH', department: 'Ressources humaines', subDepartment: 'Administration du personnel', role: 'Gestionnaire RH', status: 'ACTIF', loginPassword: 'NdeyeKora2026!', companyId: 'kora' },
    ],
    roles: [],
    products: [
      { id: 'p-1', sku: 'KOR-CAF-01', name: 'Café Touba 250g', category: 'Épicerie', stock: 184, threshold: 50, price: 3500 },
      { id: 'p-2', sku: 'KOR-HUI-02', name: 'Huile d’arachide 1L', category: 'Épicerie', stock: 38, threshold: 45, price: 2200 },
      { id: 'p-3', sku: 'KOR-RIZ-03', name: 'Riz local 5kg', category: 'Épicerie', stock: 76, threshold: 30, price: 6800 },
      { id: 'p-4', sku: 'KOR-SAV-04', name: 'Savon naturel', category: 'Hygiène', stock: 12, threshold: 25, price: 1200 },
      { id: 'p-5', sku: 'KOR-COS-05', name: 'Baume karité 100ml', category: 'Bien-être', stock: 92, threshold: 20, price: 4500 },
    ],
    movements: [
      { id: 'm-1', product: 'Huile d’arachide 1L', quantity: 20, type: 'SORTIE', date: 'Aujourd’hui, 09:42', user: 'Ibrahima Kane', location: 'Boutique Dakar' },
      { id: 'm-2', product: 'Café Touba 250g', quantity: 80, type: 'ENTRÉE', date: 'Hier, 16:18', user: 'Ndeye Sarr', location: 'Entrepôt principal' },
      { id: 'm-3', product: 'Savon naturel', quantity: 8, type: 'SORTIE', date: 'Hier, 11:05', user: 'Ibrahima Kane', location: 'Boutique Dakar' },
    ],
    sales: [
      { id: 's-1', reference: 'VTE-240618-004', client: 'Boutique Keur Gui', amount: 186500, status: 'VALIDÉ', date: 'Aujourd’hui, 10:14', items: [{ productId: 'p-1', quantity: 12 }, { productId: 'p-2', quantity: 8 }] },
      { id: 's-2', reference: 'VTE-240617-021', client: 'Marché Tilène', amount: 94500, status: 'VALIDÉ', date: 'Hier, 15:38', items: [{ productId: 'p-3', quantity: 5 }] },
      { id: 's-3', reference: 'VTE-240617-019', client: 'Maison Baobab', amount: 42000, status: 'BROUILLON', date: 'Hier, 12:07', items: [] },
    ],
    payments: [
      { id: 'pay-1', reference: 'PAY-09281', invoice: 'FAC-2406-18', amount: 186500, status: 'CONFIRMÉ', date: 'Aujourd’hui, 10:18' },
      { id: 'pay-2', reference: 'PAY-09264', invoice: 'FAC-2406-14', amount: 315000, status: 'EN ATTENTE', date: 'Hier, 14:02' },
      { id: 'pay-3', reference: 'PAY-09239', invoice: 'FAC-2406-09', amount: 128000, status: 'CONFIRMÉ', date: '16 juin, 09:31' },
    ],
    activities: [
      { id: 'a-1', user: 'Ibrahima Kane', action: 'a validé une vente', module: 'Commerce', object: 'VTE-240618-004', date: 'Aujourd’hui, 10:14', status: 'VALIDÉ' },
      { id: 'a-2', user: 'Mamadou Ba', action: 'a confirmé un paiement', module: 'Finance', object: 'PAY-09281', date: 'Aujourd’hui, 10:18', status: 'CONFIRMÉ' },
      { id: 'a-3', user: 'Ndeye Sarr', action: 'a enregistré une entrée', module: 'Stocks', object: 'Café Touba 250g', date: 'Hier, 16:18', status: 'ACTIF' },
      { id: 'a-4', user: 'Aminata Diop', action: 'a modifié un rôle', module: 'RH', object: 'Manager', date: 'Hier, 08:49', status: 'ACTIF' },
    ],
    orgNodes: [],
    notifications: [
      { id: 'n-1', title: 'Stock à surveiller', text: 'Huile d’arachide 1L est sous son seuil de sécurité.', read: false, date: 'Il y a 18 min' },
      { id: 'n-2', title: 'Paiement confirmé', text: 'Le paiement PAY-09281 a été enregistré.', read: false, date: 'Il y a 24 min' },
      { id: 'n-3', title: 'Rapport disponible', text: 'Votre rapport hebdomadaire est prêt.', read: true, date: 'Hier' },
    ],
    purchaseOrders: [
      { id: 'po-1', reference: 'BC-2406-041', supplier: 'SENARIZ SA', subject: 'Riz local 5 kg · réassort', amount: 612000, date: '18 juin 2024', status: 'VALIDÉ' },
      { id: 'po-2', reference: 'BC-2406-038', supplier: 'Huilerie du Saloum', subject: 'Huile d’arachide 1 L', amount: 385000, date: '17 juin 2024', status: 'EN ATTENTE' },
    ],
    accountingEntries: [
      { id: 'acc-1', reference: 'OD-240618-12', journal: 'Banque', label: 'Encaissement FAC-2406-18', debit: 186500, credit: 186500, date: '18 juin 2024', status: 'VALIDÉ' },
      { id: 'acc-2', reference: 'AC-240617-08', journal: 'Achats', label: 'Facture Huilerie du Saloum', debit: 385000, credit: 385000, date: '17 juin 2024', status: 'BROUILLON' },
    ],
    payrollSlips: [
      { id: 'payroll-1', reference: 'PAIE-2024-05-001', employee: 'Mamadou Ba', period: 'Mai 2024', gross: 485000, net: 398250, status: 'VALIDÉ' },
      { id: 'payroll-2', reference: 'PAIE-2024-06-002', employee: 'Awa Ndiaye', period: 'Juin 2024', gross: 350000, net: 289500, status: 'BROUILLON' },
    ],
    crmOpportunities: [
      { id: 'crm-1', client: 'Boutique Keur Gui', contact: 'Khadim Gueye', subject: 'Référencement gamme bien-être', amount: 275000, nextAction: 'Relance le 20 juin', status: 'EN ATTENTE' },
      { id: 'crm-2', client: 'Maison Baobab', contact: 'Marième Ba', subject: 'Commande Ramadan', amount: 420000, nextAction: 'Proposition envoyée', status: 'ACTIF' },
    ],
    supplierRecords: [
      { id: 'sup-1', name: 'SENARIZ SA', contact: 'Cheikh Seck', phone: '+221 33 821 40 22', category: 'Épicerie', score: 92, status: 'ACTIF' },
      { id: 'sup-2', name: 'Huilerie du Saloum', contact: 'Aïssatou Diouf', phone: '+221 77 456 19 88', category: 'Épicerie', score: 84, status: 'ACTIF' },
    ],
    deliveries: [
      { id: 'del-1', reference: 'LIV-240618-07', recipient: 'Boutique Keur Gui', destination: 'Médina, Dakar', driver: 'Lamine Diallo', date: '18 juin · 14:30', status: 'CONFIRMÉ' },
      { id: 'del-2', reference: 'LIV-240618-08', recipient: 'Marché Tilène', destination: 'Tilène, Dakar', driver: 'Ousmane Ndiaye', date: '18 juin · 16:00', status: 'EN ATTENTE' },
    ],
    businessDocuments: [
      { id: 'doc-1', name: 'Contrat SENARIZ 2024.pdf', category: 'Contrats', owner: 'Mamadou Ba', updatedAt: '18 juin 2024', version: 2, status: 'VALIDÉ' },
      { id: 'doc-2', name: 'Procédure réception entrepôt.pdf', category: 'Procédures', owner: 'Ndeye Sarr', updatedAt: '16 juin 2024', version: 1, status: 'ACTIF' },
    ],
  };
}

export function loadData(): StoreData {
  try {
    const saved = localStorage.getItem('maximus-data-v1');
    if (!saved) return seedData();
    const parsed = JSON.parse(saved) as StoreData;
    const initial = seedData();
    const { preferences: _legacyPreferences, dependencies: _legacyDependencies, ...storedData } = parsed as StoreData & { preferences?: unknown; dependencies?: unknown };
    const defaultModuleStatuses = Object.fromEntries(modules.map(module => [module.id, module.status])) as ModuleStatusMap;
    const seededByEmail = new Map(initial.employees.map(employee => [employee.email, employee]));
    const rawCompanies = (parsed.catalogVersion ?? 1) < 2
      ? parsed.companies.map(company => company.id === 'kora' ? { ...company, requestedModules: initial.companies[0].requestedModules, allowedModules: initial.companies[0].allowedModules, refusedModules: [] } : company)
      : parsed.companies;
    const companies = rawCompanies.map(company => ({ ...company, adminPassword: company.adminPassword ?? 'Kora123!' }));
    const removeGeneratedHierarchy = (parsed.organizationVersion ?? 1) < 3;
    const generatedNodeIds = new Set(['org-1', 'org-2', 'org-3', 'org-4', 'org-5', 'org-6', 'org-7']);
    const generatedRoleIds = new Set(['role-admin', 'role-compta', 'role-manager', 'role-magasinier', 'role-rh', 'role-logistique', 'role-vendeur']);
    const generatedEmployeeIds = new Set(['emp-1', 'emp-2', 'emp-3', 'emp-4', 'emp-5', 'emp-6', 'emp-7', 'emp-8']);
    const orgNodes = (parsed.orgNodes ?? [])
      .filter(node => !removeGeneratedHierarchy || !generatedNodeIds.has(node.id))
      .map(node => ({
        ...node,
        companyId: node.companyId || 'kora',
        code: node.code || node.name.substring(0, 3).toUpperCase(),
        parentId: removeGeneratedHierarchy && node.parentId && generatedNodeIds.has(node.parentId) ? null : node.parentId,
        moduleIds: node.moduleIds || [],
      })) as OrgNode[];
    const roles = (parsed.roles ?? [])
      .filter(role => !removeGeneratedHierarchy || !generatedRoleIds.has(role.id))
      .map(role => ({
        ...role,
        companyId: role.companyId || 'kora',
        sectorId: removeGeneratedHierarchy && role.sectorId && generatedNodeIds.has(role.sectorId) ? undefined : role.sectorId,
      })) as Role[];

    const rawEmployees = parsed.employees?.length ? parsed.employees : initial.employees;
    return {
      ...initial,
      ...storedData,
      catalogVersion: 2,
      organizationVersion: 3,
      sectorPresets: parsed.sectorPresets ?? initial.sectorPresets,
      companies,
      moduleStatuses: { ...defaultModuleStatuses, ...(parsed.moduleStatuses ?? {}) },
      moduleOverrides: parsed.moduleOverrides ?? {},
      removedModules: parsed.removedModules ?? [],
      purchaseOrders: parsed.purchaseOrders ?? initial.purchaseOrders,
      accountingEntries: parsed.accountingEntries ?? initial.accountingEntries,
      payrollSlips: parsed.payrollSlips ?? initial.payrollSlips,
      crmOpportunities: parsed.crmOpportunities ?? initial.crmOpportunities,
      supplierRecords: parsed.supplierRecords ?? initial.supplierRecords,
      deliveries: parsed.deliveries ?? initial.deliveries,
      businessDocuments: parsed.businessDocuments ?? initial.businessDocuments,
      orgNodes,
       employees: rawEmployees.filter(employee => !removeGeneratedHierarchy || !generatedEmployeeIds.has(employee.id)).map(employee => {
        const seeded = seededByEmail.get(employee.email);
        const generatedSector = Boolean(removeGeneratedHierarchy && employee.sectorId && generatedNodeIds.has(employee.sectorId));
        const generatedRole = Boolean(removeGeneratedHierarchy && employee.roleId && generatedRoleIds.has(employee.roleId));
        return {
          ...employee,
          loginPassword: employee.loginPassword ?? seeded?.loginPassword ?? 'Kora123!',
          isSectorAdmin: false,
          companyId: employee.companyId || 'kora',
          sectorId: generatedSector ? undefined : employee.sectorId,
          roleId: generatedRole ? undefined : employee.roleId,
          department: generatedSector ? '' : employee.department,
          subDepartment: generatedSector ? '' : employee.subDepartment,
          role: generatedRole ? 'Non affecté' : employee.role,
        };
      }),
      roles,
    };
  } catch { return seedData(); }
}
export function saveData(data: StoreData) { localStorage.setItem('maximus-data-v1', JSON.stringify(data)); }
export function uid(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
export const money = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA';
export const shortMoney = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);