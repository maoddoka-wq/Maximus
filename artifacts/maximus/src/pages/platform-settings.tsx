import { useEffect, useState, type FormEvent } from 'react';
import { Check, Clock3, RefreshCw, Settings2, ShieldCheck } from 'lucide-react';
import {
  platformSettingsApi,
  type SellerWalletMaturityMode,
  type SellerWalletMaturityPolicy,
} from '@/lib/platform-settings-api';

const modeOptions: Array<{
  value: SellerWalletMaturityMode;
  label: string;
  description: string;
}> = [
  {
    value: 'AUTOMATIC',
    label: 'Automatique',
    description: 'Les fonds sont libérés dès que la commande est livrée.',
  },
  {
    value: 'DAYS',
    label: 'Nombre de jours',
    description: 'Les fonds sont libérés après le nombre de jours choisi, ou dès la livraison.',
  },
  {
    value: 'WEEKS',
    label: 'Nombre de semaines',
    description: 'Les fonds sont libérés après le nombre de semaines choisi, ou dès la livraison.',
  },
];

export default function PlatformSettingsPage() {
  const [policy, setPolicy] = useState<SellerWalletMaturityPolicy | null>(null);
  const [mode, setMode] = useState<SellerWalletMaturityMode>('DAYS');
  const [value, setValue] = useState('7');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const nextPolicy = await platformSettingsApi.sellerWalletMaturity();
      setPolicy(nextPolicy);
      setMode(nextPolicy.mode);
      setValue(nextPolicy.value === null ? '' : String(nextPolicy.value));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les paramètres plateforme.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const numericValue = Number(value);
    if (mode !== 'AUTOMATIC' && (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 3650)) {
      setError('Indiquez une valeur entière comprise entre 1 et 3 650.');
      return;
    }

    setSaving(true);
    try {
      const nextPolicy = await platformSettingsApi.updateSellerWalletMaturity({
        mode,
        ...(mode === 'AUTOMATIC' ? {} : { value: numericValue }),
      });
      setPolicy(nextPolicy);
      setValue(nextPolicy.value === null ? '' : String(nextPolicy.value));
      setNotice('La règle de maturation a été enregistrée.');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La règle n’a pas pu être enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card-surface rounded-2xl p-8 text-sm text-[hsl(var(--muted-foreground))]">
        Chargement des paramètres plateforme…
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-up" data-testid="platform-settings-page">
      {error && (
        <div role="alert" className="rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.07)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">
          <Check size={16} />
          {notice}
        </div>
      )}
      <section className="overflow-hidden rounded-2xl border border-[hsl(var(--primary)/.22)] bg-[linear-gradient(135deg,hsl(var(--primary)/.14),hsl(var(--card))_58%)] p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="mono text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">Paramètres plateforme</span>
            <h1 className="mt-2 text-2xl font-bold tracking-[-.04em]">Maturation des fonds vendeurs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Définissez la règle commune appliquée aux ventes e-commerce confirmées par DiamanoPay.
              Une livraison libère toujours les fonds immédiatement.
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">
            <Settings2 size={21} />
          </span>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <form onSubmit={save} className="card-surface rounded-2xl border p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
              <Clock3 size={17} />
            </span>
            <div>
              <h2 className="font-bold">Règle active</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Ce réglage s’applique aux nouveaux paiements confirmés.</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {modeOptions.map(option => (
              <label key={option.value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${mode === option.value ? 'border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.06)]' : 'hover:bg-[hsl(var(--muted)/.45)]'}`}>
                <input
                  type="radio"
                  name="maturity-mode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                  className="mt-1"
                />
                <span>
                  <strong className="block text-sm">{option.label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
          {mode !== 'AUTOMATIC' && (
            <label className="mt-5 block text-sm font-semibold">
              Valeur du délai
              <span className="relative mt-2 block">
                <input
                  data-testid="input-maturity-value"
                  type="number"
                  min="1"
                  max="3650"
                  step="1"
                  value={value}
                  onChange={event => setValue(event.target.value)}
                  className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-3 pr-24 text-sm font-normal"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-[hsl(var(--muted-foreground))]">
                  {mode === 'DAYS' ? 'jour(s)' : 'semaine(s)'}
                </span>
              </span>
            </label>
          )}
          <button type="submit" disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
            {saving ? 'Enregistrement…' : 'Enregistrer la règle'}
          </button>
        </form>

        <aside className="card-surface rounded-2xl border p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--accent)/.2)] text-[hsl(var(--foreground))]">
              <ShieldCheck size={17} />
            </span>
            <div>
              <h2 className="font-bold">Règle actuellement appliquée</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Visible dans les portefeuilles vendeurs.</p>
            </div>
          </div>
          <p className="mt-6 text-2xl font-bold tracking-[-.04em]">{policy?.label ?? 'Non configurée'}</p>
          <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Les paiements restent en attente tant que cette règle n’est pas satisfaite. Les crédits et les libérations restent idempotents et audités.
          </p>
        </aside>
      </div>
    </div>
  );
}