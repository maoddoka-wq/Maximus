import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleCheck, ClipboardList, Eye, Loader2, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@workspace/maximus-design-system/components/ui/alert';
import { Badge } from '@workspace/maximus-design-system/components/ui/badge';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/maximus-design-system/components/ui/card';
import { Textarea } from '@workspace/maximus-design-system/components/ui/textarea';
import { Skeleton } from '@workspace/maximus-design-system/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@workspace/maximus-design-system/components/ui/alert-dialog';
import { maxiPlansApi, type MaxiPlan } from '@/lib/maxi-plans-api';
import type { MaximusAssistantAction } from '@/lib/maximus-assistant-api';
import { MaxiPlanActionDetails } from './maxi-plan-action-details';
import {
  MAXI_PLAN_LIMITS, canExecute, currentStep, isConflict, isPlanReadonly, isTimeout, type PreviewState,
} from '@/lib/maxi-plans-flow';

type Props = { onWorkspaceChanged?: () => Promise<unknown> | unknown; disabled?: boolean; threadKey?: string };

const statusLabel: Record<MaxiPlan['status'], string> = {
  AWAITING_CONFIRMATION: 'En attente de confirmation',
  COMPLETED: 'Terminé',
  CANCELLED: 'Abandonné',
};
const msg = (e: unknown, fb: string) => (e instanceof Error && e.message ? e.message : fb);

export function MaxiSupervisedPlans({ onWorkspaceChanged, disabled = false, threadKey }: Props) {
  const [goal, setGoal] = useState('');
  const [plans, setPlans] = useState<MaxiPlan[] | null>(null);
  const [active, setActive] = useState<MaxiPlan | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null); // in memory only
  const [previewAnswer, setPreviewAnswer] = useState('');
  const [previewAction, setPreviewAction] = useState<MaximusAssistantAction | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [needsPreview, setNeedsPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const flight = useRef(false);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const onChangedRef = useRef(onWorkspaceChanged);
  onChangedRef.current = onWorkspaceChanged;

  const resetPreview = () => { setPreview(null); setPreviewAnswer(''); setPreviewAction(null); };
  const live = (e: number) => mounted.current && epoch.current === e;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; epoch.current += 1; };
  }, []);

  // Thread change: drop token and stale results.
  useEffect(() => { epoch.current += 1; resetPreview(); }, [threadKey]);

  const loadList = useCallback(async () => {
    const e = epoch.current;
    try {
      const res = await maxiPlansApi.list();
      if (!live(e)) return;
      setPlans(res.plans);
      setActive(cur => (cur ? res.plans.find(p => p.id === cur.id) ?? cur : res.plans.find(p => p.status === 'AWAITING_CONFIRMATION') ?? null));
    } catch (c) {
      if (live(e)) { setPlans([]); setError(msg(c, 'Les plans n’ont pas pu être chargés.')); }
    }
  }, []);
  useEffect(() => { void loadList(); }, [loadList]);

  const run = async (fn: (e: number) => Promise<void>) => {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError('');
    const e = epoch.current;
    try { await fn(e); } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const syncPlan = (plan: MaxiPlan) => {
    setActive(plan);
    setPlans(cur => (cur ? [plan, ...cur.filter(p => p.id !== plan.id)] : [plan]));
  };

  const prepare = () => run(async e => {
    const text = goal.trim();
    if (!text) return;
    resetPreview(); setInfo(''); setQuestions([]); setNeedsPreview(false);
    try {
      const res = await maxiPlansApi.prepare(text);
      if (!live(e)) return;
      setInfo(res.answer);
      if (!res.plan || res.questions.length > 0) setQuestions(res.questions);
      if (res.plan) { syncPlan(res.plan); setGoal(''); }
    } catch (c) { if (live(e)) setError(msg(c, 'Le plan n’a pas pu être préparé.')); }
  });

  const selectPlan = (id: string) => run(async () => {
    epoch.current += 1;
    const e = epoch.current;
    resetPreview(); setNeedsPreview(false); setInfo('');
    try {
      const plan = await maxiPlansApi.get(id);
      if (live(e)) syncPlan(plan);
    } catch (c) { if (live(e)) setError(msg(c, 'Le plan n’a pas pu être relu.')); }
  });

  const refetch = async (id: string, e: number) => {
    try {
      const plan = await maxiPlansApi.get(id);
      if (live(e)) syncPlan(plan);
    } catch {
      if (live(e)) setError('L’état du plan n’a pas pu être relu. Aucun résultat supplémentaire n’est confirmé. Rechargez la page avant de reprendre.');
    }
  };

  const previewStep = () => run(async e => {
    if (!active) return;
    const step = currentStep(active);
    if (!step) return;
    resetPreview(); setNeedsPreview(false);
    try {
      const res = await maxiPlansApi.preview(active.id, step.index);
      if (!live(e)) return;
      syncPlan(res.plan);
      setPreview({ planId: res.plan.id, step: step.index, token: res.token });
      setPreviewAnswer(res.answer);
      setPreviewAction(res.action);
    } catch (c) {
      if (!live(e)) return;
      setError(msg(c, 'L’aperçu n’a pas pu être préparé.'));
      if (isConflict(c)) { setNeedsPreview(true); await refetch(active.id, e); }
    }
  });

  const executeStep = () => run(async e => {
    if (!active || !canExecute(active, preview) || !preview) return;
    const { token, step, planId } = preview;
    resetPreview(); // token is single-use
    try {
      const plan = await maxiPlansApi.execute(planId, step, token);
      if (!live(e)) return;
      syncPlan(plan);
      setInfo('Étape exécutée. Vérifiez l’étape suivante : rien n’est lancé automatiquement.');
      try { await onChangedRef.current?.(); } catch {
        if (live(e)) setError('L’étape est enregistrée, mais la configuration affichée n’a pas pu être actualisée. Rechargez la page avant de poursuivre.');
      }
    } catch (c) {
      if (!live(e)) return;
      setError(msg(c, 'L’étape n’a pas pu être exécutée.'));
      setNeedsPreview(true);
      if (isTimeout(c) || isConflict(c)) {
        if (isTimeout(c)) setError('Délai dépassé : l’état du plan est relu avant tout nouvel essai.');
        await refetch(planId, e);
        if (live(e) && isTimeout(c)) { try { await onChangedRef.current?.(); } catch { /* ignore */ } }
      }
    }
  });

  const abandon = () => run(async e => {
    if (!active) return;
    setConfirmAbandon(false); resetPreview();
    try {
      const plan = await maxiPlansApi.cancel(active.id);
      if (!live(e)) return;
      syncPlan(plan);
      setInfo('Étapes restantes abandonnées. Les étapes déjà exécutées ne sont pas annulées.');
      try { await onChangedRef.current?.(); } catch { /* ignore */ }
    } catch (c) { if (live(e)) setError(msg(c, 'Le plan n’a pas pu être abandonné.')); }
  });

  const off = busy || disabled;
  const step = active ? currentStep(active) : null;
  const readonly = active ? isPlanReadonly(active) : false;

  return (
    <section aria-labelledby="maxi-plans-title" data-testid="maxi-supervised-plans" aria-busy={busy}>
      <Card>
        <CardHeader>
          <CardTitle id="maxi-plans-title" className="flex items-center gap-2 text-base">
            <ClipboardList size={16} aria-hidden="true" /> Plans supervisés
          </CardTitle>
          <CardDescription>Indiquez des créations explicites avec leurs champs. Le moteur local prépare les étapes reconnues ; vous confirmez chacune avant toute modification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheck size={16} aria-hidden="true" />
            <div>
              <AlertTitle>Limites de MAXI</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4 text-xs" data-testid="maxi-plan-limits">
                  {MAXI_PLAN_LIMITS.map(l => <li key={l}>{l}</li>)}
                </ul>
              </AlertDescription>
            </div>
          </Alert>

          <form className="space-y-2" onSubmit={ev => { ev.preventDefault(); void prepare(); }}>
            <label htmlFor="maxi-plan-goal" className="text-xs font-semibold">Objectif</label>
            <Textarea id="maxi-plan-goal" data-testid="input-plan-goal" value={goal} disabled={off} rows={3}
              onChange={ev => setGoal(ev.target.value)}
              placeholder={'Créer le module « Atelier » description : Gestion de l’atelier fonctionnalités : Interventions, Planning\nPuis créer le pack « Essentiel » pour le module « Atelier » description : Accès de base fonctionnalités : Interventions'} />
            <Button type="submit" disabled={off || !goal.trim()} data-testid="button-prepare-plan">
              {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              Proposer un plan
            </Button>
          </form>

          <div aria-live="polite" className="space-y-2">
            {info && <p className="text-sm text-muted-foreground" data-testid="text-plan-info">{info}</p>}
            {questions.length > 0 && (
              <Alert data-testid="plan-questions">
                <div>
                  <AlertTitle>MAXI a besoin de précisions</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4">{questions.map(q => <li key={q}>{q}</li>)}</ul>
                    <p className="mt-2 text-xs text-muted-foreground">Complétez l’objectif ci-dessus puis relancez la proposition.</p>
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>
          {error && (
            <Alert variant="destructive" data-testid="plan-error">
              <div>
                <AlertTitle>Action impossible</AlertTitle>
                <AlertDescription>{error}{needsPreview && ' Un nouvel aperçu est nécessaire avant de continuer.'}</AlertDescription>
              </div>
            </Alert>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plans enregistrés</h3>
            {plans === null ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="plans-empty">Aucun plan pour l’instant.</p>
            ) : (
              <ul className="space-y-2">
                {plans.map(p => (
                  <li key={p.id}>
                    <Button type="button" variant={active?.id === p.id ? 'secondary' : 'outline'} disabled={off}
                      aria-current={active?.id === p.id ? 'true' : undefined}
                      onClick={() => void selectPlan(p.id)} data-testid={`button-plan-${p.id}`}
                      className="h-auto w-full flex-wrap justify-between whitespace-normal text-left">
                      <span className="min-w-0 break-words font-semibold">{p.title}</span>
                      <Badge variant="outline">{statusLabel[p.status]}</Badge>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {active && (
            <article className="space-y-3 rounded-md border p-3" data-testid="plan-detail" aria-labelledby="plan-detail-title">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 id="plan-detail-title" className="break-words text-sm font-bold">{active.title}</h3>
                  <p className="text-xs text-muted-foreground">{active.summary}</p>
                </div>
                <Badge variant={active.status === 'AWAITING_CONFIRMATION' ? 'default' : 'secondary'}>{statusLabel[active.status]}</Badge>
              </div>
              {active.error && <p className="text-xs text-destructive">{active.error}</p>}
              {readonly && <p className="text-xs text-muted-foreground" data-testid="plan-readonly">Plan en lecture seule : aucune action possible.</p>}
              <ol className="space-y-2">
                {active.steps.map(s => {
                  const isCurrent = step?.index === s.index;
                  return (
                    <li key={s.index} data-testid={`plan-step-${s.index}`} aria-current={isCurrent ? 'step' : undefined}
                      className={`rounded-md border p-2 text-sm ${isCurrent ? 'border-primary' : ''}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 break-words font-semibold">{s.index + 1}. {s.title}</span>
                        <Badge variant={s.status === 'EXECUTED' ? 'secondary' : 'outline'}>
                          {s.status === 'EXECUTED' ? <><CircleCheck size={12} className="mr-1" aria-hidden="true" />Exécutée</> : isCurrent ? 'Étape courante' : 'À venir'}
                        </Badge>
                      </div>
                      <div className="mt-2"><MaxiPlanActionDetails action={s.action} /></div>
                      {s.result?.answer && <p className="mt-1 text-xs">{s.result.answer}</p>}
                    </li>
                  );
                })}
              </ol>

              {step && (
                <div className="space-y-2">
                  {preview && canExecute(active, preview) && (
                    <Alert data-testid="plan-preview">
                      <Eye size={16} aria-hidden="true" />
                      <div><AlertTitle>Aperçu de l’étape {step.index + 1}</AlertTitle>
                        <AlertDescription>
                          <p className="whitespace-pre-wrap">{previewAnswer}</p>
                          {previewAction && <div className="mt-2"><MaxiPlanActionDetails action={previewAction} /></div>}
                        </AlertDescription></div>
                    </Alert>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button type="button" variant="outline" disabled={off} onClick={() => void previewStep()} data-testid="button-preview-step">
                      <Eye aria-hidden="true" /> {needsPreview || preview ? 'Actualiser l’aperçu' : 'Voir l’aperçu de l’étape'}
                    </Button>
                    {canExecute(active, preview) && (
                      <Button type="button" disabled={off} onClick={() => void executeStep()} data-testid="button-execute-step">
                        <CircleCheck aria-hidden="true" /> Confirmer et exécuter l’étape {step.index + 1}
                      </Button>
                    )}
                    <Button type="button" variant="ghost" disabled={off} onClick={() => setConfirmAbandon(true)} data-testid="button-abandon-plan">
                      <XCircle aria-hidden="true" /> Abandonner les étapes restantes
                    </Button>
                  </div>
                </div>
              )}
            </article>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmAbandon} onOpenChange={setConfirmAbandon}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonner les étapes restantes ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les étapes déjà exécutées ne sont pas annulées. Seules les étapes restantes sont abandonnées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer le plan</AlertDialogCancel>
            <AlertDialogAction onClick={() => void abandon()} data-testid="button-confirm-abandon">Abandonner</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
