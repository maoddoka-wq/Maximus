import React, { useEffect, useState } from 'react';
import { 
  Building2, Users, KeyRound, ChevronDown, Plus,
  Settings, Trash2, Check, X, ShieldCheck, GitBranch, ArrowRight, UserRound
} from 'lucide-react';
import { Company, StoreData, OrgNode, Role, Employee, demoEmployeeIds, modules as allModules, stockSubmodules, uid, type ModuleId } from '../lib/store';

// Helper UI components matching Maximus style
function ActionButton({ children, onClick, primary = false, testId, icon: ButtonIcon = Plus, disabled = false, className = '' }: any) { 
  return (
    <button disabled={disabled} data-testid={testId} onClick={onClick} className={`app-action btn flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-bold ${primary ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <ButtonIcon size={15} />
      {children}
    </button>
  ); 
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="modal-panel card-surface w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
        <div className="modal-header mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', testId, placeholder = '', help }: any) {
  const explanation = help ?? `Saisissez ${String(label).toLowerCase().replace(' *', '')}.`;
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input data-testid={testId} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]" />
      <span className="field-help mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">{explanation}</span>
    </label>
  );
}

function permissionFeatureKey(moduleId: ModuleId, feature: string) {
  return `${moduleId}:menu:${feature.trim().toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi, '-').replace(/^-|-$/g, '')}`;
}

function permissionLabel(key: string) {
  const menuMatch = key.match(/^([^:]+):menu:(.+)$/);
  if (menuMatch) return `${allModules.find(module => module.id === menuMatch[1])?.name ?? menuMatch[1]} · ${menuMatch[2].replace(/-/g, ' ')}`;
  if (key.startsWith('stocks:')) return `Gestion de stock · ${stockSubmodules.find(item => item.id === key.slice('stocks:'.length))?.name ?? key.slice('stocks:'.length)}`;
  if (key.startsWith('presence.')) return `Présences · ${key.slice('presence.'.length)}`;
  return allModules.find(module => module.id === key)?.name || key;
}

export function CompanyOrganizationAdmin({ company, data, mutate, initialTab = 'overview', standalone = false, sectorManager = false, scopeNodeId }: { company: Company; data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; initialTab?: 'overview' | 'structure' | 'roles' | 'employees' | 'profile'; standalone?: boolean; sectorManager?: boolean; scopeNodeId?: string }) {
  const companyNodes = data.orgNodes.filter(node => node.companyId === company.id);
  const scopedNodeIds = new Set<string>();
  if (scopeNodeId) {
    const pending = [scopeNodeId];
    while (pending.length) {
      const nodeId = pending.pop();
      if (!nodeId || scopedNodeIds.has(nodeId)) continue;
      scopedNodeIds.add(nodeId);
      companyNodes.filter(node => node.parentId === nodeId).forEach(node => pending.push(node.id));
    }
  }
  const scopedData = sectorManager && scopeNodeId
    ? {
        ...data,
        orgNodes: data.orgNodes.filter(node => !node.companyId || scopedNodeIds.has(node.id)),
        roles: data.roles.filter(role => !role.companyId || scopedNodeIds.has(role.sectorId ?? '')),
        employees: data.employees.filter(employee => !employee.companyId || scopedNodeIds.has(employee.sectorId ?? '')),
      }
    : data;
  const [tab, setTab] = useState<'overview' | 'structure' | 'roles' | 'employees' | 'profile'>(sectorManager ? (initialTab === 'structure' ? 'overview' : initialTab) : initialTab);
  useEffect(() => {
    setTab(sectorManager && initialTab === 'structure' ? 'overview' : initialTab);
  }, [initialTab, sectorManager]);
  const organizationNodes = scopedData.orgNodes.filter(node => node.companyId === company.id);
  const organizationRoles = scopedData.roles.filter(role => role.companyId === company.id);
  const organizationEmployees = scopedData.employees.filter(employee => employee.companyId === company.id);
  const unitsWithoutManager = organizationNodes.filter(node => !organizationEmployees.some(employee => employee.id === node.managerEmployeeId && employee.sectorId === node.id));

  const tabs = [
    { id: 'overview', label: "Vue d'ensemble" },
    { id: 'structure', label: '1 · Structure & unités' },
    { id: 'roles', label: '2 · Rôles & permissions' },
    { id: 'employees', label: '3 · Comptes & managers' },
    { id: 'profile', label: 'Mon profil' },
  ].filter(item => !sectorManager || item.id === 'overview' || item.id === 'roles' || item.id === 'employees') as { id: 'overview' | 'structure' | 'roles' | 'employees' | 'profile'; label: string }[];

  return (
    <div className="space-y-6">
      <div className="card-surface p-6 rounded-2xl">
        <h1 className="text-xl font-bold">{sectorManager ? 'Règles d’accès de mon unité' : `Modèle d'Accès & Organisation : ${company.name}`}</h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{sectorManager ? 'Gérez les rôles, sous-autorisations et comptes de votre unité et de ses descendants.' : 'Construisez la hiérarchie, configurez les rôles et sous-autorisations, puis affectez les comptes et managers.'}</p>
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {tabs.map(item => (
            <button key={item.id} data-testid={`tab-${item.id}`} onClick={() => setTab(item.id)} className={`shrink-0 rounded-lg px-4 py-2.5 text-xs font-bold transition ${tab === item.id ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {!sectorManager && <section className="card-surface rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.03)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Parcours recommandé</p>
            <h2 className="mt-1 text-lg font-bold">Construisez l’accès dans cet ordre</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[hsl(var(--muted-foreground))]">Créez d’abord les directions, départements et services. Configurez ensuite les autorisations des rôles, puis rattachez chaque compte à son unité et à son rôle.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold sm:min-w-[390px]">
            {[
              { number: '1', label: 'Hiérarchie', done: organizationNodes.length > 0, target: 'structure' as const },
              { number: '2', label: 'Autorisations', done: organizationRoles.length > 0, target: 'roles' as const },
              { number: '3', label: 'Employés', done: organizationEmployees.length > 0 && unitsWithoutManager.length === 0, target: 'employees' as const },
            ].map(step => <button key={step.number} type="button" onClick={() => setTab(step.target)} className="rounded-xl border bg-[hsl(var(--card))] p-3 text-left transition hover:border-[hsl(var(--primary)/.5)]">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${step.done ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{step.done ? <Check size={14} /> : step.number}</span>
              <span className="mt-2 block">{step.label}</span>
              <span className="mt-1 block text-[9px] font-normal text-[hsl(var(--muted-foreground))]">{step.done ? 'Terminé' : 'À faire'}</span>
            </button>)}
          </div>
        </div>
        {(organizationNodes.length === 0 || organizationRoles.length === 0 || unitsWithoutManager.length > 0) && <p className="mt-4 rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
          {organizationNodes.length === 0 ? 'Commencez par créer la première unité.' : organizationRoles.length === 0 ? 'Créez ensuite les rôles et leurs permissions.' : `${unitsWithoutManager.length} unité(s) doivent encore avoir un manager avec un compte actif.`}
        </p>}
      </section>}

      {tab === 'overview' && <OverviewTab company={company} data={scopedData} setTab={setTab} />}
      {tab === 'structure' && !sectorManager && <StructureTab company={company} data={scopedData} mutate={mutate} />}
      {tab === 'roles' && <RolesTab company={company} data={scopedData} mutate={mutate} />}
      {tab === 'employees' && <EmployeesTab company={company} data={scopedData} mutate={mutate} allowSectorAdmin={!sectorManager} />}
      {tab === 'profile' && !sectorManager && <CompanyProfileSection company={company} data={scopedData} mutate={mutate} />}
    </div>
  );
}

export function CompanyProfileSection({ company, data, mutate }: { company: Company; data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void }) {
  type ProfileForm = Pick<Company, 'name' | 'manager' | 'email' | 'phone' | 'country' | 'sector'> & { profilePhoto: string };
  const [form, setForm] = useState<ProfileForm>({ name: company.name, manager: company.manager, email: company.email, phone: company.phone, country: company.country, sector: company.sector, profilePhoto: company.profilePhoto ?? '' });
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const setField = (field: keyof ProfileForm) => (value: string) => setForm(current => ({ ...current, [field]: value }));

  useEffect(() => {
    setForm({ name: company.name, manager: company.manager, email: company.email, phone: company.phone, country: company.country, sector: company.sector, profilePhoto: company.profilePhoto ?? '' });
    setNewPassword('');
    setPasswordConfirm('');
    setError('');
  }, [company.id, company.name, company.manager, company.email, company.phone, company.country, company.sector, company.profilePhoto]);

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Sélectionnez un fichier image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('La photo doit faire 2 Mo maximum.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm(current => ({ ...current, profilePhoto: reader.result as string }));
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    const name = form.name.trim();
    const manager = form.manager.trim();
    const email = form.email.trim().toLowerCase();
    const password = newPassword.trim();
    if (!name || !manager || !email) {
      setError('Le nom de l’entreprise, le responsable et l’email sont obligatoires.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Saisissez une adresse email valide.');
      return;
    }
    if (data.companies.some(item => item.id !== company.id && item.email.toLowerCase() === email)) {
      setError('Une autre entreprise utilise déjà cette adresse email.');
      return;
    }
    if (password && password.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    mutate(draft => {
      const target = draft.companies.find(item => item.id === company.id);
      if (target) {
        target.name = name;
        target.manager = manager;
        target.email = email;
        target.phone = form.phone.trim();
        target.country = form.country.trim();
        target.sector = form.sector.trim();
        target.profilePhoto = form.profilePhoto;
        if (password) target.adminPassword = password;
      }
    }, password ? 'Profil, photo et mot de passe mis à jour.' : 'Profil et photo mis à jour.');
    setNewPassword('');
    setPasswordConfirm('');
  };

  return <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr] fade-up">
    <section className="card-surface rounded-2xl p-6">
      <div className="mb-7"><p className="mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Profil entreprise</p><h2 className="mt-2 text-2xl font-bold">{company.name}</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Mettez à jour les informations, la photo et les accès de votre entreprise.</p></div>
      <div className="mb-7 flex flex-wrap items-center gap-5 rounded-xl border border-dashed p-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[hsl(var(--primary)/.1)] text-xl font-black text-[hsl(var(--primary))]">{form.profilePhoto ? <img src={form.profilePhoto} alt={`Photo de profil de ${form.name}`} className="h-full w-full object-cover" /> : company.name.slice(0, 2).toUpperCase()}</div>
        <div className="min-w-[220px] flex-1"><h3 className="font-bold">Photo de profil</h3><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">PNG, JPG ou WebP · 2 Mo maximum. Elle sera affichée dans votre espace entreprise.</p><div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]"><UserRound size={14} />Choisir une photo<input data-testid="input-profile-photo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => handlePhoto(event.target.files?.[0])} /></label>{form.profilePhoto && <button type="button" data-testid="button-remove-profile-photo" onClick={() => setForm(current => ({ ...current, profilePhoto: '' }))} className="rounded-lg border px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))]">Supprimer</button>}</div></div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom de l’entreprise *" value={form.name} onChange={setField('name')} testId="input-profile-company-name" help="Nom affiché dans MAXIMUS et dans l’espace de travail." />
        <Field label="Responsable *" value={form.manager} onChange={setField('manager')} testId="input-profile-manager" help="Nom de la personne responsable de l’entreprise." />
        <Field label="Email administrateur *" value={form.email} onChange={setField('email')} type="email" testId="input-profile-email" help="Adresse utilisée pour la connexion du compte entreprise." />
        <Field label="Téléphone" value={form.phone} onChange={setField('phone')} testId="input-profile-phone" help="Numéro de contact professionnel de l’entreprise." />
        <Field label="Pays" value={form.country} onChange={setField('country')} testId="input-profile-country" help="Pays dans lequel l’entreprise exerce principalement." />
        <Field label="Secteur" value={form.sector} onChange={setField('sector')} testId="input-profile-sector" help="Secteur d’activité utilisé pour contextualiser l’espace." />
      </div>
      <div className="mt-7 border-t pt-6"><h3 className="font-bold">Modifier le mot de passe</h3><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Laissez ces champs vides pour conserver le mot de passe actuel.</p><div className="mt-4 grid gap-5 sm:grid-cols-2"><Field label="Nouveau mot de passe" value={newPassword} onChange={setNewPassword} type="password" placeholder="Au moins 8 caractères" testId="input-profile-password" help="Utilisez au moins 8 caractères. Laissez vide pour conserver le mot de passe actuel." /><Field label="Confirmer le mot de passe" value={passwordConfirm} onChange={setPasswordConfirm} type="password" placeholder="Répétez le mot de passe" testId="input-profile-password-confirm" help="Saisissez exactement le même mot de passe pour confirmer le changement." /></div></div>
      {error && <p data-testid="profile-error" className="mt-5 rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]">{error}</p>}
      <div className="mt-7 flex justify-end"><button data-testid="button-save-profile" onClick={save} className="btn rounded-lg bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Enregistrer le profil</button></div>
    </section>
    <section className="card-surface h-fit rounded-2xl p-6"><h2 className="font-bold">Accès de votre espace</h2><div className="mt-5 space-y-4 text-sm"><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Statut</p><p className="mt-1 font-bold">{company.status}</p></div><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Connexion</p><p className="mt-1 leading-6">Utilisez l’email administrateur et votre mot de passe depuis « Espace KORA ».</p></div><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Modules autorisés</p><p className="mt-1 font-bold">{company.allowedModules.length} module(s)</p></div></div></section>
  </div>;
}

// 1. OVERVIEW TAB
function OverviewTab({ company, data, setTab }: { company: Company, data: StoreData, setTab: (t: any) => void }) {
  const companyNodes = data.orgNodes.filter((n: OrgNode) => n.companyId === company.id);
  const companyRoles = data.roles.filter((r: Role) => r.companyId === company.id);
  const companyEmployees = data.employees.filter((e: Employee) => e.companyId === company.id);
  const managerRole = companyRoles.find(role => role.id === company.managerRoleId);
  
  const rootNodes = companyNodes.filter((n: OrgNode) => !n.parentId);

  return (
    <div className="space-y-6 fade-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Unités Organisationnelles" value={companyNodes.length} icon={Building2} onClick={() => setTab('structure')} />
        <MetricCard title="Rôles Configurés" value={companyRoles.length} icon={KeyRound} onClick={() => setTab('roles')} />
        <MetricCard title="Employés Actifs" value={companyEmployees.length} icon={Users} onClick={() => setTab('employees')} />
      </div>
      <div className="card-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div><p className="text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">Responsable de l’entreprise</p><p className="mt-1 text-lg font-bold">{company.manager}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Compte manager · {company.email}</p></div>
        <div className="rounded-xl bg-[hsl(var(--primary)/.1)] px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Rôle affecté</p><p className="mt-1 text-sm font-bold text-[hsl(var(--primary))]">{managerRole?.name || 'Manager entreprise'}</p><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Accès global</p></div>
      </div>
      
      <div className="card-surface p-6 rounded-2xl">
        <h2 className="font-bold text-lg mb-6">Chaîne d'héritage</h2>
        <div className="space-y-4">
          {rootNodes.map((root: OrgNode) => (
            <OverviewTreeNode key={root.id} node={root} allNodes={companyNodes} allRoles={companyRoles} allEmployees={companyEmployees} depth={0} />
          ))}
          {rootNodes.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center"><GitBranch className="mx-auto text-[hsl(var(--primary))]" size={28} /><h3 className="mt-4 font-bold">Votre organisation est vide</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">Commencez par créer la première unité de votre entreprise. Aucun secteur, département ou service n’est imposé par MAXIMUS.</p><button data-testid="button-start-organization" onClick={() => setTab('structure')} className="mt-5 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">Créer ma première unité</button></div>}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, onClick }: any) {
  return (
    <button onClick={onClick} className="card-surface p-5 rounded-2xl flex items-center justify-between text-left hover:border-[hsl(var(--primary)/.4)] transition">
      <div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] font-semibold uppercase">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className="p-3 bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] rounded-xl">
        <Icon size={20} />
      </div>
    </button>
  );
}

function OverviewTreeNode({ node, allNodes, allRoles, allEmployees, depth }: { node: OrgNode, allNodes: OrgNode[], allRoles: Role[], allEmployees: Employee[], depth: number }) {
  const children = allNodes.filter((n: OrgNode) => n.parentId === node.id);
  const roles = allRoles.filter((r: Role) => r.sectorId === node.id);
  const employees = allEmployees.filter((e: Employee) => e.sectorId === node.id);

  return (
    <div className="relative">
      <div className="flex flex-col md:flex-row md:items-center gap-4 py-3 border-b border-[hsl(var(--border)/.5)]" style={{ marginLeft: `${depth * 24}px` }}>
        <div className="flex items-center gap-3 w-64 shrink-0">
          <span className="p-1.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"><GitBranch size={14} /></span>
          <div>
            <p className="text-sm font-bold">{node.name}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">{node.type} {node.code ? `· ${node.code}` : ''}</p>
          </div>
        </div>
        
        <div className="flex-1 flex flex-wrap gap-4 text-xs items-center text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-1.5">
            <Building2 size={13} /> Unité organisationnelle
          </div>
          <ArrowRight size={12} className="opacity-40" />
          <div className="flex items-center gap-1.5">
            <KeyRound size={13} /> {roles.length} rôles
          </div>
          <ArrowRight size={12} className="opacity-40" />
          <div className="flex items-center gap-1.5 text-[hsl(var(--foreground))] font-semibold">
            <Users size={13} /> {employees.length} employés
          </div>
        </div>
      </div>
      
      {children.map((child: OrgNode) => (
        <OverviewTreeNode key={child.id} node={child} allNodes={allNodes} allRoles={allRoles} allEmployees={allEmployees} depth={depth + 1} />
      ))}
    </div>
  );
}

// 2. STRUCTURE TAB
function StructureTab({ company, data, mutate }: { company: Company, data: StoreData, mutate: any }) {
  const companyNodes = data.orgNodes.filter((n: OrgNode) => n.companyId === company.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);

  const handleEdit = (node: OrgNode) => {
    setEditingNode(node);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingNode(null);
    setModalOpen(true);
  };

  const roots = companyNodes.filter((n: OrgNode) => !n.parentId);
  const deleteNode = (id: string) => {
    const ids = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      companyNodes.forEach(node => {
        if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
          ids.add(node.id);
          changed = true;
        }
      });
    }
    const assigned = data.employees.some(employee => employee.sectorId && ids.has(employee.sectorId))
      || data.roles.some(role => role.sectorId && ids.has(role.sectorId));
    if (assigned) {
      window.alert('Impossible de supprimer cette unité : des rôles ou employés y sont encore affectés.');
      return;
    }
    mutate((draft: StoreData) => {
      draft.orgNodes = draft.orgNodes.filter(node => !ids.has(node.id));
    }, 'Unité et sous-unités supprimées.');
  };

  return (
    <div className="card-surface p-6 rounded-2xl fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-lg">Unités Organisationnelles</h2>
           <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Créez la hiérarchie de l’entreprise. Les rôles, sous-autorisations et managers se configurent dans les étapes suivantes de cette même page.</p>
        </div>
        <ActionButton primary onClick={handleCreate} testId="btn-create-org">Créer une unité</ActionButton>
      </div>

        <div className="mb-4 rounded-xl bg-[hsl(var(--muted)/.5)] p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          <strong className="text-[hsl(var(--foreground))]">Étape 1 · Construire la hiérarchie.</strong> Créez les directions, départements, secteurs et services. Les rôles, les sous-autorisations et les managers se configurent ensuite dans les étapes 2 et 3 ci-dessus.
       </div>
        <div className="mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-xs">
          <span><strong>{companyNodes.length}</strong> unité(s) créée(s)</span>
          <span className="text-[hsl(var(--muted-foreground))]">Les managers se désignent depuis Comptes & managers</span>
        </div>
       <div className="space-y-1">
        {roots.map((root: OrgNode) => (
            <StructureNodeItem key={root.id} node={root} allNodes={companyNodes} onEdit={handleEdit} onDelete={deleteNode} depth={0} />
        ))}
        {roots.length === 0 && <div className="text-center py-10 text-sm text-[hsl(var(--muted-foreground))]">Aucune unité définie.</div>}
      </div>

        {modalOpen && <Modal title={editingNode ? 'Modifier une unité' : 'Créer une unité'} onClose={() => setModalOpen(false)}><StructureFormModal initialData={editingNode} allNodes={companyNodes} onClose={() => setModalOpen(false)} onSave={(nodeData: any) => {
        mutate((d: StoreData) => {
           const nodeId = editingNode?.id ?? uid('org');
          if (editingNode) {
            const index = d.orgNodes.findIndex((n: OrgNode) => n.id === editingNode.id);
            if (index !== -1) d.orgNodes[index] = { ...d.orgNodes[index], ...nodeData };
          } else {
             d.orgNodes.push({ id: nodeId, companyId: company.id, ...nodeData });
           }
        }, editingNode ? 'Unité mise à jour.' : 'Unité créée.');
        setModalOpen(false);
      }} /></Modal>}
    </div>
  );
}

function StructureNodeItem({ node, allNodes, onEdit, onDelete, depth }: { node: OrgNode, allNodes: OrgNode[], onEdit: (n: OrgNode) => void, onDelete: (id: string) => void, depth: number }) {
  const children = allNodes.filter((n: OrgNode) => n.parentId === node.id);
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div>
      <div className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[hsl(var(--muted)/.4)] transition" style={{ marginLeft: `${depth * 20}px` }}>
        <button onClick={() => setExpanded(!expanded)} className="text-[hsl(var(--muted-foreground))] w-5 flex justify-center">
          {children.length > 0 && <ChevronDown size={14} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />}
        </button>
        <span className="p-1.5 rounded bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Building2 size={14} /></span>
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between min-w-0 gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-sm truncate">{node.name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold text-[hsl(var(--muted-foreground))]">{node.type}</span>
            {node.code && <span className="text-[10px] mono text-[hsl(var(--muted-foreground))]">{node.code}</span>}
          </div>
            <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] shrink-0">
              <span>Structure de l’unité</span>
            <div className="flex items-center gap-1">
              <button type="button" data-testid={`button-edit-org-${node.id}`} aria-label={`Modifier ${node.name}`} onClick={event => { event.stopPropagation(); onEdit(node); }} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"><Settings size={13} /><span>Modifier</span></button>
              <button data-testid={`button-delete-org-${node.id}`} aria-label={`Supprimer ${node.name}`} onClick={() => onDelete(node.id)} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]"><Trash2 size={13} /><span>Supprimer</span></button>
            </div>
          </div>
        </div>
      </div>
      {expanded && children.map((child: OrgNode) => (
         <StructureNodeItem key={child.id} node={child} allNodes={allNodes} onEdit={onEdit} onDelete={onDelete} depth={depth + 1} />
      ))}
    </div>
  );
}

function StructureFormModal({ initialData, allNodes, onClose, onSave }: { initialData: OrgNode | null, allNodes: OrgNode[], onClose: () => void, onSave: (d: any) => void }) {
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    code: initialData?.code || '',
    type: (initialData?.type || 'direction') as OrgNode['type'],
    parentId: initialData?.parentId || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    location: initialData?.location || ''
  });

  const parentOptions = allNodes.filter(node => node.id !== initialData?.id);
  const isCyclic = (parentId: string) => {
    let current = allNodes.find(n => n.id === parentId);
    while (current) {
      if (current.id === initialData?.id) return true;
      current = allNodes.find(n => n.id === current?.parentId);
    }
    return false;
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.code.trim() || !formData.type) {
      setError('Le nom et le code de l’unité sont obligatoires.');
      return;
    }
    if (allNodes.some(node => node.id !== initialData?.id && node.code?.trim().toLowerCase() === formData.code.trim().toLowerCase())) {
      setError('Ce code d’unité est déjà utilisé dans l’entreprise.');
      return;
    }
    if (formData.parentId && isCyclic(formData.parentId)) {
      setError('Cette unité ne peut pas être placée sous l’un de ses descendants.');
      return;
    }
     onSave({ ...formData, name: formData.name.trim(), code: formData.code.trim().toUpperCase(), parentId: formData.parentId || null });
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-[hsl(var(--destructive)/.1)] p-3 text-sm font-semibold text-[hsl(var(--destructive))]">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom de l'unité *" value={formData.name} onChange={(v: string) => setFormData({...formData, name: v})} testId="input-org-name" help="Nom lisible de la direction, du département, du secteur ou du service." />
        <Field label="Code" value={formData.code} onChange={(v: string) => setFormData({...formData, code: v})} placeholder="Ex: UNITE-01" help="Identifiant court utilisé pour retrouver rapidement cette unité." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-semibold">
          Type *
          <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as OrgNode['type']})} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))]">
            <option value="direction">Direction</option>
            <option value="department">Département</option>
            <option value="sector">Secteur</option>
            <option value="service">Service</option>
          </select>
          <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">Définit le niveau de l’unité dans votre organisation.</span>
        </label>
        <label className="block text-sm font-semibold">
          Unité Parente
          <select value={formData.parentId} onChange={e => setFormData({...formData, parentId: e.target.value})} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))]">
            <option value="">Aucune (Racine)</option>
            {parentOptions.map((n: OrgNode) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">L’unité parente permet de construire la hiérarchie.</span>
        </label>
      </div>
      <div className="border-t pt-4 mt-2">
        <label className="block text-sm font-semibold mb-3">Coordonnées de l’unité</label>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} help="Adresse de contact de l’unité, si elle en possède une." />
          <Field label="Téléphone" value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: v})} help="Numéro de contact de l’unité." />
          <Field label="Localisation" value={formData.location} onChange={(v: string) => setFormData({...formData, location: v})} help="Adresse ou emplacement physique de l’unité." />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold border rounded-lg hover:bg-[hsl(var(--muted))]">Annuler</button>
        <ActionButton primary onClick={handleSave} disabled={!formData.name} testId="btn-save-org">Enregistrer</ActionButton>
      </div>
    </div>
  );
}

// 3. ROLES TAB
function RolesTab({ company, data, mutate }: { company: Company, data: StoreData, mutate: any }) {
  const companyRoles = data.roles.filter((r: Role) => r.companyId === company.id);
  const companyNodes = data.orgNodes.filter((n: OrgNode) => n.companyId === company.id);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setModalOpen(true);
  };
  const deleteRole = (role: Role) => {
    if (data.employees.some(employee => employee.roleId === role.id) || company.managerRoleId === role.id) {
      window.alert('Impossible de supprimer ce rôle : il est encore affecté à un employé ou au manager de l’entreprise.');
      return;
    }
    mutate((draft: StoreData) => {
      draft.roles = draft.roles.filter(item => item.id !== role.id);
    }, 'Rôle supprimé.');
  };

  return (
    <div className="card-surface p-6 rounded-2xl fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-lg">Rôles & sous-autorisations</h2>
         <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Étape 2 · Retrouvez les unités créées à l’étape 1, créez leurs rôles et choisissez précisément les modules, menus et actions visibles par chaque employé.</p>
        </div>
        <ActionButton primary disabled={companyNodes.length === 0} onClick={() => { setEditingRole(null); setModalOpen(true); }} testId="btn-create-role">Créer un rôle</ActionButton>
      </div>
      {companyNodes.length === 0 && <p className="mb-6 rounded-lg bg-[hsl(var(--muted))] p-3 text-sm text-[hsl(var(--muted-foreground))]">Créez d’abord au moins une unité dans l’onglet Structure & Unités.</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companyRoles.map((role: Role) => {
          const sector = companyNodes.find(n => n.id === role.sectorId);
          return (
            <div key={role.id} className="border rounded-xl p-4 flex flex-col hover:border-[hsl(var(--primary)/.3)] transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{role.name}</h3>
                  <span className="inline-flex items-center gap-1.5 mt-1 text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-full bg-[hsl(var(--muted))]">
                    <Building2 size={10} /> {sector?.name || 'Unité non affectée'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" data-testid={`button-edit-org-role-${role.id}`} aria-label={`Modifier le rôle ${role.name}`} onClick={event => { event.stopPropagation(); handleEdit(role); }} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold hover:bg-[hsl(var(--muted))]"><Settings size={13} /><span>Modifier</span></button>
                  <button data-testid={`button-delete-org-role-${role.id}`} aria-label={`Supprimer le rôle ${role.name}`} onClick={() => deleteRole(role)} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)]"><Trash2 size={13} /><span>Supprimer</span></button>
                </div>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3 flex-1">{role.description}</p>
              {(company.managerRoleId === role.id || data.employees.some(employee => employee.roleId === role.id)) && <div className="mt-3 border-t pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Affectations</p><p className="mt-1 text-xs font-semibold">{company.managerRoleId === role.id ? `Manager : ${company.manager}` : ''}{company.managerRoleId === role.id && data.employees.some(employee => employee.roleId === role.id) ? ' · ' : ''}{data.employees.filter(employee => employee.roleId === role.id).map(employee => `${employee.firstName} ${employee.lastName}`).join(', ')}</p></div>}
               <div className="mt-4 border-t pt-3">
                 <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{Object.keys(role.modulePermissions).length} autorisation{Object.keys(role.modulePermissions).length > 1 ? 's' : ''} configurée{Object.keys(role.modulePermissions).length > 1 ? 's' : ''}</p>
                 <div className="flex flex-wrap gap-1.5">
                {Object.keys(role.modulePermissions).map(modId => (
                   <span key={modId} className="text-[10px] px-1.5 py-0.5 rounded border font-medium">
                     {permissionLabel(modId)}
                  </span>
                ))}
                 </div>
              </div>
            </div>
          );
        })}
        {companyRoles.length === 0 && <div className="col-span-full text-center py-8 text-sm text-[hsl(var(--muted-foreground))]">Aucun rôle configuré.</div>}
      </div>

      {modalOpen && <Modal title={editingRole ? 'Modifier le rôle' : 'Créer un rôle'} onClose={() => setModalOpen(false)}><RoleFormModal company={company} initialData={editingRole} allNodes={companyNodes} allRoles={companyRoles} sectorLocked={Boolean(editingRole && (data.employees.some(employee => employee.roleId === editingRole.id) || company.managerRoleId === editingRole.id))} onClose={() => setModalOpen(false)} onSave={(roleData: any) => {
        mutate((d: StoreData) => {
          if (editingRole) {
            const idx = d.roles.findIndex((r: Role) => r.id === editingRole.id);
            if (idx !== -1) d.roles[idx] = { ...d.roles[idx], ...roleData };
            d.employees.filter(employee => employee.roleId === editingRole.id).forEach(employee => { employee.role = roleData.name; });
          } else {
            d.roles.push({ id: uid('role'), companyId: company.id, ...roleData });
          }
        }, editingRole ? 'Rôle mis à jour.' : 'Rôle créé.');
        setModalOpen(false);
      }} /></Modal>}
    </div>
  );
}

function RoleFormModal({ company, initialData, allNodes, allRoles, sectorLocked, onClose, onSave }: { company: Company, initialData: Role | null, allNodes: OrgNode[], allRoles: Role[], sectorLocked: boolean, onClose: () => void, onSave: (d: any) => void }) {
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    sectorId: initialData?.sectorId || (allNodes.length > 0 ? allNodes[0].id : ''),
    modulePermissions: initialData?.modulePermissions || {} as Record<string, string[]>
  });

  const availableModules = company.allowedModules.length ? allModules.filter(m => company.allowedModules.includes(m.id)) : allModules;

  const togglePermission = (modId: string, perm: 'voir' | 'créer' | 'modifier') => {
    setFormData(prev => {
      const perms = prev.modulePermissions[modId] || [];
      const newPerms = perms.includes(perm) ? perms.filter((p: string) => p !== perm) : [...perms, perm];
      
      const newModulePermissions = { ...prev.modulePermissions };
      if (newPerms.length === 0) {
        delete newModulePermissions[modId];
      } else {
        newModulePermissions[modId] = newPerms;
      }
      if (perm === 'voir' && newPerms.length === 0) {
        Object.keys(newModulePermissions)
          .filter(key => key.startsWith(`${modId}:menu:`))
          .forEach(key => delete newModulePermissions[key]);
      }
      return { ...prev, modulePermissions: newModulePermissions };
    });
  };
  const toggleFeaturePermission = (moduleId: ModuleId, feature: string, perm: 'voir' | 'créer' | 'modifier') => {
    const key = permissionFeatureKey(moduleId, feature);
    setFormData(prev => {
      const current = prev.modulePermissions[key] || [];
      const next = current.includes(perm) ? current.filter(value => value !== perm) : [...current, perm];
      const modulePermissions = { ...prev.modulePermissions };
      if (next.length) modulePermissions[key] = next;
      else delete modulePermissions[key];
      if (next.length && !modulePermissions[moduleId]?.includes('voir')) {
        modulePermissions[moduleId] = [...(modulePermissions[moduleId] || []), 'voir'];
      }
      return { ...prev, modulePermissions };
    });
  };
  const togglePresencePermission = (permission: string) => {
    setFormData(prev => {
      const key = `presence.${permission}`;
      const current = prev.modulePermissions[key] || [];
      const next = current.length ? [] : ['autorisé'];
      const modulePermissions = { ...prev.modulePermissions };
      if (next.length) modulePermissions[key] = next;
      else delete modulePermissions[key];
      return { ...prev, modulePermissions };
    });
  };

  const handleSectorChange = (sectorId: string) => {
    setFormData(prev => ({ ...prev, sectorId, modulePermissions: {} }));
  };
  const handleSave = () => {
    const name = formData.name.trim();
    if (!name || !formData.sectorId) {
      setError('Le nom et le secteur du rôle sont obligatoires.');
      return;
    }
    if (allRoles.some(role => role.id !== initialData?.id && role.sectorId === formData.sectorId && role.name.trim().toLowerCase() === name.toLowerCase())) {
      setError('Un rôle portant ce nom existe déjà dans ce secteur.');
      return;
    }
    onSave({ ...formData, name });
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-[hsl(var(--destructive)/.1)] p-3 text-sm font-semibold text-[hsl(var(--destructive))]">{error}</p>}
      <Field label="Nom du rôle *" value={formData.name} onChange={(v: string) => setFormData({...formData, name: v})} help="Nom affiché lors de l’affectation d’un rôle à un employé." />
      <Field label="Description" value={formData.description} onChange={(v: string) => setFormData({...formData, description: v})} help="Expliquez les responsabilités principales associées à ce rôle." />
      
      <label className="block text-sm font-semibold mt-4">
        Unité d’appartenance *
        <select disabled={sectorLocked} value={formData.sectorId} onChange={e => handleSectorChange(e.target.value)} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))] disabled:opacity-60">
          {allNodes.map((n: OrgNode) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
         <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">Les modules affichés sont ceux autorisés pour l’entreprise. Le rôle limite ensuite précisément l’accès de ses employés.</span>
        {sectorLocked && <span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">Réaffectez d’abord les employés utilisant ce rôle pour changer son unité.</span>}
      </label>

      <div className="border-t pt-4 mt-4">
            <label className="block text-sm font-semibold mb-3">Permissions par module, sous-menu et action</label>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-3">Cochez d’abord « Voir » sur un module, puis choisissez ses sous-autorisations. Par exemple, un magasinier peut accéder à Articles et Entrées, tandis qu’un caissier ne voit que son espace de vente.</p>
        
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {availableModules.map(m => {
            const perms = formData.modulePermissions[m.id] || [];
            return (
              <div key={m.id} className="space-y-2">
                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{m.name}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{m.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['voir', 'créer', 'modifier'] as const).map(p => (
                      <label key={p} className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition ${perms.includes(p) ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted-foreground)/.2)]'}`}>
                        <input type="checkbox" className="hidden" checked={perms.includes(p)} onChange={() => togglePermission(m.id, p)} />
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
                 {m.id !== 'stocks' && m.id !== 'presences' && m.features.length > 0 && <div className="ml-3 rounded-lg border border-dashed p-3">
                   <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Permissions dans les menus de {m.name}</p>
                   <p className="mb-3 text-[10px] text-[hsl(var(--muted-foreground))]">Ces droits détaillent les menus visibles et les actions possibles dans ce module.</p>
                   <div className="space-y-2">
                     {m.features.map(feature => {
                       const menuKey = permissionFeatureKey(m.id, feature);
                       const featurePermissions = formData.modulePermissions[menuKey] || [];
                       return <div key={menuKey} className="flex flex-col gap-2 rounded-md bg-[hsl(var(--muted)/.45)] px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
                         <span className="text-[10px] font-semibold">{feature}</span>
                         <div className="flex gap-1">
                           {(['voir', 'créer', 'modifier'] as const).map(permission => <label key={permission} className={`cursor-pointer rounded px-1.5 py-1 text-[9px] font-bold ${featurePermissions.includes(permission) ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--card))]'}`}>
                             <input type="checkbox" className="hidden" checked={featurePermissions.includes(permission)} onChange={() => toggleFeaturePermission(m.id, feature, permission)} />
                             {permission === 'voir' ? 'Voir' : permission === 'créer' ? 'Créer' : 'Modifier'}
                           </label>)}
                         </div>
                       </div>;
                     })}
                   </div>
                 </div>}
                 {m.id === 'stocks' && <div className="ml-3 rounded-lg border border-dashed p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Sous-fonctions de Gestion de stock</p>
                  <p className="mb-3 text-[10px] text-[hsl(var(--muted-foreground))]">Ces règles priment sur les droits généraux du module pour les employés de cette unité.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {stockSubmodules.map(submodule => {
                      const subKey = `stocks:${submodule.id}`;
                      const subPerms = formData.modulePermissions[subKey] || [];
                      return <div key={subKey} className="flex items-center justify-between gap-2 rounded-md bg-[hsl(var(--muted)/.45)] px-2.5 py-2">
                        <span className="text-[10px] font-semibold">{submodule.name}</span>
                        <div className="flex gap-1">
                          {(['voir', 'créer', 'modifier'] as const).map(permission => <label key={permission} className={`cursor-pointer rounded px-1.5 py-1 text-[9px] font-bold ${subPerms.includes(permission) ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--card))]'}`}>
                            <input type="checkbox" className="hidden" checked={subPerms.includes(permission)} onChange={() => {
                              togglePermission(subKey, permission);
                              if (!formData.modulePermissions.stocks?.includes('voir')) togglePermission('stocks', 'voir');
                            }} />
                            {permission === 'voir' ? 'Voir' : permission === 'créer' ? 'Créer' : 'Modifier'}
                          </label>)}
                        </div>
                      </div>;
                    })}
                  </div>
                </div>}
                {m.id === 'presences' && <div className="ml-3 rounded-lg border border-dashed p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Droits détaillés des présences</p>
                  <p className="mb-3 text-[10px] text-[hsl(var(--muted-foreground))]">Chaque capacité est indépendante et reste limitée à l’unité du rôle.</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {([['view', 'Consulter'], ['create', 'Créer'], ['edit', 'Modifier'], ['delete', 'Supprimer'], ['correct', 'Corriger'], ['validate', 'Valider'], ['manage', 'Gérer'], ['export', 'Exporter'], ['reports', 'Rapports']] as const).map(([permission, label]) => {
                      const enabled = Boolean(formData.modulePermissions[`presence.${permission}`]?.length);
                      return <label key={permission} className={`cursor-pointer rounded px-2 py-1.5 text-[9px] font-bold ${enabled ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--card))]'}`}>
                        <input type="checkbox" className="hidden" checked={enabled} onChange={() => togglePresencePermission(permission)} />
                        {label}
                      </label>;
                    })}
                  </div>
                </div>}
              </div>
            );
          })}
          {availableModules.length === 0 && <div className="text-sm text-[hsl(var(--muted-foreground))] italic">Aucun module disponible pour ce secteur.</div>}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold border rounded-lg hover:bg-[hsl(var(--muted))]">Annuler</button>
        <ActionButton primary onClick={handleSave} disabled={!formData.name || !formData.sectorId}>Enregistrer</ActionButton>
      </div>
    </div>
  );
}

// 4. EMPLOYEES TAB
function EmployeesTab({ company, data, mutate, allowSectorAdmin = true }: { company: Company, data: StoreData, mutate: any; allowSectorAdmin?: boolean }) {
  const companyEmployees = data.employees.filter((e: Employee) => e.companyId === company.id);
  const companyNodes = data.orgNodes.filter((n: OrgNode) => n.companyId === company.id);
  const companyRoles = data.roles.filter((r: Role) => r.companyId === company.id);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  return (
    <div className="card-surface rounded-2xl overflow-hidden fade-up">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Comptes Employés</h2>
         <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Créez le compte, choisissez son appartenance et son rôle. Les permissions viennent du rôle configuré à l’étape 2.</p>
        </div>
        <ActionButton primary disabled={companyNodes.length === 0 || companyRoles.length === 0} onClick={() => { setEditingEmployee(null); setModalOpen(true); }} testId="btn-create-employee">Ajouter un employé</ActionButton>
      </div>
      {(companyNodes.length === 0 || companyRoles.length === 0) && <p className="m-6 rounded-lg bg-[hsl(var(--muted))] p-3 text-sm text-[hsl(var(--muted-foreground))]">Créez d’abord la structure, configurez les rôles et leurs autorisations, puis ajoutez les comptes employés.</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-[hsl(var(--muted)/.5)] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            <tr>
              <th className="px-6 py-3 font-bold">Employé</th>
              <th className="px-6 py-3 font-bold">Unité</th>
              <th className="px-6 py-3 font-bold">Rôle Assigné</th>
              <th className="px-6 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {companyEmployees.map((emp: Employee) => {
              const sector = companyNodes.find(n => n.id === emp.sectorId);
              const role = companyRoles.find(r => r.id === emp.roleId);
              return (
                <tr key={emp.id} className="hover:bg-[hsl(var(--muted)/.3)] transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--accent)/.2)] font-black text-xs text-[hsl(var(--foreground))]">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </span>
                      <div>
                        <p className="font-bold">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                   <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <Building2 size={13} className="text-[hsl(var(--muted-foreground))]" />
                       {sector?.name || 'Non assigné'}
                       {emp.isSectorAdmin && <span className="ml-1 rounded-full bg-[hsl(var(--primary)/.12)] px-2 py-0.5 text-[9px] font-bold text-[hsl(var(--primary))]">Manager</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-xs">
                    {role?.name || 'Non assigné'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" data-testid={`button-edit-org-employee-${emp.id}`} aria-label={`Modifier le compte de ${emp.firstName} ${emp.lastName}`} onClick={event => { event.stopPropagation(); setEditingEmployee(emp); setModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                        <Settings size={13} /><span>Modifier</span>
                      </button>
                      {demoEmployeeIds.has(emp.id)
                        ? <span className="inline-flex items-center rounded-lg border border-dashed px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">Compte démo protégé</span>
                        : <button data-testid={`button-delete-org-employee-${emp.id}`} aria-label={`Supprimer le compte de ${emp.firstName} ${emp.lastName}`} onClick={() => { if (window.confirm(`Supprimer le compte de ${emp.firstName} ${emp.lastName} ?`)) mutate((d: StoreData) => { d.employees = d.employees.filter(e => e.id !== emp.id); }, 'Employé supprimé.'); }} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)]">
                          <Trash2 size={13} /><span>Supprimer</span>
                        </button>}
                    </div>
                  </td>
                </tr>
              )
            })}
            {companyEmployees.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucun employé dans cette entreprise.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && <Modal title={editingEmployee ? 'Modifier un employé' : 'Ajouter un employé'} onClose={() => setModalOpen(false)}><EmployeeFormModal company={company} initialData={editingEmployee} allNodes={companyNodes} allRoles={companyRoles} allEmployees={companyEmployees} allowSectorAdmin={allowSectorAdmin} onClose={() => setModalOpen(false)} onSave={(empData: any) => {
        mutate((d: StoreData) => {
           const sector = d.orgNodes.find(node => node.id === empData.sectorId);
          const parent = sector?.parentId ? d.orgNodes.find(node => node.id === sector.parentId) : null;
          const normalized = { ...empData, email: empData.email.trim().toLowerCase(), department: sector?.name ?? '', subDepartment: parent?.name ?? '' };
          if (editingEmployee) {
            const idx = d.employees.findIndex((e: Employee) => e.id === editingEmployee.id);
            if (idx !== -1) d.employees[idx] = { ...d.employees[idx], ...normalized };
          } else {
             d.employees.push({ id: uid('emp'), companyId: company.id, status: 'ACTIF', department: '', subDepartment: '', ...normalized } as Employee);
           }
           const employeeId = editingEmployee?.id ?? d.employees[d.employees.length - 1]?.id;
           if (employeeId) {
             d.orgNodes.forEach(node => {
               if (node.managerEmployeeId === employeeId && node.id !== empData.sectorId) node.managerEmployeeId = undefined;
               if (node.id !== empData.sectorId && node.managerEmployeeId === employeeId) node.managerEmployeeId = undefined;
             });
             if (empData.isSectorAdmin && sector) {
               d.orgNodes.forEach(node => { if (node.id !== sector.id && node.managerEmployeeId === employeeId) node.managerEmployeeId = undefined; });
               sector.managerEmployeeId = employeeId;
             } else if (sector?.managerEmployeeId === employeeId) {
               sector.managerEmployeeId = undefined;
             }
          }
         }, editingEmployee
           ? (empData.loginPassword ? 'Employé mis à jour et mot de passe actualisé.' : 'Employé mis à jour.')
           : 'Employé ajouté. Utilisez son email et son mot de passe initial pour la connexion.');
        setModalOpen(false);
      }} /></Modal>}
    </div>
  );
}

function EmployeeFormModal({ company, initialData, allNodes, allRoles, allEmployees, allowSectorAdmin = true, onClose, onSave }: { company: Company, initialData: Employee | null, allNodes: OrgNode[], allRoles: Role[], allEmployees: Employee[], allowSectorAdmin?: boolean, onClose: () => void, onSave: (d: any) => void }) {
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    position: initialData?.position || '',
    sectorId: initialData?.sectorId || (allNodes.length > 0 ? allNodes[0].id : ''),
    roleId: initialData?.roleId || '',
    isSectorAdmin: initialData?.isSectorAdmin ?? false,
    password: '',
    passwordConfirm: ''
  });

  const getCompatibleRoles = () => {
    let compatibleIds = new Set<string>();
    let currentSectorId: string | null | undefined = formData.sectorId;
    
    while (currentSectorId) {
      const rolesInSector = allRoles.filter((r: Role) => r.sectorId === currentSectorId);
      rolesInSector.forEach((r: Role) => compatibleIds.add(r.id));
      const sector = allNodes.find((n: OrgNode) => n.id === currentSectorId);
      currentSectorId = sector?.parentId;
    }
    
    return allRoles.filter((r: Role) => compatibleIds.has(r.id));
  };

  const compatibleRoles = getCompatibleRoles();
  const handleSave = () => {
    const email = formData.email.trim().toLowerCase();
    const roleObj = compatibleRoles.find(role => role.id === formData.roleId);
    if (!formData.firstName.trim() || !formData.lastName.trim() || !email || !formData.position.trim() || !formData.sectorId || !roleObj) {
      setError('Prénom, nom, email, poste, appartenance et rôle compatible sont obligatoires.');
      return;
    }
    if (formData.isSectorAdmin && Object.keys(roleObj.modulePermissions).length === 0) {
      setError('Un manager doit utiliser un rôle avec au moins une autorisation.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Saisissez une adresse email valide.');
      return;
    }
    if (allEmployees.some(employee => employee.id !== initialData?.id && employee.email.trim().toLowerCase() === email)) {
      setError('Cette adresse email est déjà utilisée dans l’entreprise.');
      return;
    }
    const password = formData.password.trim();
    if (!initialData && password.length < 8) {
      setError('Définissez un mot de passe initial d’au moins 8 caractères.');
      return;
    }
    if (password && password.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== formData.passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    const { password: _password, passwordConfirm: _passwordConfirm, ...employeeData } = formData;
    onSave({ ...employeeData, firstName: formData.firstName.trim(), lastName: formData.lastName.trim(), email, position: formData.position.trim(), role: roleObj.name, ...(password ? { loginPassword: password } : {}) });
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-[hsl(var(--destructive)/.1)] p-3 text-sm font-semibold text-[hsl(var(--destructive))]">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom *" value={formData.firstName} onChange={(v: string) => setFormData({...formData, firstName: v})} help="Prénom utilisé dans les listes et l’historique des actions." />
        <Field label="Nom *" value={formData.lastName} onChange={(v: string) => setFormData({...formData, lastName: v})} help="Nom de famille de l’employé." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Email *" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} help="Adresse utilisée par l’employé pour se connecter à son espace." />
        <Field label="Téléphone" value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: v})} help="Numéro de contact professionnel de l’employé." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={initialData ? 'Nouveau mot de passe' : 'Mot de passe initial *'} type="password" value={formData.password} onChange={(v: string) => setFormData({...formData, password: v})} placeholder={initialData ? 'Laisser vide pour conserver' : 'Au moins 8 caractères'} testId="input-employee-password" help={initialData ? 'Laissez vide pour conserver le mot de passe actuel ; sinon utilisez au moins 8 caractères.' : 'Mot de passe utilisé par l’employé pour sa première connexion.'} />
        <Field label={initialData ? 'Confirmer le nouveau mot de passe' : 'Confirmer le mot de passe *'} type="password" value={formData.passwordConfirm} onChange={(v: string) => setFormData({...formData, passwordConfirm: v})} placeholder="Répétez le mot de passe" testId="input-employee-password-confirm" help="Saisissez exactement le même mot de passe pour confirmer." />
      </div>
      <p className="rounded-lg bg-[hsl(var(--muted))] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Le compte se connecte depuis « Espace KORA » avec cet email et ce mot de passe. Le mot de passe n’est pas affiché dans la liste des employés.</p>
      <Field label="Titre du poste" value={formData.position} onChange={(v: string) => setFormData({...formData, position: v})} placeholder="Ex: Développeur Senior" help="Intitulé professionnel visible dans les listes, distinct du rôle d’accès." />
      
      <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-4">
        <label className="block text-sm font-semibold">
           Appartenance *
          <select value={formData.sectorId} onChange={e => setFormData({...formData, sectorId: e.target.value, roleId: ''})} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))]">
            {allNodes.map((n: OrgNode) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
           <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">Section, département ou service de rattachement. Elle détermine les rôles compatibles.</span>
        </label>
        
        <label className="block text-sm font-semibold">
           Rôle *
          <select value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm focus:border-[hsl(var(--primary))]">
            <option value="">Sélectionner un rôle...</option>
            {compatibleRoles.map((r: Role) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Rôles de l’unité sélectionnée et de ses unités parentes.</p>
        </label>
      </div>
       {allowSectorAdmin && <label className="mt-4 flex items-start gap-2 rounded-lg border p-3 text-xs font-semibold">
        <input type="checkbox" checked={formData.isSectorAdmin} onChange={e => setFormData({ ...formData, isSectorAdmin: e.target.checked })} className="mt-0.5" />
         <span><strong className="block">Manager de cette unité</strong><small className="font-normal text-[hsl(var(--muted-foreground))]">Ce compte pourra gérer les rôles, permissions et employés de son appartenance et de ses unités descendantes. Il sera aussi proposé comme manager dans la structure.</small></span>
      </label>}

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold border rounded-lg hover:bg-[hsl(var(--muted))]">Annuler</button>
        <ActionButton primary onClick={handleSave} disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.position || !formData.sectorId || !formData.roleId}>Enregistrer</ActionButton>
      </div>
    </div>
  );
}
