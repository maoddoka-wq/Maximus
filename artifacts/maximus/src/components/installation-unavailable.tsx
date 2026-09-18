export function InstallationUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] p-6">
      <section className="card-surface w-full max-w-md rounded-2xl p-7 text-center" aria-labelledby="installation-error-title">
        <h1 id="installation-error-title" className="text-xl font-bold">Votre espace est momentanément indisponible</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{message}</p>
        <p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          Aucun autre espace de connexion n’a été ouvert. Si le problème persiste, contactez le responsable de cette installation.
        </p>
        <button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">
          Réessayer
        </button>
      </section>
    </main>
  );
}