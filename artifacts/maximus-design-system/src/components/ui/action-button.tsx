import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { LoaderCircle, Plus, type LucideIcon } from 'lucide-react';

export function ActionButton({
  children,
  onClick,
  primary = false,
  testId,
  icon: ButtonIcon = Plus,
  disabled = false,
  loading = false,
  className = '',
}: {
  children: ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
  primary?: boolean;
  testId?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const busy = loading || pending;

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (busy) {
      event.preventDefault();
      return;
    }

    const result = onClick?.(event);
    if (!result || typeof (result as PromiseLike<unknown>).then !== 'function') {
      return;
    }

    setPending(true);
    void Promise.resolve(result).then(
      () => setPending(false),
      () => setPending(false),
    );
  };

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={handleClick}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`app-action btn flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-bold disabled:cursor-wait disabled:opacity-60 ${
        primary
          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
          : 'border bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]'
      } ${className}`}
    >
      {busy ? (
        <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
      ) : (
        <ButtonIcon size={15} aria-hidden="true" />
      )}
      {children}
    </button>
  );
}