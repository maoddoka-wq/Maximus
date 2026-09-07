import { CheckCircle2, Clock3, Home, XCircle } from 'lucide-react';

function statusMessage(status: string | null): {
  title: string;
  description: string;
  icon: typeof Clock3;
  tone: string;
} {
  switch (status) {
    case 'SUCCESS':
    case 'SUCCEEDED':
    case 'COMPLETED':
    case 'PAID':
      return {
        title: 'Retour de paiement reçu',
        description: 'Le paiement a été signalé comme réussi. La confirmation définitive est effectuée côté serveur après vérification DiamanoPay.',
        icon: CheckCircle2,
        tone: 'text-emerald-700 bg-emerald-100',
      };
    case 'FAILED':
    case 'ERROR':
    case 'REJECTED':
    case 'CANCELLED':
    case 'CANCELED':
    case 'EXPIRED':
      return {
        title: 'Le paiement n’a pas été confirmé',
        description: 'Le retour du prestataire indique que le paiement n’est pas confirmé. Votre commande reste vérifiable depuis la boutique.',
        icon: XCircle,
        tone: 'text-red-700 bg-red-100',
      };
    default:
      return {
        title: 'Retour de paiement reçu',
        description: 'Votre retour DiamanoPay a bien été reçu. La confirmation définitive dépend de la vérification serveur et du webhook du prestataire.',
        icon: Clock3,
        tone: 'text-amber-700 bg-amber-100',
      };
  }
}

export default function PaymentReturnPage() {
  const params = new URLSearchParams(window.location.search);
  const { title, description, icon: Icon, tone } = statusMessage(params.get('status')?.toUpperCase() ?? null);
  const reference = params.get('clientReference') ?? params.get('reference');

  return (
    <main className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-6">
      <section className="w-full max-w-xl rounded-3xl border bg-[hsl(var(--card))] p-8 text-center shadow-sm sm:p-10">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${tone}`}>
          <Icon size={28} />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">MAXIMUS · Paiement</p>
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>
        {reference && (
          <p className="mt-5 rounded-2xl bg-[hsl(var(--muted)/.5)] px-4 py-3 text-sm">
            Référence : <strong>{reference}</strong>
          </p>
        )}
        <a href="/" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">
          <Home size={16} />
          Retour à l’accueil
        </a>
      </section>
    </main>
  );
}