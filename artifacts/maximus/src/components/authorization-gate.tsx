/** @jsxRuntime automatic */
/** @jsxImportSource react */
import type { ReactNode, SyntheticEvent } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Badge } from '@workspace/maximus-design-system/components/ui/badge';
import { shouldBlockGateEvent, type AuthorizationGateController } from '@/lib/authorization-gate';

type AuthorizationGateProps = {
  gate: Pick<AuthorizationGateController, 'locked' | 'confirming' | 'pending' | 'requestUnlock' | 'confirmUnlock' | 'cancelUnlock' | 'relock'>;
  title?: string;
  testId?: string;
  children: ReactNode;
};

export function AuthorizationGate({
  gate,
  title = 'Autorisations verrouillées',
  testId = 'authorization-gate',
  children,
}: AuthorizationGateProps) {
  const block = (event: SyntheticEvent) => {
    if (!shouldBlockGateEvent(gate.locked)) return;
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <div data-testid={testId} data-locked={gate.locked ? 'true' : 'false'} className="space-y-3">
      <div className="flex flex-col gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {gate.locked ? <Lock size={16} aria-hidden="true" /> : <LockOpen size={16} aria-hidden="true" />}
          <span className="text-sm font-bold">{gate.locked ? title : 'Autorisations déverrouillées'}</span>
          <Badge data-testid={`${testId}-status`} variant={gate.locked ? 'secondary' : 'default'}>
            {gate.locked ? 'Verrouillé' : 'Modifiable'}
          </Badge>
        </div>
        {gate.locked && !gate.confirming && (
          <Button type="button" size="sm" variant="outline" data-testid={`${testId}-unlock`} onClick={gate.requestUnlock}>
            Déverrouiller
          </Button>
        )}
        {!gate.locked && (
          <Button type="button" size="sm" variant="outline" data-testid={`${testId}-relock`} onClick={gate.relock}>
            Reverrouiller
          </Button>
        )}
      </div>
      {gate.locked && gate.confirming && (
        <div role="alertdialog" aria-label="Confirmer le déverrouillage" data-testid={`${testId}-confirm`} className="space-y-3 rounded-lg border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.05)] p-3">
          <p className="text-sm">
            Ces réglages contrôlent les droits d’accès de l’entreprise. Confirmez que vous souhaitez les modifier.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" data-testid={`${testId}-confirm-unlock`} onClick={gate.confirmUnlock}>
              Confirmer le déverrouillage
            </Button>
            <Button type="button" size="sm" variant="outline" data-testid={`${testId}-cancel-unlock`} onClick={gate.cancelUnlock}>
              Annuler
            </Button>
          </div>
        </div>
      )}
      <fieldset
        disabled={gate.locked || gate.pending}
        data-testid={`${testId}-fieldset`}
        aria-disabled={gate.locked}
        onClickCapture={block}
        onKeyDownCapture={block}
        onKeyUpCapture={block}
        onChangeCapture={block}
        className={`m-0 min-w-0 border-0 p-0 ${gate.locked ? 'opacity-70' : ''}`}
      >
        {children}
      </fieldset>
    </div>
  );
}
