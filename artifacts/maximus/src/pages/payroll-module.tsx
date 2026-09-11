import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Banknote,
  Check,
  ClipboardCheck,
  CreditCard,
  History,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import { createPayrollApi, type PayrollBatch, type PayrollBeneficiary, type PayrollBootstrap } from '@/lib/payroll-api';
import { showAppToast } from '@/hooks/use-toast';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { normalizePayrollFeatureId, normalizePayrollFeatureIds, type PayrollFeatureId } from '@/lib/payroll-features';

const payrollFeatureIds: PayrollFeatureId[] = [
  'tableau-de-bord',
  'bénéficiaires',
  'préparer-une-paie',
  'validation',
  'virements',
  'solde-de-paie',
  'historique',
];

const featureCopy: Record<PayrollFeatureId, { eyebrow: string; title: string; description: string }> = {
  'tableau-de-bord': {
    eyebrow: 'Vue d’ensemble Paie',
    title: 'Piloter la paie de l’entreprise',
    description: 'Suivez le solde, les bénéficiaires et les paies qui attendent une action.',
  },
  'bénéficiaires': {
    eyebrow: 'Référentiel Paie',
    title: 'Gérer les bénéficiaires',
    description: 'Enregistrez les collaborateurs à payer et leurs coordonnées de versement.',
  },
  'préparer-une-paie': {
    eyebrow: 'Cycle de paie',
    title: 'Préparer une paie',
    description: 'Choisissez une période, les bénéficiaires et la date de paiement pour créer un brouillon.',
  },
  validation: {
    eyebrow: 'Contrôle Paie',
    title: 'Valider les paies',
    description: 'Vérifiez les paies soumises avant d’autoriser leur mise en paiement.',
  },
  virements: {
    eyebrow: 'Exécution Paie',
    title: 'Lancer les virements',
    description: 'Lancez les paiements approuvés et suivez le résultat de chaque bénéficiaire.',
  },
  'solde-de-paie': {
    eyebrow: 'Financement Paie',
    title: 'Gérer le solde de paie',
    description: 'Consultez les fonds disponibles et rechargez le portefeuille de l’entreprise.',
  },
  historique: {
    eyebrow: 'Traçabilité Paie',
    title: 'Consulter l’historique',
    description: 'Retrouvez les paies préparées, validées et exécutées avec leur détail.',
  },
};

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' FCFA';

const dateLabel = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
    : '—';

const statusLabel: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_APPROVAL: 'À valider',
  APPROVED: 'Validée',
  PROCESSING: 'Virements en cours',
  COMPLETED: 'Terminée',
  PARTIAL: 'Partielle',
  FAILED: 'Échouée',
};

const itemStatusLabel: Record<string, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours',
  SUCCEEDED: 'Payé',
  FAILED: 'Échec',
};

function Button({
  children,
  onClick,
  primary = false,
  disabled = false,
  danger = false,
  loading = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`app-action inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90'
          : danger
            ? 'border border-red-200 text-red-700 hover:bg-red-50'
            : 'border bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]'
      }`}
    >
      {loading && <RefreshCw size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-bold">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm font-normal outline-none focus:border-[hsl(var(--primary))]"
      />
    </label>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px] font-bold">{children}</span>;
}

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="surface-panel card-surface overflow-hidden rounded-2xl">
      <div className="section-heading flex items-center justify-between border-b p-5">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyList({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">{children}</div>;
}

function BatchSummary({
  batch,
  action,
}: {
  batch: PayrollBatch;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
      <div className="min-w-[160px] flex-1">
        <div className="font-bold">{batch.period}</div>
        <div className="text-xs text-[hsl(var(--muted-foreground))]">
          {batch.itemCount} bénéficiaire(s) · paiement le {dateLabel(batch.paymentDate)}
        </div>
      </div>
      <div className="font-semibold">{money(batch.totalAmount)}</div>
      <Badge>{statusLabel[batch.status] ?? batch.status}</Badge>
      {action}
    </div>
  );
}

function BeneficiaryForm({
  employees,
  form,
  editing,
  onChange,
  onSave,
  onCancel,
  loading,
}: {
  employees: { id: string; firstName: string; lastName: string }[];
  form: { employeeId: string; fullName: string; mobile: string; accountNumber: string; monthlySalary: string; paymentDay: string };
  editing: boolean;
  onChange: (next: typeof form) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="mb-5 rounded-xl border bg-[hsl(var(--muted)/.35)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <strong>{editing ? 'Modifier le bénéficiaire' : 'Nouveau bénéficiaire'}</strong>
        <button type="button" onClick={onCancel} aria-label="Fermer"><X size={17} /></button>
      </div>
      <div className="mb-4 rounded-lg border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.05)] px-3 py-2.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
        <strong className="text-[hsl(var(--foreground))]">Référentiel permanent</strong>
        <span className="ml-1">: cette fiche indique qui doit recevoir la paie et sur quel compte. Le montant et la date exacts se choisissent ensuite dans « Préparer une paie ».</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-bold">
          Employé lié (facultatif)
          <select
            value={form.employeeId}
            onChange={(event) => {
              const employee = employees.find((item) => item.id === event.target.value);
              onChange({
                ...form,
                employeeId: event.target.value,
                fullName: employee ? `${employee.firstName} ${employee.lastName}` : form.fullName,
              });
            }}
            className="mt-1.5 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm font-normal outline-none focus:border-[hsl(var(--primary))]"
          >
            <option value="">Saisie libre</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
          </select>
          <span className="mt-1 block text-[11px] font-normal text-[hsl(var(--muted-foreground))]">Liez la fiche RH si cette personne existe déjà dans l’entreprise.</span>
        </label>
        <div>
          <Field label="Nom complet du bénéficiaire" value={form.fullName} onChange={(value) => onChange({ ...form, fullName: value })} />
          <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Le nom de la personne qui recevra les virements.</p>
        </div>
        <div>
          <Field label="Numéro de réception" value={form.mobile} onChange={(value) => onChange({ ...form, mobile: value })} placeholder="+221…" />
          <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Numéro utilisé pour le versement via le fournisseur configuré.</p>
        </div>
        <Field
           label={editing ? 'Identifiant du compte (facultatif)' : 'Identifiant du compte de réception'}
          value={form.accountNumber}
          onChange={(value) => onChange({ ...form, accountNumber: value })}
           placeholder={editing ? 'Laisser vide pour conserver' : 'Identifiant fourni par le moyen de paiement'}
        />
         <div>
           <Field label="Montant mensuel de référence (FCFA)" value={form.monthlySalary} onChange={(value) => onChange({ ...form, monthlySalary: value })} type="number" />
           <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Suggestion modifiable pour chaque paie.</p>
         </div>
         <div>
           <Field label="Jour habituel de versement" value={form.paymentDay} onChange={(value) => onChange({ ...form, paymentDay: value })} type="number" />
           <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Repère indicatif, pas la date d’une paie.</p>
         </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onCancel}>Annuler</Button>
        <Button primary onClick={onSave} loading={loading}>{editing ? 'Enregistrer les changements' : 'Enregistrer'}</Button>
      </div>
    </div>
  );
}

export default function PayrollModulePage({
  companyId: _companyId,
  employees = [],
  canCreate,
  canModify,
  visibleFeatureIds,
  activeFeatureId = 'tableau-de-bord',
  onNavigate = () => {},
  preview = false,
}: {
  companyId: string;
  employees?: { id: string; firstName: string; lastName: string }[];
  canCreate: boolean;
  canModify: boolean;
  visibleFeatureIds?: string[];
  activeFeatureId?: string;
  onNavigate?: (path: string) => void;
  preview?: boolean;
}) {
  const api = useMemo(() => createPayrollApi(), []);
  const [data, setData] = useState<PayrollBootstrap | null>(null);
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [topupKey, setTopupKey] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [batchPeriod, setBatchPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<string[]>([]);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [showBeneficiary, setShowBeneficiary] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<PayrollBeneficiary | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    employeeId: '',
    fullName: '',
    mobile: '',
    accountNumber: '',
    monthlySalary: '',
    paymentDay: '28',
  });

  const visibleFeatures = useMemo(
    () => new Set(visibleFeatureIds ? normalizePayrollFeatureIds(visibleFeatureIds) : payrollFeatureIds),
    [visibleFeatureIds],
  );
  const activeFeature = normalizePayrollFeatureId(activeFeatureId) ?? 'tableau-de-bord';
  const copy = featureCopy[activeFeature];
  const canSee = (featureId: PayrollFeatureId) => visibleFeatures.has(featureId);
  const canManageBeneficiaries = canCreate && canSee('bénéficiaires');
  const canModifyBeneficiaries = canModify && canSee('bénéficiaires');
  const canPrepare = canCreate && canSee('préparer-une-paie');
  const canValidate = canModify && canSee('validation');
  const canPayout = canModify && canSee('virements');
  const canManageBalance = canModify && canSee('solde-de-paie');

  const refresh = async (silent = false) => {
    if (preview) {
      setData({ wallet: { currency: 'XOF', availableBalance: 0, reservedBalance: 0, totalFunded: 0 }, beneficiaries: [], batches: [], items: [], topups: [] });
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      setData(await api.bootstrap());
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger la Paie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [api, preview]);
  useAutoRefresh(() => refresh(true), { enabled: !preview && Boolean(data), intervalMs: 30_000 });

  const mutate = async (work: () => Promise<unknown>, message: string, action = 'action') => {
    if (pendingAction) return false;
    setPendingAction(action);
    try {
      await work();
      showAppToast(message, 'success');
      // Keep the current screen interactive while the follow-up snapshot
      // catches up with the server.
      void refresh(true);
      return true;
    } catch (cause) {
      showAppToast(cause instanceof Error ? cause.message : 'Action impossible.', 'error');
      return false;
    } finally {
      setPendingAction('');
    }
  };

  const resetBeneficiaryForm = () => {
    setBeneficiaryForm({ employeeId: '', fullName: '', mobile: '', accountNumber: '', monthlySalary: '', paymentDay: '28' });
    setShowBeneficiary(false);
    setEditingBeneficiary(null);
  };

  const openCreateBeneficiary = () => {
    setEditingBeneficiary(null);
    setBeneficiaryForm({ employeeId: '', fullName: '', mobile: '', accountNumber: '', monthlySalary: '', paymentDay: '28' });
    setShowBeneficiary(true);
  };

  const openEditBeneficiary = (beneficiary: PayrollBeneficiary) => {
    setEditingBeneficiary(beneficiary);
    setBeneficiaryForm({
      employeeId: beneficiary.employeeId ?? '',
      fullName: beneficiary.fullName,
      mobile: beneficiary.mobile,
      accountNumber: '',
      monthlySalary: String(beneficiary.monthlySalary),
      paymentDay: String(beneficiary.paymentDay),
    });
    setShowBeneficiary(true);
  };

  const saveBeneficiary = async () => {
    const amount = Number(beneficiaryForm.monthlySalary);
    if (!beneficiaryForm.fullName || !beneficiaryForm.mobile || amount <= 0 || !beneficiaryForm.paymentDay) {
      showAppToast('Complétez le nom, le numéro et le salaire.', 'warning');
      return;
    }
    if (!editingBeneficiary && !beneficiaryForm.accountNumber) {
      showAppToast('Le numéro de compte est obligatoire pour un nouveau bénéficiaire.', 'warning');
      return;
    }
    const input = {
      employeeId: beneficiaryForm.employeeId || null,
      fullName: beneficiaryForm.fullName,
      mobile: beneficiaryForm.mobile,
      accountNumber: beneficiaryForm.accountNumber,
      provider: 'WAVE' as const,
      monthlySalary: amount,
      paymentDay: Number(beneficiaryForm.paymentDay),
    };
    const success = editingBeneficiary
      ? await mutate(() => api.updateBeneficiary(editingBeneficiary.id, {
          ...input,
          ...(beneficiaryForm.accountNumber ? {} : { accountNumber: undefined }),
        }), 'Bénéficiaire mis à jour.', 'beneficiary')
      : await mutate(() => api.createBeneficiary(input), 'Bénéficiaire enregistré.', 'beneficiary');
    if (success) resetBeneficiaryForm();
  };

  const createBatch = async () => {
    if (!selected.length) {
      showAppToast('Sélectionnez au moins un bénéficiaire.', 'warning');
      return;
    }
    const amounts = Object.fromEntries(selected.map((id) => [id, Number(paymentAmounts[id])]));
    if (Object.values(amounts).some((amount) => !Number.isInteger(amount) || amount <= 0)) {
      showAppToast('Chaque bénéficiaire sélectionné doit avoir un montant de paie valide.', 'warning');
      return;
    }
    const success = await mutate(
      () => api.createBatch({ period: batchPeriod, paymentDate, beneficiaryIds: selected, amounts }),
      'Paie préparée. Elle est maintenant disponible pour validation.',
      'batch',
    );
    if (success) {
      setSelected([]);
      setPaymentAmounts({});
    }
  };

  const topup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount < 1000) {
      showAppToast('La recharge minimale est de 1 000 FCFA.', 'warning');
      return;
    }
    if (pendingAction) return;
    const currentKey = topupKey ?? crypto.randomUUID();
    setTopupKey(currentKey);
    setPendingAction('topup');
    try {
      const result = await api.topup(amount, currentKey);
      showAppToast('Checkout DiamanoPay ouvert. Le solde sera crédité après confirmation.', 'info');
      if (result.topup.checkoutUrl) window.open(result.topup.checkoutUrl, '_blank', 'noopener,noreferrer');
      setTopupAmount('');
      void refresh(true);
    } catch (cause) {
      showAppToast(cause instanceof Error ? cause.message : 'Recharge impossible.', 'error');
    } finally {
      setTopupKey(null);
      setPendingAction('');
    }
  };

  if (loading) return <div className="card-surface rounded-2xl p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Chargement du module Paie…</div>;
  if (!data) return <div className="card-surface rounded-2xl p-10 text-center text-sm text-red-700">{error || 'Module Paie indisponible.'}</div>;
  if (visibleFeatureIds && visibleFeatures.size === 0) {
    return <div className="card-surface rounded-2xl p-10 text-center"><p className="font-bold">Aucune fonctionnalité Paie activée</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">L’administrateur de l’entreprise doit sélectionner au moins une fonctionnalité Paie avant d’ouvrir cet espace.</p></div>;
  }

  const pendingBatches = data.batches.filter((batch) => batch.status === 'PENDING_APPROVAL');
  const payableBatches = data.batches.filter((batch) => ['APPROVED', 'PROCESSING', 'PARTIAL', 'COMPLETED', 'FAILED'].includes(batch.status));
  const selectedTotal = data.beneficiaries
    .filter((item) => selected.includes(item.id))
    .reduce((sum, item) => {
      const amount = Number(paymentAmounts[item.id] ?? item.monthlySalary);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  const activeBatch = data.batches[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold">{copy.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">{copy.description}</p>
        </div>
        <Button onClick={() => void refresh()} loading={loading}><RefreshCw size={15} />Actualiser</Button>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}<button type="button" className="float-right font-bold" onClick={() => setError('')}>×</button></div>}

      {activeFeature === 'tableau-de-bord' && (
        <DashboardView
          data={data}
          activeBatch={activeBatch}
          pendingBatches={pendingBatches}
          onNavigate={(feature) => onNavigate(`/entreprise/paie?feature=${feature}`)}
        />
      )}

      {activeFeature === 'bénéficiaires' && canSee('bénéficiaires') && (
        <BeneficiariesView
          data={data}
          employees={employees}
          showForm={showBeneficiary}
          editing={Boolean(editingBeneficiary)}
          form={beneficiaryForm}
          onOpenCreate={openCreateBeneficiary}
          onEdit={openEditBeneficiary}
          onChange={setBeneficiaryForm}
          onSave={() => void saveBeneficiary()}
          onCancel={resetBeneficiaryForm}
          onArchive={(id) => void mutate(() => api.archiveBeneficiary(id), 'Bénéficiaire archivé.', 'beneficiary')}
          canCreate={canManageBeneficiaries && !preview}
          canModify={canModifyBeneficiaries && !preview}
          loading={pendingAction === 'beneficiary'}
        />
      )}

      {activeFeature === 'préparer-une-paie' && canSee('préparer-une-paie') && (
        <PrepareView
          data={data}
          batchPeriod={batchPeriod}
          paymentDate={paymentDate}
          selected={selected}
           paymentAmounts={paymentAmounts}
          selectedTotal={selectedTotal}
          onPeriodChange={setBatchPeriod}
          onPaymentDateChange={setPaymentDate}
           onToggle={(id, checked) => {
             const beneficiary = data.beneficiaries.find((item) => item.id === id);
             setSelected((current) => checked ? [...current, id] : current.filter((item) => item !== id));
             setPaymentAmounts((current) => {
               if (checked) return { ...current, [id]: current[id] ?? String(beneficiary?.monthlySalary ?? '') };
               const next = { ...current };
               delete next[id];
               return next;
             });
           }}
           onAmountChange={(id, value) => setPaymentAmounts((current) => ({ ...current, [id]: value }))}
          onCreate={() => void createBatch()}
          canCreate={canPrepare && !preview}
          loading={pendingAction === 'batch'}
        />
      )}

      {activeFeature === 'validation' && canSee('validation') && (
        <ValidationView
          batches={pendingBatches}
          onApprove={(id) => void mutate(() => api.approveBatch(id), 'Paie validée. Elle est prête pour les virements.', 'validation')}
          canValidate={canValidate && !preview}
          loading={pendingAction === 'validation'}
        />
      )}

      {activeFeature === 'virements' && canSee('virements') && (
        <TransfersView
          batches={payableBatches}
          onPayout={(id) => void mutate(() => api.payoutBatch(id), 'Virements lancés. Les statuts seront actualisés automatiquement.', 'payout')}
          canPayout={canPayout && !preview}
          loading={pendingAction === 'payout'}
        />
      )}

      {activeFeature === 'solde-de-paie' && canSee('solde-de-paie') && (
        <BalanceView
          data={data}
          amount={topupAmount}
          onAmountChange={setTopupAmount}
          onTopup={() => void topup()}
          canManage={canManageBalance && !preview}
          loading={pendingAction === 'topup'}
        />
      )}

      {activeFeature === 'historique' && canSee('historique') && (
        <HistoryView data={data} />
      )}
    </div>
  );
}

function DashboardView({
  data,
  activeBatch,
  pendingBatches,
  onNavigate,
}: {
  data: PayrollBootstrap;
  activeBatch?: PayrollBatch;
  pendingBatches: PayrollBatch[];
  onNavigate: (feature: PayrollFeatureId) => void;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={<WalletCards size={18} />} label="Solde disponible" value={money(data.wallet.availableBalance)} />
        <Metric icon={<UsersRound size={18} />} label="Bénéficiaires actifs" value={String(data.beneficiaries.length)} />
        <Metric icon={<ClipboardCheck size={18} />} label="À valider" value={String(pendingBatches.length)} />
        <Metric icon={<History size={18} />} label="Dernière paie" value={activeBatch ? statusLabel[activeBatch.status] ?? activeBatch.status : 'Aucune'} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Panel title="Prochaines actions" action={<ShieldCheck size={18} className="text-[hsl(var(--primary))]" />}>
          <div className="grid gap-3 md:grid-cols-3">
            <QuickAction title="Ajouter un bénéficiaire" text="Préparez le référentiel de paie." onClick={() => onNavigate('bénéficiaires')} />
            <QuickAction title="Préparer une paie" text="Créez un brouillon pour une période." onClick={() => onNavigate('préparer-une-paie')} />
            <QuickAction title="Voir les validations" text={`${pendingBatches.length} paie(s) en attente.`} onClick={() => onNavigate('validation')} />
          </div>
        </Panel>
        <Panel title="Accès rapides">
          <div className="space-y-2">
            <Button onClick={() => onNavigate('solde-de-paie')}><Banknote size={15} />Gérer le solde</Button>
            <Button onClick={() => onNavigate('historique')}><History size={15} />Voir l’historique</Button>
          </div>
        </Panel>
      </div>
      <Panel title="Dernières paies">
        {data.batches.length === 0 ? <EmptyList>Aucune paie préparée.</EmptyList> : <div className="space-y-3">{data.batches.slice(0, 5).map((batch) => <BatchSummary key={batch.id} batch={batch} />)}</div>}
      </Panel>
    </>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="card-surface rounded-2xl p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-[hsl(var(--primary)/.1)] p-2 text-[hsl(var(--primary))]">{icon}</span><span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">{label}</span></div><p className="mt-4 text-xl font-bold">{value}</p></div>;
}

function QuickAction({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl border p-4 text-left transition hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted)/.35)]"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{text}</span></button>;
}

function BeneficiariesView({
  data,
  employees,
  showForm,
  editing,
  form,
  onOpenCreate,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onArchive,
  canCreate,
  canModify,
  loading,
}: {
  data: PayrollBootstrap;
  employees: { id: string; firstName: string; lastName: string }[];
  showForm: boolean;
  editing: boolean;
  form: { employeeId: string; fullName: string; mobile: string; accountNumber: string; monthlySalary: string; paymentDay: string };
  onOpenCreate: () => void;
  onEdit: (beneficiary: PayrollBeneficiary) => void;
  onChange: (next: typeof form) => void;
  onSave: () => void;
  onCancel: () => void;
  onArchive: (id: string) => void;
  canCreate: boolean;
  canModify: boolean;
  loading: boolean;
}) {
  return (
    <Panel title={`Bénéficiaires actifs (${data.beneficiaries.length})`} action={canCreate ? <Button primary onClick={onOpenCreate}><Plus size={15} />Ajouter</Button> : null}>
      {showForm && <BeneficiaryForm employees={employees} form={form} editing={editing} onChange={onChange} onSave={onSave} onCancel={onCancel} loading={loading} />}
       {data.beneficiaries.length === 0 ? <EmptyList>Aucun bénéficiaire enregistré.</EmptyList> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-[hsl(var(--muted-foreground))]"><th className="pb-3 pr-3">Employé</th><th className="pb-3 pr-3">Réception</th><th className="pb-3 pr-3">Montant proposé</th><th className="pb-3 pr-3">Jour habituel</th><th className="pb-3 text-right">Actions</th></tr></thead><tbody>{data.beneficiaries.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="py-3 pr-3"><div className="font-bold">{item.fullName}</div><div className="text-xs text-[hsl(var(--muted-foreground))]">{item.employeeId ? 'Employé lié' : 'Employé à compléter'}</div></td><td className="py-3 pr-3"><div className="font-medium">{item.mobile}</div><div className="font-mono text-[11px] text-[hsl(var(--muted-foreground))]">{item.accountNumberMasked}</div></td><td className="py-3 pr-3 font-semibold">{money(item.monthlySalary)}</td><td className="py-3 pr-3">Le {item.paymentDay}</td><td className="py-3 text-right"><div className="flex justify-end gap-2">{canModify && <><Button onClick={() => onEdit(item)}><Pencil size={14} /></Button><Button danger onClick={() => onArchive(item.id)}><Trash2 size={14} /></Button></>}</div></td></tr>)}</tbody></table></div>}
    </Panel>
  );
}

function PrepareView({
  data,
  batchPeriod,
  paymentDate,
  selected,
  paymentAmounts,
  selectedTotal,
  onPeriodChange,
  onPaymentDateChange,
  onToggle,
  onAmountChange,
  onCreate,
  canCreate,
  loading,
}: {
  data: PayrollBootstrap;
  batchPeriod: string;
  paymentDate: string;
  selected: string[];
  paymentAmounts: Record<string, string>;
  selectedTotal: number;
  onPeriodChange: (value: string) => void;
  onPaymentDateChange: (value: string) => void;
  onToggle: (id: string, checked: boolean) => void;
  onAmountChange: (id: string, value: string) => void;
  onCreate: () => void;
  canCreate: boolean;
  loading: boolean;
}) {
  return (
    <Panel title="Nouveau brouillon de paie" action={<ShieldCheck size={18} className="text-[hsl(var(--primary))]" />}>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]"><Field label="Période" value={batchPeriod} onChange={onPeriodChange} type="month" /><Field label="Date exacte de paiement" value={paymentDate} onChange={onPaymentDateChange} type="date" /><div className="flex items-end pb-1 text-sm font-bold">{selected.length} bénéficiaire(s) · {money(selectedTotal)}</div><div className="flex items-end"><Button primary disabled={!canCreate || !selected.length} loading={loading} onClick={onCreate}><Plus size={15} />Créer le brouillon</Button></div></div>
      <p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Sélectionnez les employés à payer. Le montant proposé vient de leur fiche, mais vous pouvez l’ajuster pour cette paie avant la validation.</p>
      {data.beneficiaries.length === 0 ? <div className="mt-5"><EmptyList>Ajoutez d’abord un bénéficiaire avant de préparer une paie.</EmptyList></div> : <div className="mt-5 space-y-2">{data.beneficiaries.map((item) => { const isSelected = selected.includes(item.id); return <div key={item.id} className={`rounded-xl border p-3 transition ${isSelected ? 'border-[hsl(var(--primary)/.45)] bg-[hsl(var(--primary)/.04)]' : ''}`}><label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={isSelected} onChange={(event) => onToggle(item.id, event.target.checked)} /><span className="min-w-0 flex-1"><strong className="block">{item.fullName}</strong><span className="text-xs text-[hsl(var(--muted-foreground))]">{item.mobile} · {item.accountNumberMasked}</span></span><span className="hidden text-xs text-[hsl(var(--muted-foreground))] sm:inline">Proposé : {money(item.monthlySalary)}</span></label>{isSelected && <div className="mt-3 max-w-xs pl-7"><Field label="Montant de cette paie (FCFA)" value={paymentAmounts[item.id] ?? ''} onChange={(value) => onAmountChange(item.id, value)} type="number" /></div>}</div>; })}</div>}
    </Panel>
  );
}

function ValidationView({ batches, onApprove, canValidate, loading }: { batches: PayrollBatch[]; onApprove: (id: string) => void; canValidate: boolean; loading: boolean }) {
  return <Panel title={`Paies à valider (${batches.length})`} action={<ClipboardCheck size={18} className="text-[hsl(var(--primary))]" />}>{batches.length === 0 ? <EmptyList>Aucune paie n’attend de validation.</EmptyList> : <div className="space-y-3">{batches.map((batch) => <BatchSummary key={batch.id} batch={batch} action={canValidate ? <Button primary loading={loading} onClick={() => onApprove(batch.id)}><Check size={14} />Valider</Button> : null} />)}</div>}</Panel>;
}

function TransfersView({ batches, onPayout, canPayout, loading }: { batches: PayrollBatch[]; onPayout: (id: string) => void; canPayout: boolean; loading: boolean }) {
  return <Panel title={`Suivi des virements (${batches.length})`} action={<CreditCard size={18} className="text-[hsl(var(--primary))]" />}>{batches.length === 0 ? <EmptyList>Aucune paie validée ou exécutée.</EmptyList> : <div className="space-y-3">{batches.map((batch) => <BatchSummary key={batch.id} batch={batch} action={batch.status === 'APPROVED' && canPayout ? <Button primary loading={loading} onClick={() => onPayout(batch.id)}><CreditCard size={14} />Lancer les virements</Button> : <span className="text-xs text-[hsl(var(--muted-foreground))]">{batch.paidCount} payé(s) · {batch.failedCount} échec(s)</span>} />)}</div>}</Panel>;
}

function BalanceView({ data, amount, onAmountChange, onTopup, canManage, loading }: { data: PayrollBootstrap; amount: string; onAmountChange: (value: string) => void; onTopup: () => void; canManage: boolean; loading: boolean }) {
  return <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><Panel title="Portefeuille de paie" action={<Banknote size={18} className="text-[hsl(var(--primary))]" />}><p className="text-3xl font-bold">{money(data.wallet.availableBalance)}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Disponible · Réservé : {money(data.wallet.reservedBalance)}</p><div className="mt-5 flex gap-2"><input value={amount} onChange={(event) => onAmountChange(event.target.value)} type="number" min="1000" placeholder="Montant FCFA" className="min-w-0 flex-1 rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm outline-none" /><Button primary loading={loading} disabled={!canManage} onClick={onTopup}><CreditCard size={15} />Recharger</Button></div><p className="mt-3 text-[11px] text-[hsl(var(--muted-foreground))]">Le solde est crédité uniquement après confirmation du checkout DiamanoPay.</p></Panel><Panel title="Recharges récentes">{data.topups.length === 0 ? <EmptyList>Aucune recharge enregistrée.</EmptyList> : <div className="space-y-2">{data.topups.map((topup) => <div key={topup.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"><div><strong>{money(topup.amount)}</strong><div className="text-xs text-[hsl(var(--muted-foreground))]">{dateLabel(topup.createdAt)}</div></div><Badge>{topup.status === 'CONFIRMED' ? 'Confirmée' : topup.status === 'FAILED' ? 'Échouée' : 'En attente'}</Badge></div>)}</div>}</Panel></div>;
}

function HistoryView({ data }: { data: PayrollBootstrap }) {
  return <Panel title={`Historique des paies (${data.batches.length})`} action={<History size={18} className="text-[hsl(var(--primary))]" />}>{data.batches.length === 0 ? <EmptyList>Aucune paie dans l’historique.</EmptyList> : <div className="space-y-4">{data.batches.map((batch) => { const items = data.items.filter((item) => item.batchId === batch.id); return <div key={batch.id} className="rounded-xl border p-4"><BatchSummary batch={batch} /><div className="mt-3 grid gap-2 md:grid-cols-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg bg-[hsl(var(--muted)/.35)] px-3 py-2 text-xs"><span><strong>{item.beneficiaryName}</strong><span className="ml-2 text-[hsl(var(--muted-foreground))]">{money(item.amount)}</span></span><Badge>{itemStatusLabel[item.status] ?? item.status}</Badge></div>)}</div></div>; })}</div>}</Panel>;
}