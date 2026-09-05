import { useEffect, useState } from 'react';
import type { Company, StoreData } from '@/lib/store';
import { CompanyProfileSection } from './company-profile-section';
import { EmployeesTab } from './organization-employees';
import { RolesTab } from './organization-roles';
import { StructureTab } from './organization-structure';

type Mutate = (fn: (data: StoreData) => void, message?: string) => void;
type OrganizationTab = 'structure' | 'roles' | 'employees' | 'profile';

export { CompanyProfileSection } from './company-profile-section';

export function CompanyOrganizationAdmin({
  company,
  data,
  mutate,
  initialTab = 'structure',
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
    sectorManager && initialTab === 'structure' ? 'roles' : initialTab,
  );

  useEffect(() => {
    setTab(sectorManager && initialTab === 'structure' ? 'roles' : initialTab);
  }, [initialTab, sectorManager]);

  const organizationNodes = scopedData.orgNodes.filter(
    node => node.companyId === company.id,
  );
  const tabs = ([
    { id: 'structure', label: '1 · Structure & unités' },
    { id: 'roles', label: '2 · Rôles & permissions' },
    { id: 'employees', label: '3 · Comptes & managers' },
    { id: 'profile', label: 'Mon profil' },
  ] as { id: OrganizationTab; label: string }[]).filter(
    item =>
      !sectorManager ||
      item.id === 'roles' ||
      item.id === 'employees',
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="card-surface rounded-2xl p-4 sm:p-6">
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
        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {tabs.map(item => (
            <button
              key={item.id}
              data-testid={`tab-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`min-w-0 rounded-lg px-2.5 py-2.5 text-left text-[11px] font-bold leading-4 transition sm:px-4 sm:text-xs ${tab === item.id ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'structure' && !sectorManager && <StructureTab company={company} data={scopedData} mutate={mutate} />}
      {tab === 'roles' && <RolesTab company={company} data={scopedData} mutate={mutate} />}
      {tab === 'employees' && <EmployeesTab company={company} data={scopedData} mutate={mutate} allowSectorAdmin={!sectorManager} />}
      {tab === 'profile' && !sectorManager && <CompanyProfileSection company={company} data={scopedData} mutate={mutate} />}
    </div>
  );
}