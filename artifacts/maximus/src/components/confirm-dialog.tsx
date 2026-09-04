import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

type DialogOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
};

type DialogRequest = DialogOptions & {
  kind: 'confirm' | 'alert';
  resolve: (value: boolean) => void;
};

type DialogContextValue = {
  confirm: (options: DialogOptions) => Promise<boolean>;
  alert: (options: Omit<DialogOptions, 'confirmLabel' | 'cancelLabel'> & { confirmLabel?: string }) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useAppDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useAppDialog doit être utilisé dans ConfirmDialogProvider.');
  return context;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const queued = useRef<DialogRequest[]>([]);

  const finish = (confirmed: boolean) => {
    if (!request) return;
    request.resolve(confirmed);
    const next = queued.current.shift();
    setRequest(next ?? null);
  };

  const enqueue = (options: DialogOptions, kind: DialogRequest['kind']) => new Promise<boolean>(resolve => {
    const next = { ...options, kind, resolve };
    if (request) queued.current.push(next);
    else setRequest(next);
  });

  useEffect(() => {
    if (!request) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [request]);

  const value: DialogContextValue = {
    confirm: options => enqueue(options, 'confirm'),
    alert: options => enqueue(options, 'alert').then(() => undefined),
  };

  return <DialogContext.Provider value={value}>
    {children}
    {request && <div className="app-dialog-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-[hsl(var(--foreground)/.4)] p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) finish(false); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-description" className="app-dialog-panel card-surface w-full max-w-md rounded-2xl p-6 shadow-2xl fade-up">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${request.tone === 'danger' ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}>
            {request.tone === 'danger' ? <AlertTriangle size={19} /> : <Check size={19} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="app-dialog-title" className="text-lg font-bold">{request.title}</h2>
            <p id="app-dialog-description" className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{request.description}</p>
          </div>
          <button type="button" aria-label="Fermer" onClick={() => finish(false)} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><X size={17} /></button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          {request.kind === 'confirm' && <button type="button" onClick={() => finish(false)} className="rounded-lg border px-4 py-2.5 text-xs font-bold">{request.cancelLabel ?? 'Annuler'}</button>}
          <button type="button" autoFocus onClick={() => finish(true)} className={`rounded-lg px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] ${request.tone === 'danger' ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary))]'}`}>{request.confirmLabel ?? 'OK'}</button>
        </div>
      </section>
    </div>}
  </DialogContext.Provider>;
}