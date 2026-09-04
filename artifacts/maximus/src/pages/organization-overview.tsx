import { ArrowRight, Building2, GitBranch, KeyRound, Users } from 'lucide-react';
import type { Company, Employee, OrgNode, Role, StoreData } from '@/lib/store';

type SetTab = (tab: 'overview' | 'structure' | 'roles' | 'employees' | 'profile') => void;

export function OverviewTab({
  company,
  data,
  setTab,
}: {
  company: Company;
  data: StoreData;
  setTab: SetTab;
}) {
  const companyNodes = data.orgNodes.filter(node => node.companyId === company.id);
  const companyRoles = data.roles.filter(role => role.companyId === company.id);
  const companyEmployees = data.employees.filter(employee => employee.companyId === company.id);
  const managerRole = companyRoles.find(role => role.id === company.managerRoleId);
  const rootNodes = companyNodes.filter(node => !node.parentId);

  return (
    <div className="space-y-6 fade-up">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="Unités Organisationnelles" value={companyNodes.length} icon={Building2} onClick={() => setTab('structure')} />
        <MetricCard title="Rôles Configurés" value={companyRoles.length} icon={KeyRound} onClick={() => setTab('roles')} />
        <MetricCard title="Employés Actifs" value={companyEmployees.length} icon={Users} onClick={() => setTab('employees')} />
      </div>
      <div className="card-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">Responsable de l’entreprise</p>
          <p className="mt-1 text-lg font-bold">{company.manager}</p>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Compte manager · {company.email}</p>
        </div>
        <div className="rounded-xl bg-[hsl(var(--primary)/.1)] px-4 py-3 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Rôle affecté</p>
          <p className="mt-1 text-sm font-bold text-[hsl(var(--primary))]">{managerRole?.name || 'Manager entreprise'}</p>
          <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Accès global</p>
        </div>
      </div>
      <div className="card-surface rounded-2xl p-6">
        <h2 className="mb-6 text-lg font-bold">Chaîne d'héritage</h2>
        <div className="space-y-4">
          {rootNodes.map(root => (
            <OverviewTreeNode key={root.id} node={root} allNodes={companyNodes} allRoles={companyRoles} allEmployees={companyEmployees} depth={0} />
          ))}
          {rootNodes.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <GitBranch className="mx-auto text-[hsl(var(--primary))]" size={28} />
              <h3 className="mt-4 font-bold">Votre organisation est vide</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">Commencez par créer la première unité de votre entreprise. Aucun secteur, département ou service n’est imposé par MAXIMUS.</p>
              <button data-testid="button-start-organization" onClick={() => setTab('structure')} className="mt-5 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">Créer ma première unité</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, onClick }: { title: string; value: number; icon: typeof Building2; onClick: () => void }) {
  return (
    <button onClick={onClick} className="metric-card card-surface flex items-center justify-between rounded-2xl p-5 text-left transition hover:border-[hsl(var(--primary)/.4)]">
      <div>
        <p className="text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">{title}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </div>
      <div className="rounded-xl bg-[hsl(var(--primary)/.1)] p-3 text-[hsl(var(--primary))]"><Icon size={20} /></div>
    </button>
  );
}

function OverviewTreeNode({
  node,
  allNodes,
  allRoles,
  allEmployees,
  depth,
}: {
  node: OrgNode;
  allNodes: OrgNode[];
  allRoles: Role[];
  allEmployees: Employee[];
  depth: number;
}) {
  const children = allNodes.filter(candidate => candidate.parentId === node.id);
  const roles = allRoles.filter(role => role.sectorId === node.id);
  const employees = allEmployees.filter(employee => employee.sectorId === node.id);

  return (
    <div className="relative">
      <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/.5)] py-3 md:flex-row md:items-center" style={{ marginLeft: `${depth * 24}px` }}>
        <div className="flex w-64 shrink-0 items-center gap-3">
          <span className="rounded bg-[hsl(var(--muted))] p-1.5 text-[hsl(var(--muted-foreground))]"><GitBranch size={14} /></span>
          <div>
            <p className="text-sm font-bold">{node.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{node.type} {node.code ? `· ${node.code}` : ''}</p>
          </div>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-1.5"><Building2 size={13} /> Unité organisationnelle</div>
          <ArrowRight size={12} className="opacity-40" />
          <div className="flex items-center gap-1.5"><KeyRound size={13} /> {roles.length} rôles</div>
          <ArrowRight size={12} className="opacity-40" />
          <div className="flex items-center gap-1.5 font-semibold text-[hsl(var(--foreground))]"><Users size={13} /> {employees.length} employés</div>
        </div>
      </div>
      {children.map(child => <OverviewTreeNode key={child.id} node={child} allNodes={allNodes} allRoles={allRoles} allEmployees={allEmployees} depth={depth + 1} />)}
    </div>
  );
}