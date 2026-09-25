import { Check } from 'lucide-react';

export function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm font-bold ${active || done ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${done ? 'bg-[hsl(var(--primary))] text-white' : active ? 'bg-[hsl(var(--accent))]' : 'border border-[hsl(var(--border))]'}`}>
        {done ? <Check size={14} /> : n}
      </span>
      <span className="mobile-hide">{label}</span>
    </div>
  );
}