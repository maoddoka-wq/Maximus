import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  FilePlus2,
  FlaskConical,
  Hash,
  Pencil,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { Link } from 'wouter';
import type { Module } from '@/lib/store';
import { laboApi } from '@/lib/labo-api';
import {
  type LaboFeatureDefinition,
  type LaboFieldDefinition,
  type LaboRecord,
  type LaboRecordFeatureDefinition,
} from '@/lib/labo-composer';
import { isNativeMountSupported } from '@/lib/native-mount-adapters';

type LaboModule = Module & { laboFeatures?: LaboFeatureDefinition[] };

type RuntimeProps = {
  module: Module;
  feature?: LaboFeatureDefinition | null;
  modules: Module[];
  allowedModuleIds: string[];
  canViewFeature?: (moduleId: string, featureId: string) => boolean;
};

const panelClass =
  'rounded-[22px] border border-[#dedbd3] bg-[#fbfaf7] shadow-[0_14px_40px_rgba(44,50,56,.06)]';
const inputClass =
  'w-full rounded-xl border border-[#d8d6ce] bg-[#f7f5ef] px-3.5 py-2.5 text-sm text-[#26323a] outline-none transition placeholder:text-[#9aa09e] focus:border-[#286c73] focus:ring-2 focus:ring-[#286c73]/10';

function readableError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

function isConflict(error: unknown) {
  const message = readableError(error).toLowerCase();
  return message.includes('conflit') || message.includes('version') || message.includes('409')
    || Boolean(error && typeof error === 'object' && 'status' in error && error.status === 409);
}

function fieldIcon(type: LaboFieldDefinition['type']) {
  if (type === 'date') return <CalendarDays size={14} />;
  if (type === 'number') return <Hash size={14} />;
  if (type === 'boolean') return <Check size={14} />;
  return <Type size={14} />;
}

function emptyData(definition: LaboRecordFeatureDefinition): LaboRecord['data'] {
  return Object.fromEntries(definition.fields.map(field => [field.id, field.type === 'boolean' ? false : '']));
}

function formatValue(value: LaboRecord['data'][string], field: LaboFieldDefinition) {
  if (value === null || value === undefined || value === '') return '—';
  if (field.type === 'boolean') return value ? 'Oui' : 'Non';
  return String(value);
}

function FeatureList({ module, features }: { module: Module; features: LaboFeatureDefinition[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {features.map(item => (
        <article key={item.id} data-testid={`card-labo-feature-${item.id}`} className={`${panelClass} p-5 transition hover:-translate-y-0.5 hover:border-[#b6cbc5]`}>
          <div className="flex items-start justify-between gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.kind === 'records' ? 'bg-[#e4f0eb] text-[#286c73]' : 'bg-[#f5ead9] text-[#a07337]'}`}>
              {item.kind === 'records' ? <FilePlus2 size={19} /> : <ExternalLink size={18} />}
            </div>
            <span className="rounded-full border border-[#e1ded6] px-2 py-1 font-mono text-[9px] uppercase tracking-[.12em] text-[#889291]">{item.kind === 'records' ? 'Fiches' : isNativeMountSupported(item.sourceModuleId, item.sourceFeatureId) ? 'Montée' : 'Adaptation à venir'}</span>
          </div>
          <h2 className="mt-5 text-lg font-black tracking-[-.03em]">
            {item.kind === 'records' ? (
              <Link
                href={`/entreprise/${encodeURIComponent(module.id)}?feature=${encodeURIComponent(item.id)}`}
                data-testid={`link-record-feature-${item.id}`}
                className="transition hover:text-[#286c73]"
              >
                {item.label}
              </Link>
            ) : item.label}
          </h2>
          <p className="mt-1.5 min-h-10 text-sm leading-5 text-[#758084]">{item.description || 'Capacité LABO configurée pour ce module.'}</p>
          {item.kind === 'records' ? (
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#5f6b70]"><span className="rounded-lg bg-[#f1f0e9] px-2 py-1">{item.fields.length} champ{item.fields.length > 1 ? 's' : ''}</span>{item.workflow && <span className="rounded-lg bg-[#f1f0e9] px-2 py-1">{item.workflow.stages.length} étapes</span>}</div>
          ) : (
            isNativeMountSupported(item.sourceModuleId, item.sourceFeatureId)
              ? <Link href={`/entreprise/${encodeURIComponent(module.id)}?feature=${encodeURIComponent(item.id)}`} data-testid={`link-native-feature-${item.id}`} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#286c73] hover:text-[#1d555b]">Ouvrir la capacité montée <ArrowRight size={14} /></Link>
              : <p data-testid={`state-unsupported-native-${item.id}`} className="mt-5 text-xs font-semibold text-[#a07337]">Cette fonctionnalité native n’est pas encore disponible dans ce module cible.</p>
          )}
          <p className="mt-4 border-t border-[#e5e1d8] pt-3 font-mono text-[9px] uppercase tracking-[.12em] text-[#a0a5a2]">{module.name} · {item.id}</p>
        </article>
      ))}
    </div>
  );
}

export function LaboRuntimePage({ module, feature, modules, allowedModuleIds, canViewFeature }: RuntimeProps) {
  const laboFeatures = (module as LaboModule).laboFeatures ?? [];
  const definition = feature?.kind === 'records' ? feature : null;
  const canView = allowedModuleIds.includes(module.id) && (!feature || (canViewFeature?.(module.id, feature.id) ?? true));
  const [records, setRecords] = useState<LaboRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(definition));
  const [loadingError, setLoadingError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LaboRecord | null>(null);
  const [formData, setFormData] = useState<LaboRecord['data']>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [actionError, setActionError] = useState('');
  const [pendingId, setPendingId] = useState('');
  const [conflict, setConflict] = useState(false);

  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [records]);
  const workflow = definition?.workflow;

  const load = async () => {
    if (!definition) return;
    setLoading(true);
    setLoadingError('');
    try {
      const result = await laboApi.bootstrap(module.id, definition.id);
      setRecords(result.records);
    } catch (error) {
      setLoadingError(readableError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [module.id, definition?.id]);

  const openCreate = () => {
    if (!definition) return;
    setEditing(null);
    setFormData(emptyData(definition));
    setFormErrors([]);
    setActionError('');
    setConflict(false);
    setFormOpen(true);
  };
  const openEdit = (record: LaboRecord) => {
    setEditing(record);
    setFormData({ ...record.data });
    setFormErrors([]);
    setActionError('');
    setConflict(false);
    setFormOpen(true);
  };
  const validateForm = () => {
    if (!definition) return false;
    const errors: string[] = [];
    definition.fields.forEach(field => {
      const value = formData[field.id];
      if (field.required && (value === null || value === undefined || value === '')) errors.push(`« ${field.label} » est requis.`);
      if (field.type === 'number' && value !== '' && value !== null && value !== undefined && Number.isNaN(Number(value))) errors.push(`« ${field.label} » doit être un nombre.`);
    });
    setFormErrors(errors);
    return errors.length === 0;
  };
  const normalizedData = () => {
    if (!definition) return formData;
    return Object.fromEntries(definition.fields.map(field => {
      const value = formData[field.id];
      return [field.id, field.type === 'number' && value !== '' && value !== null ? Number(value) : value === '' ? null : value];
    }));
  };
  const save = async () => {
    if (!definition || !validateForm()) return;
    setPendingId(editing?.id ?? 'new');
    setActionError('');
    setConflict(false);
    try {
      const result = editing
        ? await laboApi.updateRecord(module.id, definition.id, editing.id, normalizedData(), editing.version)
        : await laboApi.createRecord(module.id, definition.id, normalizedData());
      setRecords(current => editing ? current.map(record => record.id === editing.id ? result.record : record) : [result.record, ...current]);
      setFormOpen(false);
    } catch (error) {
      setConflict(isConflict(error));
      setActionError(readableError(error));
    } finally {
      setPendingId('');
    }
  };
  const remove = async (record: LaboRecord) => {
    if (!definition || !window.confirm(`Supprimer la fiche « ${record.id} » ?`)) return;
    setPendingId(record.id);
    setActionError('');
    setConflict(false);
    try {
      await laboApi.deleteRecord(module.id, definition.id, record.id, record.version);
      setRecords(current => current.filter(item => item.id !== record.id));
    } catch (error) {
      setConflict(isConflict(error));
      setActionError(readableError(error));
    } finally {
      setPendingId('');
    }
  };
  const advance = async (record: LaboRecord) => {
    if (!definition?.workflow) return;
    const currentIndex = Math.max(-1, definition.workflow.stages.findIndex(stage => stage.id === record.status));
    const nextStage = definition.workflow.stages[currentIndex + 1];
    if (!nextStage) return;
    const missing = nextStage.requiredFieldIds
      .map(id => definition.fields.find(field => field.id === id))
      .filter((field): field is LaboFieldDefinition => Boolean(field))
      .filter(field => record.data[field.id] === null || record.data[field.id] === undefined || record.data[field.id] === '')
      .map(field => `« ${field.label} » est requis avant cette étape.`);
    if (missing.length) {
      setActionError(missing.join(' '));
      setConflict(false);
      return;
    }
    setPendingId(`transition-${record.id}`);
    setActionError('');
    setConflict(false);
    try {
      const result = await laboApi.transitionRecord(module.id, definition.id, record.id, nextStage.id, record.version);
      setRecords(current => current.map(item => item.id === record.id ? result.record : item));
    } catch (error) {
      setConflict(isConflict(error));
      setActionError(readableError(error));
    } finally {
      setPendingId('');
    }
  };

  if (!feature) {
    return (
      <main className="min-h-[100dvh] bg-[#f1efe9] px-4 py-5 text-[#26323a] sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[1180px]">
          <header className="mb-8 border-b border-[#d8d5cd] pb-6">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.2em] text-[#286c73]"><FlaskConical size={15} /> {module.name} / LABO</div>
            <h1 data-testid="text-labo-feature-list-title" className="text-3xl font-black tracking-[-.055em] sm:text-5xl">Capacités de l’atelier</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687479]">Les opérations ajoutées à ce module apparaissent ici. Chaque capacité conserve son périmètre et ses règles d’accès.</p>
          </header>
          {!canView ? <AccessState moduleName={module.name} /> : laboFeatures.length === 0 ? <EmptyState moduleName={module.name} /> : <FeatureList module={module} features={laboFeatures} />}
        </div>
      </main>
    );
  }

  if (!canView) {
    return <main className="min-h-[100dvh] bg-[#f1efe9] px-4 py-8"><div className="mx-auto max-w-[920px]"><AccessState moduleName={module.name} /></div></main>;
  }

  if (feature.kind === 'reuse') {
    const supported = isNativeMountSupported(feature.sourceModuleId, feature.sourceFeatureId);
    return (
      <main className="min-h-[100dvh] bg-[#f1efe9] px-4 py-8 text-[#26323a]">
        <div className="mx-auto max-w-[920px]">
          <section data-testid={supported ? 'state-native-mount-routing' : 'state-unsupported-native'} className={`${panelClass} p-8 text-center`}>
            <ShieldAlert size={28} className="mx-auto text-[#a07337]" />
            <h2 className="mt-3 text-lg font-black">{supported ? 'Cette capacité doit s’ouvrir dans son module cible' : 'Montage natif non disponible'}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#788286]">
              {supported
                ? 'Le moteur natif n’a pas été chargé par cette route. Aucune redirection vers le module source n’est proposée.'
                : 'Cette fonctionnalité est enregistrée dans le catalogue, mais aucun adaptateur d’exécution n’est disponible pour le moment.'}
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!definition) {
    return <main className="min-h-[100dvh] bg-[#f1efe9] px-4 py-8"><div className="mx-auto max-w-[920px]"><AccessState moduleName={module.name} /></div></main>;
  }

  return (
    <main className="min-h-[100dvh] bg-[#f1efe9] px-4 py-5 text-[#26323a] sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-7 flex flex-col justify-between gap-5 border-b border-[#d8d5cd] pb-6 lg:flex-row lg:items-end">
          <div><div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.2em] text-[#286c73]"><FlaskConical size={15} /> {module.name} / LABO</div><h1 data-testid="text-record-feature-title" className="text-3xl font-black tracking-[-.055em] sm:text-5xl">{definition.label}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#687479]">{definition.description || 'Gérez les fiches persistantes de cette capacité.'}</p></div>
          <button type="button" data-testid="button-create-labo-record" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#286c73] px-4 py-3 text-sm font-bold text-[#f8faf5] shadow-[0_8px_20px_rgba(40,108,115,.18)] transition hover:bg-[#205b61]"><FilePlus2 size={17} /> Nouvelle fiche</button>
        </header>
        {actionError && <div data-testid="status-runtime-error" className={`mb-5 flex items-start gap-2 rounded-xl border p-3 text-sm ${conflict ? 'border-[#e2c98f] bg-[#fff7e3] text-[#8c6a32]' : 'border-[#e7c9bf] bg-[#fbefeb] text-[#9a554b]'}`}><CircleAlert size={16} className="mt-0.5 shrink-0" /><span><strong>{conflict ? 'Version modifiée' : 'Action impossible'} · </strong>{actionError}{conflict && ' Actualisez la liste puis réessayez avec les données les plus récentes.'}</span></div>}
        {loadingError ? <section className={`${panelClass} p-8 text-center`}><CircleAlert size={24} className="mx-auto text-[#a86158]" /><h2 className="mt-3 text-lg font-black">Les fiches ne sont pas disponibles</h2><p className="mx-auto mt-1 max-w-md text-sm text-[#788286]">{loadingError}</p><button type="button" data-testid="button-retry-bootstrap" onClick={() => void load()} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#d8d6ce] px-4 py-2.5 text-xs font-bold text-[#46535a]"><RefreshCw size={14} /> Réessayer</button></section> : loading ? <RecordSkeleton /> : sortedRecords.length === 0 ? <EmptyRecords onCreate={openCreate} /> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><section className={`${panelClass} overflow-hidden`}><div className="flex items-center justify-between border-b border-[#e5e1d8] px-5 py-4"><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#9ba19f]">Registre persistant</p><p data-testid="text-record-count" className="mt-1 text-sm font-bold">{sortedRecords.length} fiche{sortedRecords.length > 1 ? 's' : ''}</p></div><span className="rounded-full bg-[#e7f1ed] px-2.5 py-1 font-mono text-[10px] font-bold text-[#286c73]">À jour</span></div><div className="divide-y divide-[#ebe8e0]">{sortedRecords.map(record => <RecordRow key={record.id} record={record} definition={definition} workflow={workflow} pendingId={pendingId} onEdit={() => openEdit(record)} onDelete={() => void remove(record)} onAdvance={() => void advance(record)} />)}</div></section><WorkflowRail definition={definition} records={sortedRecords} /></div>}
        {formOpen && <RecordForm definition={definition} data={formData} setData={setFormData} editing={editing} errors={formErrors} actionError={actionError} pending={pendingId !== ''} onClose={() => setFormOpen(false)} onSave={() => void save()} />}
      </div>
    </main>
  );
}

function AccessState({ moduleName }: { moduleName: string }) {
  return <section data-testid="state-labo-access-denied" className="rounded-[22px] border border-[#e7c9bf] bg-[#fbefeb] p-8 text-center"><ShieldAlert size={28} className="mx-auto text-[#a86158]" /><h2 className="mt-3 text-lg font-black">Accès non disponible</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#806f6c]">La capacité LABO n’est pas activée pour {moduleName} ou votre rôle ne permet pas de la consulter.</p></section>;
}

function EmptyState({ moduleName }: { moduleName: string }) {
  return <section data-testid="state-labo-empty" className="rounded-[22px] border border-[#dedbd3] bg-[#fbfaf7] p-10 text-center"><FlaskConical size={28} className="mx-auto text-[#9aa09e]" /><h2 className="mt-3 text-lg font-black">Aucune capacité LABO</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#788286]">Le module {moduleName} ne contient pas encore de capacité composée.</p></section>;
}

function EmptyRecords({ onCreate }: { onCreate: () => void }) {
  return <section data-testid="state-labo-records-empty" className="rounded-[22px] border border-dashed border-[#cfcfc6] bg-[#f8f6f0] p-12 text-center"><FilePlus2 size={28} className="mx-auto text-[#8b9997]" /><h2 className="mt-3 text-lg font-black">Le registre est vide</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#788286]">Créez la première fiche pour commencer à suivre cette opération.</p><button type="button" data-testid="button-create-first-record" onClick={onCreate} className="mt-5 rounded-xl bg-[#286c73] px-4 py-2.5 text-xs font-bold text-[#f8faf5]">Créer la première fiche</button></section>;
}

function RecordSkeleton() {
  return <section data-testid="state-labo-records-loading" className="space-y-2 rounded-[22px] border border-[#dedbd3] bg-[#fbfaf7] p-5"><div className="h-12 animate-pulse rounded-xl bg-[#ebe9e1]" /><div className="h-20 animate-pulse rounded-xl bg-[#f0eee7]" /><div className="h-20 animate-pulse rounded-xl bg-[#f0eee7]" /></section>;
}

function RecordRow({ record, definition, workflow, pendingId, onEdit, onDelete, onAdvance }: { record: LaboRecord; definition: LaboRecordFeatureDefinition; workflow?: LaboRecordFeatureDefinition['workflow']; pendingId: string; onEdit: () => void; onDelete: () => void; onAdvance: () => void }) {
  const stageIndex = workflow ? workflow.stages.findIndex(stage => stage.id === record.status) : -1;
  const nextStage = workflow?.stages[(stageIndex < 0 ? 0 : stageIndex + 1)];
  return <article data-testid={`row-labo-record-${record.id}`} className="p-5 transition hover:bg-[#faf9f5]"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-[.12em] text-[#9aa09e]">{record.id}</span>{workflow && <span className="rounded-full bg-[#e7f1ed] px-2 py-1 text-[10px] font-bold text-[#286c73]">{workflow.stages[stageIndex]?.label ?? workflow.stages[0]?.label ?? 'Initial'}</span>}</div><div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">{definition.fields.slice(0, 4).map(field => <div key={field.id} className="min-w-0"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#9aa09e]">{fieldIcon(field.type)} {field.label}</p><p data-testid={`text-record-value-${record.id}-${field.id}`} className="mt-1 truncate text-sm font-semibold text-[#46535a]">{formatValue(record.data[field.id], field)}</p></div>)}</div></div><div className="flex shrink-0 flex-wrap items-center gap-2 lg:max-w-[290px] lg:justify-end"><button type="button" data-testid={`button-edit-record-${record.id}`} onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dedbd3] px-2.5 py-2 text-xs font-bold text-[#5d696e] hover:border-[#b9c8c4] hover:text-[#286c73]"><Pencil size={13} /> Modifier</button><button type="button" data-testid={`button-delete-record-${record.id}`} onClick={onDelete} disabled={pendingId === record.id} className="rounded-lg border border-[#ead9d3] p-2 text-[#a86158] hover:bg-[#fbeee9] disabled:opacity-40"><Trash2 size={14} /></button>{nextStage && <button type="button" data-testid={`button-advance-record-${record.id}`} onClick={onAdvance} disabled={pendingId === `transition-${record.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#e7f1ed] px-2.5 py-2 text-xs font-bold text-[#286c73] hover:bg-[#d8eae3] disabled:opacity-45">Avancer <ChevronRight size={14} /></button>}</div></div><p className="mt-4 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.1em] text-[#a0a5a2]"><Clock3 size={12} /> Mis à jour {new Date(record.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p></article>;
}

function WorkflowRail({ definition, records }: { definition: LaboRecordFeatureDefinition; records: LaboRecord[] }) {
  if (!definition.workflow) return <aside className="rounded-[22px] border border-[#dedbd3] bg-[#e9eee9] p-5"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#6f807c]">Configuration</p><h2 className="mt-3 text-lg font-black">Fiche libre</h2><p className="mt-2 text-xs leading-5 text-[#74817e]">Les fiches sont éditables sans séquence obligatoire. Les données restent persistantes dans LABO.</p><div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#286c73]"><Check size={15} /> {records.length} fiche{records.length > 1 ? 's' : ''} suivie{records.length > 1 ? 's' : ''}</div></aside>;
  return <aside className="rounded-[22px] border border-[#dedbd3] bg-[#e9eee9] p-5"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#6f807c]">Séquence active</p><h2 className="mt-3 text-lg font-black">Progression</h2><div className="mt-5 space-y-0">{definition.workflow.stages.map((stage, index) => <div key={stage.id} className="flex gap-3"><div className="flex flex-col items-center"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d4e6de] font-mono text-[10px] font-bold text-[#286c73]">{index + 1}</span>{index < definition.workflow!.stages.length - 1 && <span className="h-7 w-px bg-[#c4d4ce]" />}</div><div className="pb-5"><p className="text-sm font-bold text-[#4c5d60]">{stage.label}</p><p className="mt-1 text-[11px] leading-4 text-[#7c8986]">{stage.requiredFieldIds.length ? `${stage.requiredFieldIds.length} champ${stage.requiredFieldIds.length > 1 ? 's' : ''} requis` : 'Aucun champ requis'}</p></div></div>)}</div></aside>;
}

function RecordForm({ definition, data, setData, editing, errors, actionError, pending, onClose, onSave }: { definition: LaboRecordFeatureDefinition; data: LaboRecord['data']; setData: (data: LaboRecord['data']) => void; editing: LaboRecord | null; errors: string[]; actionError: string; pending: boolean; onClose: () => void; onSave: () => void }) {
  return <div data-testid="dialog-labo-record" className="fixed inset-0 z-50 flex items-end justify-center bg-[#26323a]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"><section className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[24px] border border-[#dedbd3] bg-[#fbfaf7] shadow-2xl sm:rounded-[24px]"><header className="flex items-start justify-between border-b border-[#e5e1d8] px-5 py-5 sm:px-7"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#286c73]">LABO / registre</p><h2 className="mt-2 text-2xl font-black tracking-[-.04em]">{editing ? 'Modifier la fiche' : 'Nouvelle fiche'}</h2></div><button type="button" data-testid="button-close-record-form" onClick={onClose} className="rounded-xl p-2 text-[#7c8789] hover:bg-[#f0eee7]"><X size={18} /></button></header><div className="space-y-4 px-5 py-5 sm:px-7">{definition.fields.map((field, index) => <label key={field.id} className="block text-xs font-bold text-[#5f6b70]"><span className="flex items-center gap-2">{fieldIcon(field.type)} {field.label}{field.required && <span className="text-[#a86158]">*</span>}</span>{field.type === 'select' ? <select data-testid={`input-record-${field.id}`} value={String(data[field.id] ?? '')} onChange={event => setData({ ...data, [field.id]: event.target.value })} className={`${inputClass} mt-1.5`}><option value="">Sélectionner</option>{(field.options ?? []).map(option => <option key={option} value={option}>{option}</option>)}</select> : field.type === 'boolean' ? <span className="mt-1.5 flex items-center gap-3 rounded-xl border border-[#d8d6ce] bg-[#f7f5ef] px-3.5 py-2.5 text-sm font-normal"><input data-testid={`input-record-${field.id}`} type="checkbox" checked={Boolean(data[field.id])} onChange={event => setData({ ...data, [field.id]: event.target.checked })} className="h-4 w-4 accent-[#286c73]" /> Oui</span> : <input data-testid={`input-record-${field.id}`} type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'} value={String(data[field.id] ?? '')} onChange={event => setData({ ...data, [field.id]: event.target.value })} className={`${inputClass} mt-1.5`} />}</label>)}{errors.length > 0 && <div data-testid="status-record-validation" className="rounded-xl border border-[#e7c9bf] bg-[#fbefeb] p-3 text-xs leading-5 text-[#9a554b]"><strong>Vérifiez les champs</strong><ul className="mt-1 list-disc pl-5">{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}{actionError && <div className="rounded-xl border border-[#e7c9bf] bg-[#fbefeb] p-3 text-xs text-[#9a554b]">{actionError}</div>}</div><footer className="flex justify-end gap-2 border-t border-[#e5e1d8] px-5 py-4 sm:px-7"><button type="button" data-testid="button-cancel-record" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-[#687479] hover:bg-[#f0eee7]">Annuler</button><button type="button" data-testid="button-save-record" onClick={onSave} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-[#286c73] px-4 py-2.5 text-xs font-bold text-[#f8faf5] disabled:opacity-50">{pending ? 'Enregistrement…' : <><Check size={14} /> Enregistrer</>}</button></footer></section></div>;
}