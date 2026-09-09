import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Database,
  Info,
  LockKeyhole,
  MessageSquareText,
  Minus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';

export type MaximusCompanyContext = {
  name: string;
  sector?: string;
  reportingPeriod?: string;
  activeUsers?: number;
  lastSyncLabel?: string;
};

export type MaximusInsightCard = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  value?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'steady';
  source?: string;
  tone?: 'watch' | 'positive' | 'neutral';
  proposedAction?: {
    label: string;
    detail: string;
    impact?: string;
  };
};

type ConversationEntry = {
  id: string;
  kind: 'user' | 'assistant';
  text: string;
};

type MaximusAssistantProps = {
  companyContext: MaximusCompanyContext;
  insightCards: MaximusInsightCard[];
  onAsk: (question: string) => void | string | Promise<void | string>;
  loading?: boolean;
  initialQuestion?: string;
};

const suggestedPrompts = [
  'Qu’est-ce qui mérite mon attention cette semaine ?',
  'Quels indicateurs ont le plus changé sur la période ?',
  'Où dois-je vérifier les données avant de décider ?',
];

function TrendMark({ direction }: { direction?: MaximusInsightCard['trendDirection'] }) {
  if (direction === 'up') return <TrendingUp size={14} aria-hidden="true" />;
  if (direction === 'down') return <TrendingDown size={14} aria-hidden="true" />;
  return <Minus size={14} aria-hidden="true" />;
}

function toneClasses(tone: MaximusInsightCard['tone']) {
  if (tone === 'watch') {
    return {
      rail: 'bg-amber-500',
      icon: 'bg-amber-100 text-amber-800',
      tag: 'border-amber-200 bg-amber-50 text-amber-800',
    };
  }
  if (tone === 'positive') {
    return {
      rail: 'bg-emerald-600',
      icon: 'bg-emerald-100 text-emerald-800',
      tag: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    };
  }
  return {
    rail: 'bg-slate-400',
    icon: 'bg-slate-100 text-slate-700',
    tag: 'border-slate-200 bg-slate-50 text-slate-700',
  };
}

function formatUserCount(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat('fr-FR').format(value);
}

function InsightCard({
  insight,
  actionState,
  onActionSelect,
}: {
  insight: MaximusInsightCard;
  actionState: 'idle' | 'selected';
  onActionSelect: (id: string) => void;
}) {
  const classes = toneClasses(insight.tone);
  const hasTrend = Boolean(insight.trend);

  return (
    <article className="card-surface relative overflow-hidden rounded-2xl p-5">
      <div className={`absolute inset-y-0 left-0 w-1 ${classes.rail}`} aria-hidden="true" />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-3">
          <p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
            {insight.eyebrow}
          </p>
          <span className={`rounded-lg p-2 ${classes.icon}`} aria-hidden="true">
            {insight.tone === 'watch' ? <CircleAlert size={15} /> : insight.tone === 'positive' ? <CircleCheck size={15} /> : <Info size={15} />}
          </span>
        </div>
        <h3 className="mt-4 max-w-[24rem] text-lg font-bold leading-tight tracking-[-.025em]">
          {insight.title}
        </h3>
        {insight.value && (
          <p className="mt-3 text-3xl font-black tracking-[-.05em] text-[hsl(var(--foreground))]">
            {insight.value}
          </p>
        )}
        <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {insight.summary}
        </p>
        {(hasTrend || insight.source) && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {hasTrend && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${classes.tag}`}>
                <TrendMark direction={insight.trendDirection} />
                {insight.trend}
              </span>
            )}
            {insight.source && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                <Database size={12} />
                {insight.source}
              </span>
            )}
          </div>
        )}
        {insight.proposedAction && (
          <div className="mt-5 border-t border-[hsl(var(--border))] pt-4">
            <div className="flex items-start gap-2">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                  Proposition, jamais exécution
                </p>
                <p className="mt-1 text-sm font-semibold">{insight.proposedAction.label}</p>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  {insight.proposedAction.detail}
                </p>
                {insight.proposedAction.impact && (
                  <p className="mt-2 text-xs font-bold text-[hsl(var(--primary))]">
                    Impact attendu : {insight.proposedAction.impact}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-pressed={actionState === 'selected'}
              onClick={() => onActionSelect(insight.id)}
              className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                actionState === 'selected'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.5)] hover:text-[hsl(var(--primary))]'
              }`}
            >
              {actionState === 'selected' ? <Check size={14} /> : <ArrowUpRight size={14} />}
              {actionState === 'selected' ? 'En attente de validation' : 'Marquer pour validation'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function MaximusAssistantPage({
  companyContext,
  insightCards,
  onAsk,
  loading = false,
  initialQuestion = '',
}: MaximusAssistantProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [error, setError] = useState('');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [showBoundary, setShowBoundary] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setQuestion(initialQuestion);
  }, [initialQuestion]);

  const activeUserLabel = formatUserCount(companyContext.activeUsers);
  const actionCount = useMemo(
    () => insightCards.filter(insight => Boolean(insight.proposedAction)).length,
    [insightCards],
  );
  const selectedAction = insightCards.find(insight => insight.id === selectedActionId)?.proposedAction;

  const ask = async (value = question) => {
    const trimmed = value.trim();
    if (!trimmed || submitting || loading) return;
    setQuestion('');
    setError('');
    setSubmitting(true);
    const entryId = `${Date.now()}`;
    setConversation(current => [...current, { id: `question-${entryId}`, kind: 'user', text: trimmed }]);
    try {
      const response = await Promise.resolve(onAsk(trimmed));
      setConversation(current => [
        ...current,
        {
          id: `answer-${entryId}`,
          kind: 'assistant',
          text: typeof response === 'string'
            ? response
            : 'Question prise en compte. La réponse reste bornée aux données accessibles et aux règles de votre espace. MAXIMUS ne valide ni ne déclenche une action à votre place.',
        },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La question n’a pas pu être transmise. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask();
  };

  return (
    <div className="space-y-6 pb-12" data-testid="maximus-assistant">
      <section className="relative overflow-hidden rounded-2xl border border-[hsl(var(--primary)/.22)] bg-[hsl(var(--card))] shadow-[var(--shadow-soft)]">
        <div className="absolute right-0 top-0 h-48 w-48 translate-x-1/4 -translate-y-1/3 rounded-full border-[22px] border-[hsl(var(--primary)/.08)]" aria-hidden="true" />
        <div className="absolute bottom-0 right-24 h-24 w-24 translate-y-1/2 rounded-full border border-[hsl(var(--primary)/.18)]" aria-hidden="true" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,.8fr)] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary)/.12)] px-3 py-1.5 text-[11px] font-bold text-[hsl(var(--primary))]">
                <Sparkles size={13} />
                Copilote opérationnel
              </span>
              <span className="mono text-[10px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">
                Données autorisées uniquement
              </span>
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-[1.02] tracking-[-.055em] sm:text-5xl">
              Décider avec les bons signaux.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))] sm:text-base">
              Posez une question sur {companyContext.name}. MAXIMUS vous aide à lire la situation, à retrouver les faits et à distinguer clairement ce qui demande une validation humaine.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[hsl(var(--muted-foreground))]">
              {companyContext.sector && (
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                  {companyContext.sector}
                </span>
              )}
              {companyContext.reportingPeriod && (
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                  Période : {companyContext.reportingPeriod}
                </span>
              )}
              {activeUserLabel && (
                <span className="inline-flex items-center gap-2">
                  <UsersRound size={13} />
                  {activeUserLabel} utilisateur{companyContext.activeUsers === 1 ? '' : 's'} actif{companyContext.activeUsers === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.64)] p-4">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-[hsl(var(--primary)/.14)] p-2 text-[hsl(var(--primary))]">
                <LockKeyhole size={16} />
              </span>
              <div>
                <p className="text-sm font-bold">Un cadre explicite</p>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  Il explique ses sources, signale les angles morts et ne décide jamais à votre place.
                </p>
              </div>
            </div>
            {companyContext.lastSyncLabel && (
              <p className="mt-4 border-t border-[hsl(var(--border))] pt-3 text-[11px] text-[hsl(var(--muted-foreground))]">
                Dernière synchronisation : <span className="font-bold text-[hsl(var(--foreground))]">{companyContext.lastSyncLabel}</span>
              </p>
            )}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="relative border-t border-[hsl(var(--border))] bg-[hsl(var(--background)/.48)] p-4 sm:p-5">
          <label htmlFor="assistant-question" className="sr-only">Votre question</label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex min-h-14 flex-1 items-center gap-3 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 shadow-sm focus-within:border-[hsl(var(--primary))] focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/.16)]">
              <MessageSquareText size={18} className="shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
              <textarea
                id="assistant-question"
                value={question}
                onChange={event => setQuestion(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void ask();
                  }
                }}
                rows={1}
                placeholder="Ex. Quels sujets dois-je vérifier avant la clôture ?"
                className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm outline-none placeholder:text-[hsl(var(--muted-foreground)/.7)]"
                disabled={loading || submitting}
              />
            </div>
            <button
              type="submit"
              disabled={!question.trim() || loading || submitting}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-black text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading || submitting ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
              {submitting ? 'Analyse…' : 'Demander'}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-[hsl(var(--muted-foreground))]">
            Entrée pour envoyer · Maj + Entrée pour aller à la ligne
          </p>
        </form>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <CircleAlert size={17} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Impossible de transmettre la question</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
          <button type="button" aria-label="Fermer l’erreur" onClick={() => setError('')} className="rounded p-1 hover:bg-rose-100">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,.82fr)]">
        <section className="card-surface overflow-hidden rounded-2xl" aria-labelledby="assistant-conversation-title">
          <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">Échange</p>
              <h2 id="assistant-conversation-title" className="mt-1 text-lg font-bold">Conversation de travail</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Espace privé
            </span>
          </div>
          <div className="min-h-[270px] p-5">
            {conversation.length === 0 ? (
              <div className="flex min-h-[220px] flex-col justify-center">
                <div className="mx-auto max-w-md text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">
                    <MessageSquareText size={22} />
                  </div>
                  <h3 className="mt-4 text-base font-bold">Commencez par une question utile</h3>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Les réponses s’appuient sur le périmètre visible depuis cet espace. Aucun signal ne sera inventé pour combler une donnée manquante.
                  </p>
                </div>
                <div className="mt-6 grid gap-2 sm:grid-cols-3">
                  {suggestedPrompts.map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        setQuestion(prompt);
                        void ask(prompt);
                      }}
                      disabled={loading || submitting}
                      className="group rounded-xl border border-[hsl(var(--border))] p-3 text-left text-xs leading-5 text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/.5)] hover:bg-[hsl(var(--primary)/.045)] hover:text-[hsl(var(--foreground))] disabled:opacity-50"
                    >
                      <span>{prompt}</span>
                      <ChevronRight size={14} className="mt-2 text-[hsl(var(--primary))] transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {conversation.map(entry => (
                  <div key={entry.id} className={`flex gap-3 ${entry.kind === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {entry.kind === 'assistant' && (
                      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.13)] text-[hsl(var(--primary))]">
                        <Sparkles size={15} />
                      </span>
                    )}
                    <div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${entry.kind === 'user' ? 'rounded-br-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'rounded-bl-md border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)]'}`}>
                      {entry.text}
                    </div>
                  </div>
                ))}
                {(loading || submitting) && (
                  <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
                      <RefreshCw size={14} className="animate-spin" />
                    </span>
                    Lecture du périmètre autorisé…
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="card-surface overflow-hidden rounded-2xl" aria-labelledby="assistant-boundary-title">
          <div className="border-b border-[hsl(var(--border))] p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-[hsl(var(--primary)/.12)] p-2 text-[hsl(var(--primary))]">
                <ShieldCheck size={17} />
              </span>
              <div>
                <p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">Garde-fou</p>
                <h2 id="assistant-boundary-title" className="mt-1 text-base font-bold">Ce que MAXIMUS ne décide pas</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Une recommandation peut accélérer votre travail. Elle ne remplace jamais une approbation, une vérification ou une responsabilité attribuée.
            </p>
          </div>
          <div className="p-5">
            <button
              type="button"
              onClick={() => setShowBoundary(current => !current)}
              aria-expanded={showBoundary}
              className="flex w-full items-center justify-between gap-4 text-left text-xs font-bold text-[hsl(var(--foreground))]"
            >
              <span className="flex items-center gap-2"><Info size={14} className="text-[hsl(var(--primary))]" /> Règles de confirmation</span>
              {showBoundary ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {showBoundary && (
              <ul className="mt-4 space-y-3 border-t border-[hsl(var(--border))] pt-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />Une action est toujours revue dans son module d’origine.</li>
                <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />Les droits de l’utilisateur restent applicables.</li>
                <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />La décision finale reste attribuée à une personne.</li>
              </ul>
            )}
            <div className="mt-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.55)] p-4">
              <p className="text-xs font-bold">Propositions à revoir</p>
              <p className="mt-2 text-2xl font-black tracking-[-.04em]">{actionCount}</p>
              <p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
                MAXIMUS peut les signaler, pas les exécuter.
              </p>
              {selectedAction && (
                <div className="mt-4 border-t border-[hsl(var(--border))] pt-3 text-xs text-emerald-800">
                  <p className="font-bold">Proposition marquée pour validation</p>
                  <p className="mt-1 text-emerald-700">{selectedAction.label}</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <section aria-labelledby="assistant-insights-title">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">Signaux observés</p>
            <h2 id="assistant-insights-title" className="mt-1 text-xl font-bold tracking-[-.03em]">À regarder maintenant</h2>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Lecture basée sur les données disponibles dans votre périmètre.</p>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map(item => <div key={item} className="card-surface h-64 animate-pulse rounded-2xl bg-[hsl(var(--muted)/.55)]" />)}
          </div>
        ) : insightCards.length === 0 ? (
          <div className="card-surface rounded-2xl border-dashed p-8 text-center">
            <Database size={21} className="mx-auto text-[hsl(var(--muted-foreground))]" />
            <h3 className="mt-3 text-sm font-bold">Aucun signal à afficher</h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              Les indicateurs apparaîtront dès qu’une donnée exploitable sera disponible pour cette période.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {insightCards.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                actionState={selectedActionId === insight.id ? 'selected' : 'idle'}
                onActionSelect={id => setSelectedActionId(current => current === id ? null : id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default MaximusAssistantPage;