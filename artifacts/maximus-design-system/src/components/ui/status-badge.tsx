const styles: Record<string, string> = {
  ACTIF: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]',
  VALIDÉ: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]',
  CONFIRMÉ: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]',
  'À JOUR': 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]',
  PAYÉE: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]',
  ESSAI: 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--foreground))]',
  'EN ATTENTE': 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--foreground))]',
  OUVERTE: 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--foreground))]',
  'NON CONFIGURÉ': 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
  MAINTENANCE: 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--foreground))]',
  IMPAYÉ: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]',
  'EN RETARD': 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]',
  SUSPENDU: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]',
  RÉSILIÉ: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]',
  EXPIRÉ: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]',
  BROUILLON: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
};

export function StatusBadge({ status }: { status: string }) {
  return <span data-testid={`status-${status.replace(/\s/g, '-').toLowerCase()}`} className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[status] ?? styles.BROUILLON}`}>{status}</span>;
}