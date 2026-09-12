import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  CircleAlert,
  CircleCheck,
  Database,
  Info,
  LockKeyhole,
  MessageSquareText,
  MoreHorizontal,
  Minus,
  PanelTop,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  type MaximusAssistantAction,
  type MaximusAssistantMessage,
  type MaximusAssistantResponse,
} from '@/lib/maximus-assistant-api';
import { parseMaxiActionRequest } from '@/lib/maxi-actions';

export type MaximusWorkspaceContext = {
  name: string;
  scopeLabel?: string;
  description?: string;
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
  citations?: string[];
  action?: MaximusAssistantAction;
};

type ConversationThread = {
  id: string;
  title: string;
  updatedAt: number;
  entries: ConversationEntry[];
};

type MaximusAssistantProps = {
  workspaceContext: MaximusWorkspaceContext;
  insightCards: MaximusInsightCard[];
  onAsk: (question: string, history?: MaximusAssistantMessage[]) => MaximusAssistantResponse | Promise<MaximusAssistantResponse>;
  onPreviewAction: (action: MaximusAssistantAction) => Promise<MaximusAssistantResponse>;
  onExecuteAction: (action: MaximusAssistantAction) => Promise<MaximusAssistantResponse>;
  loading?: boolean;
  initialQuestion?: string;
};

const suggestedPrompts = [
  'Quels modules et packs sont publiés actuellement ?',
  'Construis une proposition précise pour une nouvelle entreprise selon ses besoins.',
  'Quelles fonctionnalités manquent pour compléter une offre métier ?',
];

const guidedPrompts = [
  {
    label: 'Monter une entreprise',
    prompt: 'Configurer une entreprise « Nom à préciser » secteur : Secteur à préciser modules : module-1, module-2 besoins : besoin métier principal contact : client@example.com',
  },
  {
    label: 'Créer un module',
    prompt: 'Créer le module « Nom du module » avec description : Décrire le besoin métier. fonctionnalités : Fonctionnalité 1, Fonctionnalité 2.',
  },
  {
    label: 'Ajouter une fonctionnalité',
    prompt: 'Créer la fonctionnalité « Nom de la fonctionnalité » dans le module « Nom du module » description : Décrire précisément ce que la fonctionnalité doit couvrir.',
  },
  {
    label: 'Créer un pack',
    prompt: 'Créer le pack « Nom du pack » pour le module « Nom du module » description : Décrire le niveau d’accès. fonctionnalités : Fonctionnalité 1, Fonctionnalité 2.',
  },
  {
    label: 'Monter un secteur',
    prompt: 'Créer le secteur « Nom du secteur » modules : module-1, module-2 fonctionnalités : fonctionnalité-1, fonctionnalité-2.',
  },
  {
    label: 'Modifier une entreprise',
    prompt: 'Modifier l’entreprise « Nom de l’entreprise » responsable : Nouveau responsable email : contact@example.com secteur : Nouveau secteur.',
  },
];

const conversationStorageKey = 'maximus-maxi-conversations';

function createConversationThread(): ConversationThread {
  return {
    id: `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'Nouvelle conversation',
    updatedAt: Date.now(),
    entries: [],
  };
}

function loadConversationThreads(): ConversationThread[] {
  try {
    if (typeof window === 'undefined') return [createConversationThread()];
    const stored = localStorage.getItem(conversationStorageKey);
    if (!stored) return [createConversationThread()];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [createConversationThread()];
    const seenIds = new Set<string>();
    const threads = parsed
      .filter((item): item is ConversationThread => (
        Boolean(item)
        && typeof item === 'object'
        && typeof (item as ConversationThread).id === 'string'
        && typeof (item as ConversationThread).title === 'string'
        && typeof (item as ConversationThread).updatedAt === 'number'
        && Array.isArray((item as ConversationThread).entries)
      ))
      .map(thread => ({
        ...thread,
        entries: thread.entries.filter(entry => (
          Boolean(entry)
          && typeof entry === 'object'
          && typeof entry.id === 'string'
          && (entry.kind === 'user' || entry.kind === 'assistant')
          && typeof entry.text === 'string'
        )),
      }))
      .filter(thread => {
        if (seenIds.has(thread.id)) return false;
        seenIds.add(thread.id);
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20);
    return threads.length > 0 ? threads : [createConversationThread()];
  } catch {
    return [createConversationThread()];
  }
}

function conversationDate(value: number) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

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

function actionDescription(action: MaximusAssistantAction) {
  switch (action.type) {
    case 'create_module':
      return `Créer le module « ${action.name} » dans le brouillon du catalogue.`;
    case 'create_pack':
      return `Créer le pack « ${action.name} » dans « ${action.moduleId} ».`;
    case 'create_feature':
      return `Ajouter la fonctionnalité « ${action.name} » au module « ${action.moduleId} ».`;
    case 'create_sector':
      return `Créer le secteur « ${action.name} » avec ses modules et ses packs.`;
    case 'create_company_plan':
      return `Enregistrer le plan de configuration de « ${action.name} » pour le secteur « ${action.sector} », sans activer l’entreprise.`;
    case 'create_organization_unit':
      return `Créer l’unité « ${action.name} » dans « ${action.companyName} ».`;
    case 'update_company':
      return `Modifier l’entreprise « ${action.companyName ?? action.name} » avec les champs confirmés.`;
    default:
      return 'Préparer une action contrôlée dans le périmètre MAXIMUS.';
  }
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
  workspaceContext,
  insightCards,
  onAsk,
  onPreviewAction,
  onExecuteAction,
  loading = false,
  initialQuestion = '',
}: MaximusAssistantProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [conversationThreads, setConversationThreads] = useState<ConversationThread[]>(loadConversationThreads);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [error, setError] = useState('');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [showBoundary, setShowBoundary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedEntryId, setCopiedEntryId] = useState<string | null>(null);
  const [reactionByEntry, setReactionByEntry] = useState<Record<string, 'up' | 'down' | undefined>>({});
  const [openEntryMenuId, setOpenEntryMenuId] = useState<string | null>(null);
  const confirmingActionIds = useRef(new Set<string>());

  const activeThread = conversationThreads.find(thread => thread.id === activeConversationId)
    ?? conversationThreads[0];
  const conversation = activeThread?.entries ?? [];

  useEffect(() => {
    if (!activeConversationId && conversationThreads[0]) {
      setActiveConversationId(conversationThreads[0].id);
    }
  }, [activeConversationId, conversationThreads]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(conversationStorageKey, JSON.stringify(conversationThreads.slice(0, 20)));
    }
  }, [conversationThreads]);

  useEffect(() => {
    setQuestion(initialQuestion);
  }, [initialQuestion]);

  const actionCount = useMemo(
    () => insightCards.filter(insight => Boolean(insight.proposedAction)).length,
    [insightCards],
  );
  const selectedAction = insightCards.find(insight => insight.id === selectedActionId)?.proposedAction;

  const updateConversation = (
    threadId: string,
    update: (entries: ConversationEntry[]) => ConversationEntry[],
  ) => {
    setConversationThreads(current => current.map(thread => thread.id === threadId
      ? { ...thread, entries: update(thread.entries), updatedAt: Date.now() }
      : thread));
  };

  const startNewConversation = () => {
    const thread = createConversationThread();
    setConversationThreads(current => [thread, ...current].slice(0, 20));
    setActiveConversationId(thread.id);
    setQuestion('');
    setError('');
    setSelectedActionId(null);
    setOpenEntryMenuId(null);
  };

  const selectConversation = (threadId: string) => {
    setActiveConversationId(threadId);
    setQuestion('');
    setError('');
    setSelectedActionId(null);
    setOpenEntryMenuId(null);
  };

  const ask = async (value = question) => {
    const trimmed = value.trim();
    if (!trimmed || submitting || loading) return;
    const fallbackThread = activeThread ?? createConversationThread();
    const threadId = fallbackThread.id;
    if (!activeThread) {
      setConversationThreads([fallbackThread]);
      setActiveConversationId(fallbackThread.id);
    }
    setQuestion('');
    setError('');
    setSubmitting(true);
    const entryId = `${Date.now()}`;
    updateConversation(threadId, current => [...current, { id: `question-${entryId}`, kind: 'user', text: trimmed }]);
    setConversationThreads(current => current.map(thread => thread.id === threadId
      ? {
        ...thread,
        title: thread.entries.length === 0 ? trimmed.slice(0, 64) : thread.title,
        updatedAt: Date.now(),
      }
      : thread));
    try {
      const history = conversation.map<MaximusAssistantMessage>(entry => ({
        role: entry.kind,
        content: entry.text,
      }));
      const requestedAction = parseMaxiActionRequest(trimmed);
      const response = requestedAction
        ? await onPreviewAction(requestedAction)
        : await Promise.resolve(onAsk(trimmed, history));
      updateConversation(threadId, current => [
        ...current,
        {
          id: `answer-${entryId}`,
          kind: 'assistant',
          text: response.answer,
          citations: response.citations,
          action: response.action,
        },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La question n’a pas pu être transmise. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyEntry = async (entry: ConversationEntry) => {
    try {
      await navigator.clipboard.writeText(entry.text);
      setCopiedEntryId(entry.id);
      window.setTimeout(() => setCopiedEntryId(current => current === entry.id ? null : current), 1600);
    } catch {
      setError('Le texte n’a pas pu être copié.');
    }
  };

  const shareEntry = async (entry: ConversationEntry) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MAXI', text: entry.text });
        return;
      } catch {
        return;
      }
    }
    await copyEntry(entry);
  };

  const toggleReaction = (entryId: string, reaction: 'up' | 'down') => {
    setReactionByEntry(current => ({
      ...current,
      [entryId]: current[entryId] === reaction ? undefined as never : reaction,
    }));
  };

  const confirmAction = async (entryId: string, action: MaximusAssistantAction) => {
    if (action.status === 'EXECUTED' || confirmingActionIds.current.has(entryId) || submitting || loading) return;
    confirmingActionIds.current.add(entryId);
    setError('');
    setSubmitting(true);
    try {
      const response = await onExecuteAction(action);
      updateConversation(activeThread?.id ?? '', current => current.map(entry => entry.id === entryId
        ? { ...entry, text: response.answer, citations: response.citations, action: response.action }
        : entry));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'MAXI n’a pas pu confirmer cette action.');
    } finally {
      confirmingActionIds.current.delete(entryId);
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask();
  };

  return (
    <div className="space-y-6 pb-12" data-testid="maximus-assistant">
      <section className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[var(--shadow-soft)]" aria-labelledby="assistant-conversation-title">
        <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.55)]">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-sm font-black text-[hsl(var(--primary-foreground))]">
                <Sparkles size={17} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 id="assistant-conversation-title" className="text-base font-black">MAXI</h1>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">En ligne</span>
                </div>
                <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                  Assistant de gouvernance · {workspaceContext.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
              <LockKeyhole size={13} />
              <span className="hidden sm:inline">Périmètre administrateur contrôlé</span>
              <button
                type="button"
                onClick={startNewConversation}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 font-black text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
              >
                <Plus size={14} />
                Nouvelle
              </button>
            </div>
          </div>

          <div className="border-t border-[hsl(var(--border))] px-4 py-3 sm:px-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Historique</p>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{conversationThreads.length} conversation{conversationThreads.length === 1 ? '' : 's'}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {conversationThreads.map(thread => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => selectConversation(thread.id)}
                  aria-current={activeThread?.id === thread.id ? 'true' : undefined}
                  className={`min-w-[11.5rem] max-w-[15rem] shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                    activeThread?.id === thread.id
                      ? 'border-[hsl(var(--primary)/.55)] bg-[hsl(var(--primary)/.1)]'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/.35)]'
                  }`}
                >
                  <span className="block truncate text-xs font-bold">{thread.title}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                    <Clock3 size={11} />
                    {thread.entries.length ? `${thread.entries.length} message${thread.entries.length === 1 ? '' : 's'}` : 'Vide'} · {conversationDate(thread.updatedAt)}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={startNewConversation}
                className="flex min-w-[9rem] shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-[hsl(var(--border))] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/.45)] hover:text-[hsl(var(--primary))]"
              >
                <Plus size={14} />
                Démarrer
              </button>
            </div>
          </div>

          <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background)/.32)] px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">Concevoir avec MAXI</p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Choisissez un parcours ou décrivez directement le besoin du client.</p>
              </div>
              <Sparkles size={15} className="shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {guidedPrompts.map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setQuestion(item.prompt);
                    setError('');
                  }}
                  disabled={loading || submitting}
                  className="shrink-0 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--primary)/.55)] hover:bg-[hsl(var(--primary)/.06)] disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex min-h-[30rem] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{activeThread?.title ?? 'Nouvelle conversation'}</p>
              <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                {workspaceContext.scopeLabel ?? 'Lecture des données autorisées'}
                {workspaceContext.lastSyncLabel ? ` · Synchronisé ${workspaceContext.lastSyncLabel}` : ''}
              </p>
            </div>
            <button
              type="button"
              disabled={!conversation.length}
              onClick={() => {
                if (!activeThread) return;
                setConversationThreads(current => current.map(thread => thread.id === activeThread.id
                  ? { ...thread, title: 'Nouvelle conversation', entries: [], updatedAt: Date.now() }
                  : thread));
                setError('');
                setReactionByEntry({});
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-2.5 py-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))] transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Effacer</span>
            </button>
          </div>

          <div className="flex-1 px-4 py-6 sm:px-8">
            {conversation.length === 0 ? (
              <div className="flex min-h-[20rem] flex-col justify-center">
                <div className="mx-auto max-w-lg text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">
                    <MessageSquareText size={24} />
                  </div>
                  <h2 className="mt-4 text-xl font-black tracking-[-.03em]">Comment puis-je vous aider ?</h2>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                     {workspaceContext.description ?? 'Posez une question sur le catalogue, les organisations ou la gouvernance.'} MAXI explique son raisonnement, affiche ses sources et demande une confirmation avant toute écriture.
                  </p>
                </div>
                <div className="mx-auto mt-7 grid w-full max-w-3xl gap-2 md:grid-cols-3">
                  {suggestedPrompts.map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void ask(prompt)}
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
              <div className="mx-auto max-w-3xl space-y-6">
                {conversation.map(entry => (
                  <div key={entry.id} className={`group flex gap-3 ${entry.kind === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {entry.kind === 'assistant' && (
                      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.13)] text-[hsl(var(--primary))]">
                        <Sparkles size={15} />
                      </span>
                    )}
                    <div className={`relative max-w-[min(92%,42rem)] ${entry.kind === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                        entry.kind === 'user'
                          ? 'rounded-br-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                          : 'rounded-bl-md border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)]'
                      }`}>
                        <p className="whitespace-pre-wrap">{entry.text}</p>
                        {entry.kind === 'assistant' && entry.citations && entry.citations.length > 0 && (
                          <details className="mt-3 border-t border-[hsl(var(--border))] pt-2 text-xs">
                            <summary className="cursor-pointer font-bold text-[hsl(var(--primary))]">Sources consultées</summary>
                            <ul className="mt-2 space-y-1 text-[hsl(var(--muted-foreground))]">
                              {entry.citations.map(citation => <li key={citation}>• {citation}</li>)}
                            </ul>
                          </details>
                        )}
                        {entry.action && (
                          <div className="mt-4 rounded-xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] p-3">
                            <div className="flex items-start gap-2">
                              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-black uppercase tracking-[.12em] text-[hsl(var(--primary))]">Action vérifiée</p>
                                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                                   {actionDescription(entry.action)}
                                </p>
                                <button
                                  type="button"
                                  disabled={entry.action.status === 'EXECUTED' || submitting || loading}
                                  onClick={() => void confirmAction(entry.id, entry.action!)}
                                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-black text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {entry.action.status === 'EXECUTED' ? <CircleCheck size={14} /> : <Check size={14} />}
                                  {entry.action.status === 'EXECUTED' ? 'Action confirmée' : 'Confirmer et enregistrer'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {entry.kind === 'assistant' && (
                        <div className="mt-1 flex items-center gap-0.5 text-[hsl(var(--muted-foreground))]">
                          <button type="button" onClick={() => void copyEntry(entry)} aria-label="Copier la réponse" className="rounded-md p-1.5 transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]">
                            {copiedEntryId === entry.id ? <CircleCheck size={13} className="text-emerald-600" /> : <PanelTop size={13} />}
                          </button>
                          <button type="button" onClick={() => toggleReaction(entry.id, 'up')} aria-label="Réponse utile" className={`rounded-md p-1.5 transition hover:bg-[hsl(var(--muted))] ${reactionByEntry[entry.id] === 'up' ? 'text-emerald-600' : ''}`}>
                            <TrendingUp size={13} />
                          </button>
                          <button type="button" onClick={() => toggleReaction(entry.id, 'down')} aria-label="Réponse à améliorer" className={`rounded-md p-1.5 transition hover:bg-[hsl(var(--muted))] ${reactionByEntry[entry.id] === 'down' ? 'text-rose-600' : ''}`}>
                            <TrendingDown size={13} />
                          </button>
                          <button type="button" onClick={() => void shareEntry(entry)} aria-label="Partager la réponse" className="rounded-md p-1.5 transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]">
                            <ArrowUpRight size={13} />
                          </button>
                          <span className="relative">
                            <button type="button" onClick={() => setOpenEntryMenuId(current => current === entry.id ? null : entry.id)} aria-label="Plus d’actions" aria-expanded={openEntryMenuId === entry.id} className="rounded-md p-1.5 transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]">
                              <MoreHorizontal size={13} />
                            </button>
                            {openEntryMenuId === entry.id && (
                              <span className="absolute left-0 top-8 z-10 w-32 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 text-xs shadow-lg">
                                <button type="button" onClick={() => { setOpenEntryMenuId(null); void copyEntry(entry); }} className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-[hsl(var(--muted))]">Copier</button>
                                <button type="button" onClick={() => { setOpenEntryMenuId(null); void shareEntry(entry); }} className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-[hsl(var(--muted))]">Partager</button>
                              </span>
                            )}
                          </span>
                        </div>
                      )}
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

          {error && (
            <div role="alert" className="mx-4 mb-3 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:mx-6">
              <CircleAlert size={17} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-bold">MAXI ne peut pas répondre</p>
                <p className="mt-0.5 text-xs">{error}</p>
              </div>
              <button type="button" aria-label="Fermer l’erreur" onClick={() => setError('')} className="rounded p-1 hover:bg-rose-100">
                <X size={15} />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="sticky bottom-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--card)/.96)] p-4 backdrop-blur sm:px-6">
            <label htmlFor="assistant-question" className="sr-only">Votre message à MAXI</label>
            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 shadow-sm focus-within:border-[hsl(var(--primary))] focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/.16)]">
              <MessageSquareText size={18} className="mb-2 ml-2 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
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
                placeholder="Message à MAXI…"
                className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[hsl(var(--muted-foreground)/.7)]"
                disabled={loading || submitting}
              />
              <button
                type="submit"
                disabled={!question.trim() || loading || submitting}
                aria-label="Envoyer le message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading || submitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="mx-auto mt-2 max-w-3xl text-[10px] text-[hsl(var(--muted-foreground))]">
              Entrée pour envoyer · Maj + Entrée pour aller à la ligne
            </p>
          </form>
        </div>

        <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background)/.42)] px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowBoundary(current => !current)}
              aria-expanded={showBoundary}
              className="inline-flex items-center gap-2 text-left text-xs font-bold text-[hsl(var(--foreground))]"
            >
              <ShieldCheck size={14} className="text-[hsl(var(--primary))]" />
              Règles de confirmation
              {showBoundary ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {actionCount} proposition{actionCount === 1 ? '' : 's'} à revoir
            </span>
          </div>
          {showBoundary && (
            <div className="mt-3 grid gap-2 border-t border-[hsl(var(--border))] pt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))] sm:grid-cols-3">
              <p className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />Chaque action est revue dans son module d’origine.</p>
              <p className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />Les droits de l’utilisateur restent applicables.</p>
              <p className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />La décision finale reste attribuée à une personne.</p>
            </div>
          )}
          {selectedAction && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <span className="font-bold">Proposition marquée pour validation :</span> {selectedAction.label}
            </div>
          )}
        </footer>
      </section>

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