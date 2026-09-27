import { useEffect, useState, type FormEvent } from 'react';
import { Globe2, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@workspace/maximus-design-system/components/ui/badge';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/maximus-design-system/components/ui/card';
import { Input } from '@workspace/maximus-design-system/components/ui/input';
import { companyRequestApi, type PublicSiteDomain } from '@/lib/company-request-api';

export function OrganizationPublicSiteDomains({ companyId }: { companyId: string }) {
  const [domains, setDomains] = useState<PublicSiteDomain[]>([]);
  const [domainInput, setDomainInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void companyRequestApi.publicSiteDomains(companyId)
      .then(({ domains: loadedDomains }) => {
        if (!cancelled) setDomains(Array.isArray(loadedDomains) ? loadedDomains : []);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Les domaines du site public sont indisponibles.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const refreshDomains = async () => {
    const result = await companyRequestApi.publicSiteDomains(companyId);
    setDomains(Array.isArray(result.domains) ? result.domains : []);
  };

  const run = async (action: () => Promise<unknown>, successMessage: string): Promise<boolean> => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await refreshDomains();
      setNotice(successMessage);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La gestion du domaine a échoué.');
      try {
        await refreshDomains();
      } catch {
        // Keep the mutation error visible if refreshing also fails.
      }
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addDomain = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const domain = domainInput.trim();
    if (!domain) return;
    const added = await run(
      () => companyRequestApi.createPublicSiteDomain(companyId, domain),
      'Domaine ajouté. Configurez le DNS puis lancez la vérification.',
    );
    if (added) setDomainInput('');
  };

  const verifyDomain = (domain: PublicSiteDomain) => {
    void run(
      () => companyRequestApi.verifyPublicSiteDomain(companyId, domain.id),
      `Le domaine ${domain.domain} a été vérifié.`,
    );
  };

  const removeDomain = (domain: PublicSiteDomain) => {
    void run(
      () => companyRequestApi.deletePublicSiteDomain(companyId, domain.id),
      `Le domaine ${domain.domain} a été retiré du site public.`,
    );
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
            <Globe2 size={18} className="text-[hsl(var(--primary))]" />
          </span>
          <div>
            <CardTitle>Domaine personnalisé</CardTitle>
            <CardDescription className="mt-1">
              Connectez le domaine utilisé par votre site public, quel que soit le module publié.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.04)] p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          <p className="font-bold text-[hsl(var(--foreground))]">Procédure de connexion</p>
          <p className="mt-1">
            Ajoutez d’abord le domaine dans la configuration Custom Domains de Render pour provisionner HTTPS,
            puis renseignez-le ici et appliquez les enregistrements DNS indiqués.
          </p>
          <p className="mt-1">
            Après propagation DNS, lancez la vérification. Le domaine répondra lorsque le site sera autorisé
            par MAXIMUS, publié et que ses modules correspondants seront activés.
          </p>
        </div>

        <form onSubmit={(event) => void addDomain(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-xs font-bold">
            Nom de domaine
            <Input
              data-testid="input-public-site-domain"
              className="mt-1.5 h-11"
              value={domainInput}
              onChange={(event) => setDomainInput(event.target.value)}
              placeholder="site.exemple.sn"
              maxLength={253}
              disabled={busy}
            />
          </label>
          <Button data-testid="button-add-public-site-domain" type="submit" disabled={busy || !domainInput.trim()}>
            Ajouter le domaine
          </Button>
        </form>

        {error && <p role="alert" className="rounded-lg bg-[hsl(var(--destructive)/.08)] p-3 text-sm text-[hsl(var(--destructive))]">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-[hsl(var(--primary)/.08)] p-3 text-sm text-[hsl(var(--primary))]">{notice}</p>}

        {loading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Chargement des domaines…</p>
        ) : domains.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-[hsl(var(--muted-foreground))]">
            Aucun domaine personnalisé n’est encore connecté.
          </p>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <article key={domain.id} data-testid={`card-public-site-domain-${domain.id}`} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="break-all">{domain.domain}</strong>
                      <Badge variant={domain.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {domain.status === 'ACTIVE' ? 'Actif' : 'À vérifier'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {domain.status === 'ACTIVE'
                        ? 'Le site public est associé à ce domaine.'
                        : 'Le domaine sera actif après la configuration DNS et sa vérification.'}
                    </p>
                    <div className="mt-4 grid gap-3 rounded-lg bg-[hsl(var(--muted)/.35)] p-3 text-xs sm:grid-cols-2">
                      <div>
                        <p className="font-bold">Enregistrement TXT</p>
                        <p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Nom : {domain.verificationName}</p>
                        <p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Valeur : {domain.verificationValue}</p>
                      </div>
                      <div>
                        <p className="font-bold">Cible DNS Render</p>
                        <p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Cible : {domain.targetHost}</p>
                        <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                          Configurez le CNAME demandé par Render vers cette cible. Pour un domaine racine, utilisez
                          les enregistrements A/ANAME indiqués par Render, puis attendez la propagation DNS.
                        </p>
                      </div>
                    </div>
                    {domain.lastError && <p className="mt-3 text-xs text-[hsl(var(--destructive))]">{domain.lastError}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      data-testid={`button-verify-public-site-domain-${domain.id}`}
                      disabled={busy}
                      onClick={() => verifyDomain(domain)}
                    >
                      <RefreshCw size={14} className="mr-1.5" />
                      Vérifier
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      data-testid={`button-remove-public-site-domain-${domain.id}`}
                      disabled={busy}
                      onClick={() => removeDomain(domain)}
                    >
                      <Trash2 size={14} className="mr-1.5" />
                      Retirer
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}