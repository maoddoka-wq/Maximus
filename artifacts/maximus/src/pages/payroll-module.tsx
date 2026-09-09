import { useEffect, useMemo, useState } from 'react';
import { Banknote, Check, ChevronRight, ClipboardCheck, CreditCard, History, Plus, RefreshCw, ShieldCheck, Trash2, UsersRound, WalletCards, X } from 'lucide-react';
import { createPayrollApi, type PayrollBatch, type PayrollBootstrap } from '@/lib/payroll-api';

const money = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' FCFA';
const dateLabel = (value: string) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : '—';

function Button({ children, onClick, primary = false, disabled = false, danger = false }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; danger?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`app-action inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${primary ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90' : danger ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'border bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]'}`}>{children}</button>;
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block text-xs font-bold">{label}<input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm font-normal outline-none focus:border-[hsl(var(--primary))]" /></label>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px] font-bold">{children}</span>;
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="surface-panel card-surface overflow-hidden rounded-2xl"><div className="section-heading flex items-center justify-between border-b p-5"><h2 className="font-bold">{title}</h2>{action}</div><div className="p-5">{children}</div></section>;
}

export default function PayrollModulePage({ companyId: _companyId, employees = [], canCreate, canModify, preview = false }: { companyId: string; employees?: { id: string; firstName: string; lastName: string }[]; canCreate: boolean; canModify: boolean; preview?: boolean }) {
  const api = useMemo(() => createPayrollApi(), []);
  const [data, setData] = useState<PayrollBootstrap | null>(null);
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showBeneficiary, setShowBeneficiary] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [topupAmount, setTopupAmount] = useState('');
  const [batchPeriod, setBatchPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [beneficiaryForm, setBeneficiaryForm] = useState({ employeeId: '', fullName: '', mobile: '', accountNumber: '', monthlySalary: '', paymentDay: '28' });
  const refresh = async () => {
    if (preview) { setData({ wallet: { currency: 'XOF', availableBalance: 0, reservedBalance: 0, totalFunded: 0 }, beneficiaries: [], batches: [], items: [], topups: [] }); setLoading(false); return; }
    setLoading(true);
    try { setData(await api.bootstrap()); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de charger la Paie.'); } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [api, preview]);

  const activeBatch = data?.batches[0];
  const selectedTotal = useMemo(() => data?.beneficiaries.filter(item => selected.includes(item.id)).reduce((sum, item) => sum + item.monthlySalary, 0) ?? 0, [data, selected]);
  const mutate = async (work: () => Promise<unknown>, message: string) => { try { await work(); setNotice(message); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Action impossible.'); } };
  const createBeneficiary = async () => {
    if (!beneficiaryForm.fullName || !beneficiaryForm.mobile || !beneficiaryForm.accountNumber || Number(beneficiaryForm.monthlySalary) <= 0) return setError('Complétez le nom, le numéro, le compte et le salaire.');
    await mutate(() => api.createBeneficiary({ employeeId: beneficiaryForm.employeeId || null, fullName: beneficiaryForm.fullName, mobile: beneficiaryForm.mobile, accountNumber: beneficiaryForm.accountNumber, provider: 'WAVE', monthlySalary: Number(beneficiaryForm.monthlySalary), paymentDay: Number(beneficiaryForm.paymentDay) }), 'Bénéficiaire enregistré.');
    setBeneficiaryForm({ employeeId: '', fullName: '', mobile: '', accountNumber: '', monthlySalary: '', paymentDay: '28' }); setShowBeneficiary(false);
  };
  const createBatch = async () => { if (!selected.length) return setError('Sélectionnez au moins un bénéficiaire.'); await mutate(() => api.createBatch({ period: batchPeriod, paymentDate, beneficiaryIds: selected }), 'Paie préparée.'); setSelected([]); };
  const topup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount < 1000) return setError('La recharge minimale est de 1 000 FCFA.');
    try { const result = await api.topup(amount, `payroll-topup-${Date.now()}`); setNotice('Checkout DiamanoPay ouvert. Confirmez le paiement pour créditer le solde.'); if (result.topup.checkoutUrl) window.open(result.topup.checkoutUrl, '_blank', 'noopener,noreferrer'); setTopupAmount(''); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Recharge impossible.'); }
  };
  const statusLabel: Record<string, string> = { DRAFT: 'Brouillon', PENDING_APPROVAL: 'À valider', APPROVED: 'Validée', PROCESSING: 'Virements en cours', COMPLETED: 'Terminée', PARTIAL: 'Partielle', FAILED: 'Échouée' };
  if (loading) return <div className="card-surface rounded-2xl p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Chargement du module Paie…</div>;
  if (!data) return <div className="card-surface rounded-2xl p-10 text-center text-sm text-red-700">{error || 'Module Paie indisponible.'}</div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow">Module Paie</p><h1 className="mt-1 text-2xl font-bold">Préparer et sécuriser les salaires</h1><p className="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">Les bénéficiaires, validations, recharges et virements sont suivis côté serveur.</p></div>
      <Button onClick={() => void refresh()}><RefreshCw size={15} />Actualiser</Button>
    </div>
    {(error || notice) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}<button type="button" className="float-right font-bold" onClick={() => { setError(''); setNotice(''); }}>×</button></div>}
    <div className="grid gap-4 md:grid-cols-3">
      {([
        { Icon: WalletCards, label: 'Solde disponible', value: money(data.wallet.availableBalance) },
        { Icon: UsersRound, label: 'Bénéficiaires actifs', value: String(data.beneficiaries.length) },
        { Icon: ClipboardCheck, label: 'Dernière paie', value: activeBatch ? statusLabel[activeBatch.status] ?? activeBatch.status : 'Aucune' },
      ] as const).map(({ Icon, label, value }) => <div key={label} className="card-surface rounded-2xl p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-[hsl(var(--primary)/.1)] p-2 text-[hsl(var(--primary))]"><Icon size={18} /></span><span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">{label}</span></div><p className="mt-4 text-xl font-bold">{value}</p></div>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
      <Panel title="Bénéficiaires" action={canCreate && !preview ? <Button primary onClick={() => setShowBeneficiary(true)}><Plus size={15} />Ajouter</Button> : null}>
        {showBeneficiary && <div className="mb-5 rounded-xl border bg-[hsl(var(--muted)/.35)] p-4"><div className="mb-4 flex items-center justify-between"><strong>Nouveau bénéficiaire</strong><button type="button" onClick={() => setShowBeneficiary(false)}><X size={17} /></button></div><div className="grid gap-3 md:grid-cols-2"><label className="block text-xs font-bold">Employé existant<select value={beneficiaryForm.employeeId} onChange={event => { const employee = employees.find(item => item.id === event.target.value); setBeneficiaryForm({ ...beneficiaryForm, employeeId: event.target.value, fullName: employee ? `${employee.firstName} ${employee.lastName}` : beneficiaryForm.fullName }); }} className="mt-1.5 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm font-normal outline-none focus:border-[hsl(var(--primary))]"><option value="">Saisie libre</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label><Field label="Nom complet" value={beneficiaryForm.fullName} onChange={value => setBeneficiaryForm({ ...beneficiaryForm, fullName: value })} /><Field label="Numéro Wave" value={beneficiaryForm.mobile} onChange={value => setBeneficiaryForm({ ...beneficiaryForm, mobile: value })} placeholder="+221…" /><Field label="Numéro de compte" value={beneficiaryForm.accountNumber} onChange={value => setBeneficiaryForm({ ...beneficiaryForm, accountNumber: value })} /><Field label="Salaire mensuel (FCFA)" value={beneficiaryForm.monthlySalary} onChange={value => setBeneficiaryForm({ ...beneficiaryForm, monthlySalary: value })} type="number" /><Field label="Jour de paiement" value={beneficiaryForm.paymentDay} onChange={value => setBeneficiaryForm({ ...beneficiaryForm, paymentDay: value })} type="number" /></div><div className="mt-4 flex justify-end"><Button primary onClick={() => void createBeneficiary()}>Enregistrer</Button></div></div>}
        {data.beneficiaries.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucun bénéficiaire enregistré.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-[hsl(var(--muted-foreground))]"><th className="pb-3 pr-3">Bénéficiaire</th><th className="pb-3 pr-3">Compte</th><th className="pb-3 pr-3">Salaire</th><th className="pb-3 pr-3">Paiement</th><th className="pb-3"></th></tr></thead><tbody>{data.beneficiaries.map(item => <tr key={item.id} className="border-b last:border-0"><td className="py-3 pr-3"><div className="font-bold">{item.fullName}</div><div className="text-xs text-[hsl(var(--muted-foreground))]">{item.mobile}</div></td><td className="py-3 pr-3 font-mono text-xs">{item.accountNumberMasked}</td><td className="py-3 pr-3 font-semibold">{money(item.monthlySalary)}</td><td className="py-3 pr-3">Le {item.paymentDay}</td><td className="py-3 text-right">{canModify && !preview && <Button danger onClick={() => void mutate(() => api.archiveBeneficiary(item.id), 'Bénéficiaire archivé.')}><Trash2 size={14} /></Button>}</td></tr>)}</tbody></table></div>}
      </Panel>
      <Panel title="Solde de paie" action={<Banknote size={18} className="text-[hsl(var(--primary))]" />}><p className="text-3xl font-bold">{money(data.wallet.availableBalance)}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Réservé : {money(data.wallet.reservedBalance)}</p><div className="mt-5 flex gap-2"><input value={topupAmount} onChange={event => setTopupAmount(event.target.value)} type="number" min="1000" placeholder="Montant FCFA" className="min-w-0 flex-1 rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm outline-none" /><Button primary disabled={!canModify || preview} onClick={() => void topup()}><CreditCard size={15} />Recharger</Button></div><p className="mt-3 text-[11px] text-[hsl(var(--muted-foreground))]">Le solde est crédité uniquement après confirmation du checkout DiamanoPay.</p></Panel>
    </div>
    <Panel title="Préparer une paie" action={<ShieldCheck size={18} className="text-[hsl(var(--primary))]" />}>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"><Field label="Période" value={batchPeriod} onChange={setBatchPeriod} type="month" /><Field label="Date de paiement" value={paymentDate} onChange={setPaymentDate} type="date" /><div className="flex items-end pb-1 text-sm font-bold">{selected.length} bénéficiaire(s) · {money(selectedTotal)}</div><div className="flex items-end"><Button primary disabled={!canCreate || preview || !selected.length} onClick={() => void createBatch()}><Plus size={15} />Préparer</Button></div></div>
      <div className="mt-5 grid gap-2 md:grid-cols-2">{data.beneficiaries.map(item => <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm hover:bg-[hsl(var(--muted)/.35)]"><input type="checkbox" checked={selected.includes(item.id)} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} /><span className="flex-1"><strong>{item.fullName}</strong><span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">{money(item.monthlySalary)}</span></span><ChevronRight size={15} className="text-[hsl(var(--muted-foreground))]" /></label>)}</div>
    </Panel>
    <Panel title="Historique des paies" action={<History size={18} className="text-[hsl(var(--primary))]" />}>
      {data.batches.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune paie préparée.</div> : <div className="space-y-3">{data.batches.map(batch => <BatchRow key={batch.id} batch={batch} canModify={canModify && !preview} onSubmit={() => void mutate(() => api.submitBatch(batch.id), 'Paie envoyée pour validation.')} onApprove={() => void mutate(() => api.approveBatch(batch.id), 'Paie validée.')} onPayout={() => void mutate(() => api.payoutBatch(batch.id), 'Virements lancés.')} statusLabel={statusLabel} />)}</div>}
    </Panel>
  </div>;
}

function BatchRow({ batch, canModify, onSubmit, onApprove, onPayout, statusLabel }: { batch: PayrollBatch; canModify: boolean; onSubmit: () => void; onApprove: () => void; onPayout: () => void; statusLabel: Record<string, string> }) {
  return <div className="flex flex-wrap items-center gap-4 rounded-xl border p-4"><div className="min-w-[150px] flex-1"><div className="font-bold">{batch.period}</div><div className="text-xs text-[hsl(var(--muted-foreground))]">{batch.itemCount} bénéficiaire(s) · paiement le {dateLabel(batch.paymentDate)}</div></div><div className="font-semibold">{money(batch.totalAmount)}</div><Badge>{statusLabel[batch.status] ?? batch.status}</Badge><div className="flex flex-wrap gap-2">{canModify && batch.status === 'DRAFT' && <Button onClick={onSubmit}>Soumettre</Button>}{canModify && batch.status === 'PENDING_APPROVAL' && <Button primary onClick={onApprove}><Check size={14} />Valider</Button>}{canModify && batch.status === 'APPROVED' && <Button primary onClick={onPayout}><CreditCard size={14} />Virer</Button>}</div></div>;
}