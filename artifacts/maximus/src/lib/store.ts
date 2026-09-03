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

export interface Company { id: string; name: string; manager: string; email: string; phone: string; country: string; sector: string; status: Status; requestedModules: ModuleId[]; allowedModules: ModuleId[]; refusedModules: ModuleId[]; createdAt: string; adminPassword?: string; }
export interface Module { id: ModuleId; name: string; description: string; features: string[]; status: 'ACTIF' | 'BETA'; dependencies: ModuleId[]; }
export type ModuleAvailability = 'ACTIF' | 'BETA' | 'INACTIF';
export type ModuleStatusMap = Partial<Record<ModuleId, ModuleAvailability>>;
export interface Dependency { source: ModuleId; target: ModuleId; reason: string; }
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
export interface StoreData { companies: Company[]; employees: Employee[]; roles: Role[]; products: Product[]; movements: Movement[]; sales: Sale[]; payments: Payment[]; activities: Activity[]; orgNodes: OrgNode[]; notifications: { id: string; title: string; text: string; read: boolean; date: string }[]; purchaseOrders: PurchaseOrder[]; accountingEntries: AccountingEntry[]; payrollSlips: PayrollSlip[]; crmOpportunities: CrmOpportunity[]; supplierRecords: SupplierRecord[]; deliveries: Delivery[]; businessDocuments: BusinessDocument[]; moduleStatuses?: ModuleStatusMap; }
export interface StoreData { catalogVersion?: number; organizationVersion?: number; }

const today = new Date().toISOString();
export const modules: Module[] = [
  { id: 'commerce', name: 'Gestion commerciale', description: 'Ventes, clients et performance commerciale.', features: ['Clients', 'Devis et commandes', 'Chiffre d’affaires'], status: 'ACTIF', dependencies: ['stocks'] },
  { id: 'ventes', name: 'Ventes', description: 'Devis, commandes, factures et paiements clients.', features: ['Devis', 'Commandes', 'Facturation'], status: 'ACTIF', dependencies: ['stocks'] },
  { id: 'achats', name: 'Achats', description: 'Demandes, commandes et suivi des achats.', features: ['Demandes d’achat', 'Commandes fournisseurs', 'Réceptions'], status: 'ACTIF', dependencies: ['fournisseurs'] },
  { id: 'stocks', name: 'Stocks', description: 'Produits, mouvements et niveaux de stock.', features: ['Catalogue produits', 'Mouvements', 'Alertes de seuil'], status: 'ACTIF', dependencies: [] },
  { id: 'finance', name: 'Finance', description: 'Trésorerie, paiements et pilotage financier.', features: ['Suivi des paiements', 'Trésorerie', 'Rapports financiers'], status: 'ACTIF', dependencies: [] },
  { id: 'comptabilite', name: 'Comptabilité', description: 'Écritures, rapprochements et clôture comptable.', features: ['Plan comptable', 'Journaux', 'Rapprochement'], status: 'ACTIF', dependencies: ['finance'] },
  { id: 'rh', name: 'Ressources humaines', description: 'Collaborateurs, rôles et organisation.', features: ['Employés', 'Rôles', 'Organisation'], status: 'ACTIF', dependencies: [] },
  { id: 'presences', name: 'Présences', description: 'Présences et suivi quotidien des équipes.', features: ['Pointage', 'Historique', 'Rapports'], status: 'ACTIF', dependencies: ['rh'] },
  { id: 'paie', name: 'Paie', description: 'Préparation et suivi des bulletins de salaire.', features: ['Périodes de paie', 'Bulletins', 'Déclarations'], status: 'ACTIF', dependencies: ['rh', 'presences'] },
  { id: 'crm', name: 'CRM / Clients', description: 'Fiches clients, opportunités et relances.', features: ['Fiches clients', 'Opportunités', 'Relances'], status: 'ACTIF', dependencies: ['commerce'] },
  { id: 'fournisseurs', name: 'Fournisseurs', description: 'Référentiel et relations fournisseurs.', features: ['Référentiel', 'Évaluation', 'Historique'], status: 'ACTIF', dependencies: [] },
  { id: 'logistique', name: 'Logistique', description: 'Entrepôts, livraisons et transport.', features: ['Entrepôts', 'Livraisons', 'Transport'], status: 'ACTIF', dependencies: ['stocks'] },
  { id: 'documents', name: 'Documents', description: 'Classement et circulation des documents métier.', features: ['Classement', 'Partage', 'Versions'], status: 'ACTIF', dependencies: [] },
  { id: 'rapports', name: 'Rapports', description: 'Synthèses et indicateurs pour décider plus vite.', features: ['Rapports métier', 'Filtres', 'Exports'], status: 'ACTIF', dependencies: [] },
];
export const dependencies: Dependency[] = [
  { source: 'commerce', target: 'stocks', reason: 'Les ventes décrémentent automatiquement les stocks.' },
  { source: 'ventes', target: 'stocks', reason: 'Une vente validée réserve et décrémente les quantités disponibles.' },
  { source: 'achats', target: 'fournisseurs', reason: 'Chaque commande d’achat doit être rattachée à un fournisseur.' },
  { source: 'comptabilite', target: 'finance', reason: 'Les écritures comptables s’appuient sur les flux financiers.' },
  { source: 'presences', target: 'rh', reason: 'Les présences sont rattachées aux employés actifs.' },
  { source: 'paie', target: 'rh', reason: 'La paie utilise les contrats et les données collaborateurs.' },
  { source: 'paie', target: 'presences', reason: 'Les absences et présences alimentent les variables de paie.' },
  { source: 'crm', target: 'commerce', reason: 'Le CRM partage le référentiel client avec le commerce.' },
  { source: 'logistique', target: 'stocks', reason: 'Les livraisons et transferts utilisent les stocks.' },
];

export function seedData(): StoreData {
  return {
    catalogVersion: 2,
    organizationVersion: 2,
    companies: [
      { id: 'kora', name: 'KORA Distribution', manager: 'Aminata Diop', email: 'admin@kora.demo', phone: '+221 77 501 22 18', country: 'Sénégal', sector: 'Distribution', status: 'ACTIF', requestedModules: ['commerce', 'ventes', 'achats', 'stocks', 'finance', 'comptabilite', 'rh', 'presences', 'paie', 'crm', 'fournisseurs', 'logistique', 'documents', 'rapports'], allowedModules: ['commerce', 'ventes', 'achats', 'stocks', 'finance', 'comptabilite', 'rh', 'presences', 'paie', 'crm', 'fournisseurs', 'logistique', 'documents', 'rapports'], refusedModules: [], createdAt: '2024-04-12' },
      { id: 'teranga', name: 'Teranga Agro', manager: 'Moussa Fall', email: 'contact@teranga.demo', phone: '+221 76 210 08 34', country: 'Sénégal', sector: 'Agroalimentaire', status: 'EN ATTENTE', requestedModules: ['finance', 'stocks'], allowedModules: [], refusedModules: [], createdAt: '2024-06-18' },
      { id: 'naya', name: 'Naya Services', manager: 'Fatou Camara', email: 'hello@naya.demo', phone: '+225 07 44 19 02', country: 'Côte d’Ivoire', sector: 'Services', status: 'SUSPENDU', requestedModules: ['finance', 'rh'], allowedModules: ['finance', 'rh'], refusedModules: [], createdAt: '2024-03-02' },
    ],
    employees: [
      { id: 'emp-1', companyId: 'kora', sectorId: 'org-1', roleId: 'role-admin', firstName: 'Aminata', lastName: 'Diop', email: 'aminata@kora.demo', phone: '+221 77 501 22 18', position: 'Directrice générale', department: 'Direction', subDepartment: '', role: 'Administratrice', status: 'ACTIF', loginPassword: 'Kora123!' },
      { id: 'emp-2', companyId: 'kora', sectorId: 'org-2', roleId: 'role-compta', firstName: 'Mamadou', lastName: 'Ba', email: 'mamadou@kora.demo', phone: '+221 76 888 41 90', position: 'Responsable finance', department: 'Finance', subDepartment: 'Trésorerie', role: 'Comptable', status: 'ACTIF', loginPassword: 'Kora123!', isSectorAdmin: true },
      { id: 'emp-3', companyId: 'kora', sectorId: 'org-4', roleId: 'role-manager', firstName: 'Ndeye', lastName: 'Sarr', email: 'ndeye@kora.demo', phone: '+221 70 329 70 12', position: 'Responsable opérations', department: 'Opérations', subDepartment: 'Logistique', role: 'Manager', status: 'ACTIF', loginPassword: 'Kora123!', isSectorAdmin: true },
      { id: 'emp-4', companyId: 'kora', sectorId: 'org-6', roleId: 'role-vendeur', firstName: 'Ibrahima', lastName: 'Kane', email: 'ibrahima@kora.demo', phone: '+221 78 110 32 41', position: 'Vendeur senior', department: 'Commerce', subDepartment: 'Boutique Dakar', role: 'Vendeur', status: 'ACTIF', loginPassword: 'Kora123!', isSectorAdmin: true },
      { id: 'emp-5', companyId: 'kora', sectorId: 'org-3', roleId: 'role-compta', firstName: 'Awa', lastName: 'Ndiaye', email: 'awa@kora.demo', phone: '+221 77 246 08 11', position: 'Assistante comptable', department: 'Finance', subDepartment: 'Comptabilité', role: 'Comptable', status: 'ACTIF', loginPassword: 'Kora123!' },
      { id: 'emp-6', companyId: 'kora', sectorId: 'org-5', roleId: 'role-magasinier', firstName: 'Moussa', lastName: 'Faye', email: 'moussa@kora.demo', phone: '+221 76 401 55 72', position: 'Magasinier', department: 'Opérations', subDepartment: 'Entrepôt principal', role: 'Magasinier', status: 'ACTIF', loginPassword: 'Kora123!' },
      { id: 'emp-7', companyId: 'kora', sectorId: 'org-7', roleId: 'role-rh', firstName: 'Coumba', lastName: 'Sow', email: 'coumba@kora.demo', phone: '+221 70 612 40 29', position: 'Responsable RH', department: 'RH', subDepartment: 'Administration du personnel', role: 'Responsable RH', status: 'ACTIF', loginPassword: 'Kora123!', isSectorAdmin: true },
      { id: 'emp-8', companyId: 'kora', sectorId: 'org-4', roleId: 'role-logistique', firstName: 'Lamine', lastName: 'Diallo', email: 'lamine@kora.demo', phone: '+221 78 903 21 10', position: 'Responsable logistique', department: 'Opérations', subDepartment: 'Transport', role: 'Responsable logistique', status: 'ACTIF', loginPassword: 'Kora123!' },
    ],
    roles: [
      { id: 'role-admin', companyId: 'kora', sectorId: 'org-1', name: 'Administratrice', description: 'Accès complet à l’espace KORA.', modulePermissions: Object.fromEntries(modules.map(module => [module.id, ['voir', 'créer', 'modifier']])) },
      { id: 'role-compta', companyId: 'kora', sectorId: 'org-2', name: 'Comptable', description: 'Pilotage des flux financiers.', modulePermissions: { finance: ['voir', 'créer', 'modifier'], comptabilite: ['voir', 'créer', 'modifier'] } },
      { id: 'role-manager', companyId: 'kora', sectorId: 'org-6', name: 'Manager', description: 'Opérations et équipes commerciales.', modulePermissions: { commerce: ['voir', 'créer'], crm: ['voir', 'modifier'] } },
      { id: 'role-magasinier', companyId: 'kora', sectorId: 'org-4', name: 'Magasinier', description: 'Gestion quotidienne des stocks.', modulePermissions: { stocks: ['voir', 'créer', 'modifier'] } },
      { id: 'role-rh', companyId: 'kora', sectorId: 'org-7', name: 'Responsable RH', description: 'Organisation, employés et présences.', modulePermissions: { rh: ['voir', 'créer', 'modifier'], presences: ['voir', 'créer'] } },
      { id: 'role-logistique', companyId: 'kora', sectorId: 'org-4', name: 'Responsable logistique', description: 'Stocks, opérations et acheminement.', modulePermissions: { stocks: ['voir', 'modifier'], logistique: ['voir', 'créer'] } },
      { id: 'role-vendeur', companyId: 'kora', sectorId: 'org-6', name: 'Vendeur', description: 'Saisie et suivi des ventes autorisées.', modulePermissions: { commerce: ['voir', 'créer'], ventes: ['voir'] } },
    ],
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
    orgNodes: [
      { id: 'org-1', companyId: 'kora', code: 'DG', name: 'Direction générale', type: 'direction', parentId: null, moduleIds: ['commerce', 'ventes', 'achats', 'stocks', 'finance', 'comptabilite', 'rh', 'presences', 'paie', 'crm', 'fournisseurs', 'logistique', 'documents', 'rapports'], managerEmployeeId: 'emp-1' },
      { id: 'org-2', companyId: 'kora', code: 'DAF', name: 'DAF', type: 'sector', parentId: 'org-1', moduleIds: ['finance', 'comptabilite', 'rapports'], managerEmployeeId: 'emp-2' },
      { id: 'org-3', companyId: 'kora', code: 'COMPTA', name: 'Comptabilité', type: 'service', parentId: 'org-2', moduleIds: ['comptabilite'] },
      { id: 'org-4', companyId: 'kora', code: 'OPS', name: 'Opérations', type: 'sector', parentId: 'org-1', moduleIds: ['stocks', 'fournisseurs', 'logistique', 'achats'], managerEmployeeId: 'emp-3' },
      { id: 'org-5', companyId: 'kora', code: 'LOG', name: 'Logistique', type: 'service', parentId: 'org-4', moduleIds: ['logistique', 'stocks'] },
      { id: 'org-6', companyId: 'kora', code: 'COM', name: 'Commerce', type: 'sector', parentId: 'org-1', moduleIds: ['commerce', 'ventes', 'crm'], managerEmployeeId: 'emp-4' },
      { id: 'org-7', companyId: 'kora', code: 'RH', name: 'RH et Ressources générales', type: 'sector', parentId: 'org-1', moduleIds: ['rh', 'presences', 'paie'], managerEmployeeId: 'emp-7' },
    ],
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
    const defaultModuleStatuses = Object.fromEntries(modules.map(module => [module.id, module.status])) as ModuleStatusMap;
    const seededByEmail = new Map(initial.employees.map(employee => [employee.email, employee]));
    const companies = (parsed.catalogVersion ?? 1) < 2
      ? parsed.companies.map(company => company.id === 'kora' ? { ...company, requestedModules: initial.companies[0].requestedModules, allowedModules: initial.companies[0].allowedModules, refusedModules: [] } : company)
      : parsed.companies;
    const initialNodeByName = new Map(initial.orgNodes.map(node => [node.name.toLowerCase(), node]));
    initialNodeByName.set('finance', initial.orgNodes.find(node => node.code === 'DAF')!);
    const organizationIsLegacy = (parsed.organizationVersion ?? 1) < 2;
    const legacyIdMap = new Map((parsed.orgNodes ?? []).map(node => [node.id, initialNodeByName.get(node.name.toLowerCase())?.id ?? `legacy-${node.id}`]));
    const migratedSeedNodes = initial.orgNodes.map(seed => {
      const legacy = (parsed.orgNodes ?? []).find(node => legacyIdMap.get(node.id) === seed.id);
      return legacy ? { ...seed, email: legacy.email || seed.email, phone: legacy.phone || seed.phone, location: legacy.location || seed.location, managerEmployeeId: legacy.managerEmployeeId || seed.managerEmployeeId, moduleIds: legacy.moduleIds?.length ? legacy.moduleIds : seed.moduleIds } : seed;
    });
    const legacyCustomNodes = (parsed.orgNodes ?? []).filter(node => !initialNodeByName.has(node.name.toLowerCase())).map(node => ({
      ...node,
      id: `legacy-${node.id}`,
      companyId: node.companyId || 'kora',
      code: node.code || node.name.substring(0, 3).toUpperCase(),
      type: node.type === 'department' ? 'sector' as const : node.type,
      parentId: node.parentId ? legacyIdMap.get(node.parentId) ?? null : null,
      moduleIds: node.moduleIds || [],
    }));
    const orgNodes = organizationIsLegacy
      ? [...migratedSeedNodes, ...legacyCustomNodes]
      : (parsed.orgNodes ?? initial.orgNodes).map(node => ({ ...node, companyId: node.companyId || 'kora', code: node.code || node.name.substring(0, 3).toUpperCase(), type: node.type === 'department' ? 'sector' : node.type, moduleIds: node.moduleIds || [] })) as OrgNode[];

    const roles = (parsed.catalogVersion ?? 1) < 2
      ? parsed.roles.map(role => role.id === 'role-admin' ? { ...role, modulePermissions: initial.roles.find(item => item.id === 'role-admin')?.modulePermissions ?? role.modulePermissions } : role)
      : parsed.roles;

    const mappedRoles = roles.map(role => ({
      ...role,
      companyId: role.companyId || 'kora',
      sectorId: (organizationIsLegacy && role.sectorId ? legacyIdMap.get(role.sectorId) : role.sectorId) || initial.roles.find(seed => seed.id === role.id || seed.name === role.name)?.sectorId || 'org-1'
    })) as Role[];

    return {
      ...initial,
      ...parsed,
      catalogVersion: 2,
      organizationVersion: 2,
      companies,
      moduleStatuses: { ...defaultModuleStatuses, ...(parsed.moduleStatuses ?? {}) },
      purchaseOrders: parsed.purchaseOrders ?? initial.purchaseOrders,
      accountingEntries: parsed.accountingEntries ?? initial.accountingEntries,
      payrollSlips: parsed.payrollSlips ?? initial.payrollSlips,
      crmOpportunities: parsed.crmOpportunities ?? initial.crmOpportunities,
      supplierRecords: parsed.supplierRecords ?? initial.supplierRecords,
      deliveries: parsed.deliveries ?? initial.deliveries,
      businessDocuments: parsed.businessDocuments ?? initial.businessDocuments,
      orgNodes,
      employees: parsed.employees.map(employee => {
        const seeded = seededByEmail.get(employee.email);
        return {
          ...employee,
          loginPassword: employee.loginPassword ?? seeded?.loginPassword ?? 'Kora123!',
          isSectorAdmin: employee.isSectorAdmin ?? seeded?.isSectorAdmin ?? false,
          companyId: (employee as any).companyId || 'kora',
          sectorId: (organizationIsLegacy && employee.sectorId ? legacyIdMap.get(employee.sectorId) : employee.sectorId) || seeded?.sectorId || 'org-1',
          roleId: (employee as any).roleId || seeded?.roleId || 'role-vendeur'
        };
      }),
      roles: [...initial.roles.filter(role => !mappedRoles.some(existing => existing.id === role.id)), ...mappedRoles],
    };
  } catch { return seedData(); }
}
export function saveData(data: StoreData) { localStorage.setItem('maximus-data-v1', JSON.stringify(data)); }
export function uid(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
export const money = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA';
export const shortMoney = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);