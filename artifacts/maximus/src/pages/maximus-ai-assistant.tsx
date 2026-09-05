import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import {
  buildCompanyBlueprint,
  companyFromBlueprint,
  validateCompanyBlueprint,
  type CompanyBlueprint,
} from '@/lib/ai-company-blueprint';
import { getConfiguredModules, uid, type ModuleId, type OrgNode, type StoreData } from '@/lib/store';
import { synchronizeUnitPackRoles } from '@/lib/module-role-sync';

type Mutate = (fn: (data: StoreData) => void, message?: string) => void;

export function MaximusAiAssistant({
  data,
  mutate,
  onNavigate,
}: {
  data: StoreData;
  mutate: Mutate;
  onNavigate: (path: string) => void;
}) {
  const [companyName, setCompanyName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [country, setCountry] = useState('Sénégal');
  const [sector, setSector] = useState(data.sectorPresets[0]?.name ?? 'Services');
  const [prompt, setPrompt] = useState(
    'Une entreprise de distribution avec un entrepôt, une équipe commerciale et une validation des sorties de stock.',
  );
  const [blueprint, setBlueprint] = useState<CompanyBlueprint | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [error, setError] = useState('');

  const validation = useMemo(
    () => (blueprint ? validateCompanyBlueprint(data, blueprint) : { errors: [], warnings: [] }),
    [blueprint, data],
  );
  const configuredModules = getConfiguredModules(data);

  const generate = () => {
    const next = buildCompanyBlueprint(data, {
      companyName,
      managerName,
      adminEmail,
      country,
      sector,
      prompt,
    });
    setBlueprint(next);
    setExpandedUnit(next.units[0]?.name ?? null);
    setError('');
  };

  const apply = () => {
    if (!blueprint) return;
    if (validation.errors.length > 0) {
      setError('Corrigez les éléments signalés avant d’appliquer le brouillon.');
      return;
    }
    if (data.companies.some(company => company.email.toLowerCase() === blueprint.adminEmail.toLowerCase())) {
      setError('Une entreprise utilise déjà cette adresse email.');
      return;
    }

    const companyId = uid('company');
    const createdAt = new Date().toISOString().slice(0, 10);
    const company = companyFromBlueprint(blueprint, companyId, createdAt);
    mutate(draft => {
      draft.companies.push(company);
      const unitIds = new Map<string, string>();
      blueprint.units.forEach(unit => {
        const nodeId = uid('org');
        unitIds.set(unit.name, nodeId);
        draft.orgNodes.push({
          id: nodeId,
          companyId,
          name: unit.name,
          code: unit.code,
          type: unit.type,
          parentId: unit.parentName ? unitIds.get(unit.parentName) ?? null : null,
          moduleIds: [...unit.moduleIds],
          modulePackIds: Object.fromEntries(
            Object.entries(unit.modulePackIds).map(([moduleId, packIds]) => [moduleId, [...(packIds ?? [])]]),
          ),
          moduleFeatures: Object.fromEntries(
            Object.entries(unit.moduleFeatures).map(([moduleId, featureIds]) => [moduleId, [...(featureIds ?? [])]]),
          ),
        });
      });

      const companyNodes = draft.orgNodes.filter(node => node.companyId === companyId);
      companyNodes.forEach(node => synchronizeUnitPackRoles(draft, company, node));
      const managerNode = companyNodes[0];
      if (!managerNode) return;
      const managerPermissions = draft.roles
        .filter(role => role.companyId === companyId)
        .reduce<Record<string, string[]>>((permissions, role) => {
          Object.entries(role.modulePermissions).forEach(([key, values]) => {
            permissions[key] = [...new Set([...(permissions[key] ?? []), ...values])];
          });
          return permissions;
        }, {});
      const managerRoleId = uid('role');
      draft.roles.push({
        id: managerRoleId,
        companyId,
        sectorId: managerNode.id,
        name: `Administrateur · ${blueprint.companyName}`,
        description: 'Rôle d’administration limité à l’entreprise et à ses unités configurées.',
        modulePermissions: managerPermissions,
      });
      const savedCompany = draft.companies.find(item => item.id === companyId);
      if (savedCompany) savedCompany.managerRoleId = managerRoleId;
    }, 'Brouillon appliqué : entreprise, unités, modules et rôles créés.');
    onNavigate(`/maximus/entreprises/${encodeURIComponent(companyId)}`);
  };

  return (
    <div className="space-y-5">
      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary)/.78))] p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-white/70">
                <Sparkles size={15} />
                Intelligence métier MAXIMUS
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Construire une entreprise avec l’assistant</h2>
              <p className="mt-3 text-sm leading-6 text-white/80">
                Décrivez votre activité. Le moteur MAXIMUS compose un brouillon à partir du catalogue réel,
                puis vous le contrôlez avant toute création.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
              <ShieldCheck size={15} />
              Local · sans appel externe
            </div>
          </div>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Nom de l’entreprise" value={companyName} onChange={setCompanyName} placeholder="Ex. Teranga Distribution" />
          <Field label="Responsable" value={managerName} onChange={setManagerName} placeholder="Prénom Nom" />
          <Field label="Email administrateur" value={adminEmail} onChange={setAdminEmail} placeholder="admin@entreprise.com" type="email" />
          <Field label="Pays" value={country} onChange={setCountry} placeholder="Sénégal" />
          <label className="block text-sm font-semibold">
            Secteur de départ
            <select value={sector} onChange={event => setSector(event.target.value)} className="mt-2 w-full rounded-lg border bg-transparent px-3 py-3 text-sm font-normal">
              {data.sectorPresets.map(preset => <option key={preset.id} value={preset.name}>{preset.name}</option>)}
            </select>
          </label>
          <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-3 text-xs text-[hsl(var(--muted-foreground))]">
            Le secteur sert de point de départ. Les mots-clés de votre description peuvent retenir un autre ensemble
            de modules et de fonctionnalités.
          </div>
          <label className="block text-sm font-semibold sm:col-span-2">
            Décrivez l’organisation souhaitée
            <textarea
              data-testid="textarea-maximus-ai-prompt"
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-y rounded-lg border bg-transparent px-3 py-3 text-sm font-normal leading-6"
              placeholder="Ex. Une société de services avec RH, présences, rapports et une unité Conseil."
            />
          </label>
        </div>
        <div className="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            Le moteur n’invente aucun module : il ne peut sélectionner que ce qui est présent et actif dans MAXIMUS.
          </p>
          <button
            type="button"
            data-testid="button-generate-maximus-ai-blueprint"
            onClick={generate}
            className="btn inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
          >
            <WandSparkles size={16} />
            Générer le brouillon
          </button>
        </div>
      </section>

      {blueprint && (
        <section className="card-surface rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Brouillon prévisualisable</p>
              <h2 className="mt-2 text-xl font-bold">{blueprint.companyName || 'Entreprise à nommer'}</h2>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {blueprint.sector} · {blueprint.units.length} unité{blueprint.units.length > 1 ? 's' : ''} ·{' '}
                {[...new Set(blueprint.units.flatMap(unit => unit.moduleIds))].length} modules
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill ok={validation.errors.length === 0}>{validation.errors.length === 0 ? 'Prêt à valider' : 'À corriger'}</StatusPill>
              <StatusPill ok>{blueprint.advanced.managerScope === 'sector-only' ? 'Périmètre limité' : 'À vérifier'}</StatusPill>
            </div>
          </div>

          {validation.errors.length > 0 && (
            <Notice title="Le brouillon ne peut pas encore être appliqué" items={validation.errors} danger />
          )}
          {validation.warnings.length > 0 && <Notice title="Points à relire" items={validation.warnings} />}

          <div className="mt-5 space-y-3">
            {blueprint.units.map(unit => {
              const open = expandedUnit === unit.name;
              return (
                <div key={unit.name} className="rounded-xl border border-[hsl(var(--border))]">
                  <button
                    type="button"
                    onClick={() => setExpandedUnit(open ? null : unit.name)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-xs font-black text-[hsl(var(--primary))]">{unit.code}</span>
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">{unit.name}</strong>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {unit.moduleIds.length} module{unit.moduleIds.length > 1 ? 's' : ''} · {unit.roles.length} rôle{unit.roles.length > 1 ? 's' : ''}
                        </span>
                      </span>
                    </span>
                    {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                  </button>
                  {open && (
                    <div className="grid gap-4 border-t p-4 lg:grid-cols-[1fr_1fr]">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Modules & packs</p>
                        <div className="mt-3 space-y-2">
                          {unit.moduleIds.map(moduleId => {
                            const module = configuredModules.find(item => item.id === moduleId);
                            return (
                              <div key={moduleId} className="rounded-lg bg-[hsl(var(--muted)/.55)] px-3 py-2">
                                <strong className="block text-sm">{module?.name ?? moduleId}</strong>
                                <span className="mt-1 block text-[11px] text-[hsl(var(--muted-foreground))]">
                                  {(unit.modulePackIds[moduleId] ?? []).length > 0
                                    ? (unit.modulePackIds[moduleId] ?? []).map(packId => module?.featurePacks?.find(pack => pack.id === packId)?.name ?? packId).join(' · ')
                                    : 'Catalogue de fonctionnalités standard'}
                                </span>
                                <span className="mt-1 block text-[11px] text-[hsl(var(--primary))]">
                                  {(unit.moduleFeatures[moduleId] ?? []).length} fonctionnalité{(unit.moduleFeatures[moduleId] ?? []).length > 1 ? 's' : ''} retenue{(unit.moduleFeatures[moduleId] ?? []).length > 1 ? 's' : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Rôles & permissions</p>
                        <div className="mt-3 space-y-2">
                          {unit.roles.map(role => (
                            <div key={role.name} className="rounded-lg border px-3 py-2">
                              <strong className="block text-sm">{role.name}</strong>
                              <span className="mt-1 block text-[11px] text-[hsl(var(--muted-foreground))]">{role.description}</span>
                              <span className="mt-2 block text-[11px] font-semibold text-[hsl(var(--primary))]">
                                {Object.keys(role.modulePermissions).length} entrée{Object.keys(role.modulePermissions).length > 1 ? 's' : ''} de permission
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 rounded-xl bg-[hsl(var(--muted)/.5)] p-4 text-xs sm:grid-cols-3">
            <div><span className="block text-[hsl(var(--muted-foreground))]">Traçabilité</span><strong className="mt-1 block">Activée</strong></div>
            <div><span className="block text-[hsl(var(--muted-foreground))]">Périmètre manager</span><strong className="mt-1 block">Entreprise / unités</strong></div>
            <div><span className="block text-[hsl(var(--muted-foreground))]">Validation renforcée</span><strong className="mt-1 block">{blueprint.advanced.approvalRequired ? 'Demandée' : 'Non demandée'}</strong></div>
          </div>

          {error && <p className="mt-4 rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]">{error}</p>}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setBlueprint(null)} className="rounded-lg border px-4 py-3 text-sm font-bold">Recommencer</button>
            <button
              type="button"
              data-testid="button-apply-maximus-ai-blueprint"
              disabled={validation.errors.length > 0}
              onClick={apply}
              className="btn inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={16} />
              Appliquer le brouillon
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-lg border bg-transparent px-3 py-3 text-sm font-normal" />
    </label>
  );
}

function StatusPill({ ok, children }: { ok: boolean; children: string }) {
  return <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${ok ? 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]'}`}>{children}</span>;
}

function Notice({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  return (
    <div className={`mt-4 rounded-xl border p-4 ${danger ? 'border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.05)]' : 'border-[hsl(var(--accent)/.4)] bg-[hsl(var(--accent)/.08)]'}`}>
      <strong className="text-xs">{title}</strong>
      <ul className="mt-2 space-y-1 text-xs text-[hsl(var(--muted-foreground))]">
        {items.map(item => <li key={item} className="flex gap-2"><Plus size={13} className="mt-0.5 shrink-0" />{item}</li>)}
      </ul>
    </div>
  );
}