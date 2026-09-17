import { Link } from 'wouter';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] p-6">
      <section className="card-surface w-full max-w-lg rounded-2xl p-8 text-center sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/.2)] text-[hsl(var(--primary))]"><AlertCircle size={26} /></span>
        <p className="mono mt-6 text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">MAXIMUS · navigation</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-.04em]">Cette page est introuvable.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">Le lien demandé n’existe plus ou n’est pas disponible dans votre espace.</p>
        <Link href="/" className="btn mt-7 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"><ArrowLeft size={16} />Retour à l’accueil</Link>
      </section>
    </div>
  );
}
