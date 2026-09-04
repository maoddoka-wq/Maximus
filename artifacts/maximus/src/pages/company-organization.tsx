import { useEffect, useState } from 'react';
import type { Company, StoreData } from '@/lib/store';
import { CompanyProfileSection } from './company-profile-section';
import { EmployeesTab } from './organization-employees';
import { OverviewTab } from './organization-overview';
import { RolesTab } from './organization-roles';
import { StructureTab } from './organization-structure';

type Mutate = (fn: (data: StoreData) => void, message?: string) => void;
type OrganizationTab = 'overview' | 'structure' | 'roles' | 'employees' | 'profile';

export { CompanyProfileSection } from './company-profile-section';

export function CompanyOrganizationAdmin({
  company,
  data,
  mutate,
  initialTab = 'overview',
  standalone = false,
  sectorManager = false,
  scopeNodeId,
}: {
  company: Company;
  data: StoreData;
  mutate: Mutate;
  initialTab?: OrganizationTab;
  standalone?: boolean;
  sectorManager?: boolean;
  scopeNodeId?: string;
}) {
  const companyNodes = data.orgNodes.filter(node => node.companyId === company.id);
  const scopedNodeIds = new Set<string>();

  if (scopeNodeId) {
    const pending = [scopeNodeId];
    while (pending.length) {
      const nodeId = pending.pop();
      if (!nodeId || scopedNodeIds.has(nodeId)) continue;
      scopedNodeIds.add(nodeId);
      companyNodes
        .filter(node => node.parentId === nodeId)
        .forEach(node => pending.push(node.id));
    }
  }

  const scopedData =
    sectorManager && scopeNodeId
      ? {
          ...data,
          orgNodes: data.orgNodes.filter(
            node => !node.companyId || scopedNodeIds.has(node.id),
          ),
          roles: data.roles.filter(
            role => !role.companyId || scopedNodeIds.has(role.sectorId ?? ''),
          ),
          employees: data.employees.filter(
            employee =>
              !employee.companyId || scopedNodeIds.has(employee.sectorId ?? ''),
          ),
        }
      : data;
  const [tab, setTab] = useState<OrganizationTab>(
    sectorManager && initialTab === 'structure' ? 'overview' : initialTab,
  );

  useEffect(() => {
    setTab(sectorManager && initialTab === 'structure' ? 'overview' : initialTab);
  }, [initialTab, sectorManager]);

  const organizationNodes = scopedData.orgNodes.filter(
    node => node.companyId === company.id,
  );
  const organizationRoles = scopedData.roles.filter(
    role => role.companyId === company.id,
  );
  const organizationEmployees = scopedData.employees.filter(
    employee => employee.companyId === company.id,
  );
  const unitsWithoutManager = organizationNodes.filter(
    node =>
      !organizationEmployees.some(
        employee =>
          employee.id === node.managerEmployeeId &&
          employee.sectorId === node.id,
      ),
  );
  const tabs = ([
    { id: 'overview', label: "Vue d'ensemble" },
    { id: 'structure', label: '1 · Structure & unités' },
    { id: 'roles', label: '2 · Rôles & permissions' },
    { id: 'employees', label: '3 · Comptes & managers' },
    { id: 'profile', label: 'Mon profil' },
  ] as { id: OrganizationTab; label: string }[]).filter(
    item =>
      !sectorManager ||
      item.id === 'overview' ||
      item.id === 'roles' ||
      item.id === 'employees',
  );

  return (
    <div className="space-y-6">
      <div className="card-surface rounded-2xl p-6">
        <h1 className="text-xl font-bold">
          {sectorManager
            ? 'Règles d’accès de mon unité'
            : `Modèle d'Accès & Organisation : ${company.name}`}
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          {sectorManager
            ? 'Gérez les rôles, sous-autorisations et comptes de votre unité et de ses descendants.'
            : 'Construisez la hiérarchie, configurez les rôles et sous-autorisations, puis affectez les comptes et managers.'}
        </p>
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {tabs.map(item => (
            <button
              key={item.id}
              data-testid={`tab-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-xs font-bold transition ${tab === item.id ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {!sectorManager && (
        <section className="card-surface rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.03)] p-5">
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
              ].map(step => (
                <button key={step.number} type="button" onClick={() => setTab(step.target)} className="rounded-xl border bg-[hsl(var(--card))] p-3 text-left transition hover:border-[hsl(var(--primary)/.5)]">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${step.done ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{step.done ? '✓' : step.number}</span>
                  <span className="mt-2 block">{step.label}</span>
                  <span className="mt-1 block text-[9px] font-normal text-[hsl(var(--muted-foreground))]">{step.done ? 'Terminé' : 'À faire'}</span>
                </button>
              ))}
            </div>
          </div>
          {(organizationNodes.length === 0 ||
            organizationRoles.length === 0 ||
            unitsWithoutManager.length > 0) && (
            <p className="mt-4 rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
              {organizationNodes.length === 0
                ? 'Commencez par créer la première unité.'
                : organizationRoles.length === 0
                  ? 'Créez ensuite les rôles et leurs permissions.'
                  : `${unitsWithoutManager.length} unité(s) doivent encore avoir un manager avec un compte actif.`}
            </p>
          )}
        </section>
      )}
      {tab === 'overview' && <OverviewTab company={company} data={scopedData} setTab={setTab} />}
      {tab === 'structure' && !sectorManager && <StructureTab company={company} data={scopedData} mutate={mutate} />}
      {tab === 'roles' && <RolesTab company={company} data={scopedData} mutate={mutate} />}
      {tab === 'employees' && <EmployeesTab company={company} data={scopedData} mutate={mutate} allowSectorAdmin={!sectorManager} />}
      {tab === 'profile' && !sectorManager && <CompanyProfileSection company={company} data={scopedData} mutate={mutate} />}
    </div>
  );
}