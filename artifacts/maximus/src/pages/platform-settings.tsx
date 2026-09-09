import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Clock3, Copy, KeyRound, RefreshCw, Settings2, ShieldCheck, Trash2 } from 'lucide-react';
import {
  platformSettingsApi,
  type DiagnosticTokenSummary,
  type IssuedDiagnosticToken,
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
  const [diagnosticTokens, setDiagnosticTokens] = useState<DiagnosticTokenSummary[]>([]);
  const [diagnosticLabel, setDiagnosticLabel] = useState('Accès diagnostic');
  const [diagnosticExpiry, setDiagnosticExpiry] = useState('24');
  const [issuedDiagnosticToken, setIssuedDiagnosticToken] = useState<IssuedDiagnosticToken | null>(null);
  const [issuingDiagnosticToken, setIssuingDiagnosticToken] = useState(false);
  const [revokingDiagnosticTokenId, setRevokingDiagnosticTokenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [nextPolicy, tokenResponse] = await Promise.all([
        platformSettingsApi.sellerWalletMaturity(),
        platformSettingsApi.diagnosticTokens(),
      ]);
      setPolicy(nextPolicy);
      setMode(nextPolicy.mode);
      setValue(nextPolicy.value === null ? '' : String(nextPolicy.value));
      setDiagnosticTokens(tokenResponse.tokens);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les paramètres plateforme.');
    } finally {
      setLoading(false);
    }
  };

  const issueDiagnosticToken = async (event: FormEvent) => {
    event.preventDefault();
    const expiresInHours = Number(diagnosticExpiry);
    if (!diagnosticLabel.trim() || !Number.isInteger(expiresInHours) || expiresInHours < 1 || expiresInHours > 168) {
      setError('Indiquez un nom et une durée comprise entre 1 et 168 heures.');
      return;
    }

    setIssuingDiagnosticToken(true);
    try {
      const issued = await platformSettingsApi.createDiagnosticToken({
        label: diagnosticLabel.trim(),
        expiresInHours,
      });
      setIssuedDiagnosticToken(issued);
      const tokenResponse = await platformSettingsApi.diagnosticTokens();
      setDiagnosticTokens(tokenResponse.tokens);
      setNotice('Le token a été généré. Copiez-le maintenant : il ne sera plus affiché ensuite.');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le token n’a pas pu être généré.');
    } finally {
      setIssuingDiagnosticToken(false);
    }
  };

  const copyDiagnosticToken = async () => {
    if (!issuedDiagnosticToken) return;
    try {
      await navigator.clipboard.writeText(issuedDiagnosticToken.token);
      setNotice('Token copié dans le presse-papiers.');
    } catch {
      setError('La copie automatique a échoué. Sélectionnez le token et copiez-le manuellement.');
    }
  };

  const revokeDiagnosticToken = async (token: DiagnosticTokenSummary) => {
    if (token.status === 'REVOKED' || !window.confirm(`Révoquer l’accès « ${token.label} » ?`)) return;
    setRevokingDiagnosticTokenId(token.id);
    try {
      await platformSettingsApi.revokeDiagnosticToken(token.id);
      setDiagnosticTokens(current => current.map(item => item.id === token.id ? { ...item, status: 'REVOKED' } : item));
      setNotice('L’accès de diagnostic a été révoqué.');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'L’accès de diagnostic n’a pas pu être révoqué.');
    } finally {
      setRevokingDiagnosticTokenId(null);
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

      <section className="card-surface rounded-2xl border p-5 sm:p-7" data-testid="diagnostic-access-settings">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--accent)/.2)]">
                <KeyRound size={17} />
              </span>
              <div>
                <h2 className="font-bold">Accès de diagnostic</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Lecture seule de la santé de la production.</p>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Générez un accès temporaire pour consulter les contrôles Laravel, PostgreSQL et les incidents système.
              Il ne permet pas de modifier les données de MAXIMUS.
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
            <AlertTriangle size={14} />
            À partager avec précaution
          </span>
        </div>

        <form onSubmit={issueDiagnosticToken} className="mt-6 grid gap-4 rounded-xl border bg-[hsl(var(--muted)/.25)] p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="block text-sm font-semibold">
            Nom de l’accès
            <input
              value={diagnosticLabel}
              onChange={event => setDiagnosticLabel(event.target.value)}
              className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm font-normal"
              placeholder="Ex. Support production"
              maxLength={120}
            />
          </label>
          <label className="block text-sm font-semibold">
            Expiration
            <select
              value={diagnosticExpiry}
              onChange={event => setDiagnosticExpiry(event.target.value)}
              className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm font-normal"
            >
              <option value="1">1 heure</option>
              <option value="24">24 heures</option>
              <option value="72">3 jours</option>
              <option value="168">7 jours</option>
            </select>
          </label>
          <button type="submit" disabled={issuingDiagnosticToken} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50">
            {issuingDiagnosticToken ? <RefreshCw size={15} className="animate-spin" /> : <KeyRound size={15} />}
            {issuingDiagnosticToken ? 'Génération…' : 'Générer un token'}
          </button>
        </form>

        {issuedDiagnosticToken && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4" role="status">
            <p className="text-sm font-bold text-amber-900">Copiez ce token maintenant</p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              Il sera utilisé avec l’en-tête <code>Authorization: Bearer …</code> et ne sera plus affiché après cette page.
              Expiration : {new Date(issuedDiagnosticToken.expiresAt).toLocaleString('fr-FR')}.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <textarea readOnly value={issuedDiagnosticToken.token} rows={3} className="min-h-20 flex-1 resize-none rounded-lg border border-amber-300 bg-white p-3 font-mono text-xs text-amber-950" />
              <button type="button" onClick={() => void copyDiagnosticToken()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-400 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100">
                <Copy size={15} />
                Copier
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-bold">Accès générés</h3>
          <div className="mt-3 divide-y rounded-xl border">
            {diagnosticTokens.length === 0 ? (
              <p className="p-4 text-sm text-[hsl(var(--muted-foreground))]">Aucun accès de diagnostic généré.</p>
            ) : diagnosticTokens.map(token => (
              <div key={token.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{token.label}</p>
                  <p className="mt-1 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">{token.tokenPrefix}… · expire le {new Date(token.expiresAt).toLocaleString('fr-FR')}</p>
                  {token.lastUsedAt && <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Dernière utilisation : {new Date(token.lastUsedAt).toLocaleString('fr-FR')}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${token.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : token.status === 'EXPIRED' ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                    {token.status === 'ACTIVE' ? 'Actif' : token.status === 'EXPIRED' ? 'Expiré' : 'Révoqué'}
                  </span>
                  {token.status === 'ACTIVE' && <button type="button" onClick={() => void revokeDiagnosticToken(token)} disabled={revokingDiagnosticTokenId === token.id} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">
                    <Trash2 size={14} />
                    Révoquer
                  </button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}