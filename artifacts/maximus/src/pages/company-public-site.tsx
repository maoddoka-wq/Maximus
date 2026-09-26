import { useEffect, useMemo, useState } from 'react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Checkbox } from '@workspace/maximus-design-system/components/ui/checkbox';
import { Input } from '@workspace/maximus-design-system/components/ui/input';
import { Switch } from '@workspace/maximus-design-system/components/ui/switch';
import { showAppToast } from '@workspace/maximus-design-system/hooks/use-toast';
import type { Company } from '@/lib/store';
import {
  publicSiteApi,
  type CompanyPublicSiteBrand,
  type CompanyPublicSiteSettings,
} from '@/lib/public-site-api';

export function CompanyPublicSitePanel({ company }: { company: Company }) {
  const [settings, setSettings] = useState<CompanyPublicSiteSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [moduleIds, setModuleIds] = useState<string[]>([]);
  const [brand, setBrand] = useState<Pick<
    CompanyPublicSiteBrand,
    'name' | 'slug' | 'description' | 'primaryColor' | 'accentColor'
  >>({
    name: '',
    slug: '',
    description: '',
    primaryColor: '#2563EB',
    accentColor: '#0F172A',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFiles, setHeroFiles] = useState<File[]>([]);
  const [domainInput, setDomainInput] = useState('');
  const [domainBusy, setDomainBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const availableModuleIds = useMemo(
    () => new Set(settings?.availableModules.map(module => module.id) ?? []),
    [settings?.availableModules],
  );
  const normalizedModuleIds = useMemo(
    () => [...new Set(moduleIds)].filter(id => availableModuleIds.has(id)).sort(),
    [availableModuleIds, moduleIds],
  );
  const savedModuleIds = useMemo(
    () => [...new Set(settings?.moduleIds ?? [])].filter(id => availableModuleIds.has(id)).sort(),
    [availableModuleIds, settings?.moduleIds],
  );
  const dirty =
    settings !== null
    && (enabled !== settings.enabled
      || JSON.stringify(normalizedModuleIds) !== JSON.stringify(savedModuleIds)
      || brand.name !== settings.brand.name
      || brand.slug !== settings.brand.slug
      || brand.description !== settings.brand.description
      || brand.primaryColor.toUpperCase() !== settings.brand.primaryColor.toUpperCase()
      || brand.accentColor.toUpperCase() !== settings.brand.accentColor.toUpperCase());

  const applySettings = (result: CompanyPublicSiteSettings) => {
    setSettings(result);
    setEnabled(result.enabled);
    setModuleIds(result.moduleIds);
    setBrand({
      name: result.brand.name,
      slug: result.brand.slug,
      description: result.brand.description,
      primaryColor: result.brand.primaryColor,
      accentColor: result.brand.accentColor,
    });
  };

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await publicSiteApi.company();
      applySettings(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Les paramètres du site public sont indisponibles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void publicSiteApi.company()
      .then(result => {
        if (cancelled) return;
          applySettings(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Les paramètres du site public sont indisponibles.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [company.id]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      let result = await publicSiteApi.updateCompany({
        enabled,
        moduleIds: normalizedModuleIds,
        brand,
      });
      if (logoFile) {
        result = await publicSiteApi.uploadLogo(logoFile);
        setLogoFile(null);
      }
      if (heroFiles.length > 0) {
        result = await publicSiteApi.uploadHeroImages(heroFiles);
        setHeroFiles([]);
      }
      applySettings(result);
      showAppToast('Les paramètres du site public sont enregistrés.', 'success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Les paramètres du site public n’ont pas pu être enregistrés.');
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (id: string, checked: boolean) => {
    setModuleIds(previous =>
      checked ? [...new Set([...previous, id])] : previous.filter(moduleId => moduleId !== id),
    );
  };

  const addDomain = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const domain = domainInput.trim();
    if (!domain || domainBusy) return;
    setDomainBusy('add');
    setError('');
    try {
      const created = await publicSiteApi.createDomain(domain);
      setSettings(current => current
        ? { ...current, domains: [...current.domains, created].sort((a, b) => a.domain.localeCompare(b.domain)) }
        : current);
      setDomainInput('');
      showAppToast('Domaine ajouté. Configurez le DNS puis lancez la vérification.', 'success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le domaine n’a pas pu être ajouté.');
    } finally {
      setDomainBusy('');
    }
  };

  const verifyDomain = async (id: string) => {
    if (domainBusy) return;
    setDomainBusy(id);
    setError('');
    try {
      const updated = await publicSiteApi.verifyDomain(id);
      setSettings(current => current
        ? { ...current, domains: current.domains.map(domain => domain.id === id ? updated : domain) }
        : current);
      showAppToast('Le domaine est vérifié.', 'success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La vérification du domaine a échoué.');
      try {
        const refreshed = await publicSiteApi.company();
        applySettings(refreshed);
      } catch {
        // Keep the DNS error visible if refreshing the settings also fails.
      }
    } finally {
      setDomainBusy('');
    }
  };

  const removeDomain = async (id: string) => {
    if (domainBusy) return;
    setDomainBusy(id);
    setError('');
    try {
      await publicSiteApi.deleteDomain(id);
      setSettings(current => current
        ? { ...current, domains: current.domains.filter(domain => domain.id !== id) }
        : current);
      showAppToast('Domaine retiré du site public.', 'success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le domaine n’a pas pu être retiré.');
    } finally {
      setDomainBusy('');
    }
  };

  const removeHeroImage = async (url: string) => {
    const imageId = url.split('/').pop();
    if (!imageId || saving) return;
    setSaving(true);
    setError('');
    try {
      applySettings(await publicSiteApi.deleteHeroImage(imageId));
      showAppToast('Image supprimée de l’accueil.', 'success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'L’image n’a pas pu être supprimée.');
    } finally {
      setSaving(false);
    }
  };

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const publicUrl = `${window.location.origin}${basePath}/shop/${encodeURIComponent(brand.slug || 'site')}`;

  return (
    <section className="card-surface space-y-6 rounded-2xl p-5 sm:p-7" data-testid="panel-company-public-site">
      <div>
        <p className="mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">
          Organisation & accès
        </p>
        <h2 className="mt-2 text-lg font-bold">Site public de l’entreprise</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          L’entreprise contrôle ici le nom public, l’adresse, la marque, les visuels et les domaines.
          E-commerce conserve ses réglages métier, comme la devise, les commandes et le catalogue.
        </p>
      </div>

      {loading ? (
        <p className="rounded-xl bg-[hsl(var(--muted)/.45)] p-4 text-sm text-[hsl(var(--muted-foreground))]" data-testid="status-company-public-site-loading">
          Chargement des paramètres…
        </p>
      ) : error && !settings ? (
        <div className="space-y-3" role="alert" data-testid="status-company-public-site-error">
          <p className="rounded-xl bg-[hsl(var(--destructive)/.08)] p-4 text-sm text-[hsl(var(--destructive))]">{error}</p>
          <Button type="button" variant="outline" onClick={() => void loadSettings()} data-testid="button-retry-company-public-site">
            Réessayer
          </Button>
        </div>
      ) : settings ? (
        <>
          {!settings.authorized && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900" data-testid="status-company-public-site-not-authorized">
              MAXIMUS n’a pas encore autorisé le site public pour cette entreprise. Contactez l’administration MAXIMUS pour demander cet accès.
            </p>
          )}

          <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Activer le site public</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {settings.authorized
                  ? 'L’activation publie les pages sélectionnées sur l’adresse publique de l’entreprise.'
                  : 'Cette option devient disponible après autorisation de MAXIMUS.'}
              </p>
            </div>
            <Switch
              checked={enabled}
              disabled={!settings.authorized || saving}
              onCheckedChange={setEnabled}
              aria-label="Activer le site public"
              data-testid="switch-company-public-site"
            />
          </div>

          <div className="space-y-5 rounded-xl border p-4 sm:p-5">
            <div>
              <h3 className="font-semibold">Identité du site de l’entreprise</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Ces réglages s’appliquent à l’accueil commun et aux rubriques publiques sélectionnées.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold">
                Nom affiché
                <Input
                  value={brand.name}
                  onChange={event => setBrand(current => ({ ...current, name: event.target.value }))}
                  maxLength={120}
                  disabled={saving}
                  className="mt-1.5"
                  data-testid="input-company-public-site-name"
                />
              </label>
              <label className="block text-xs font-bold">
                Adresse du site (slug)
                <Input
                  value={brand.slug}
                  onChange={event => setBrand(current => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                  maxLength={80}
                  disabled={saving}
                  className="mt-1.5"
                  data-testid="input-company-public-site-slug"
                />
              </label>
            </div>
            <label className="block text-xs font-bold">
              Description publique
              <textarea
                value={brand.description}
                onChange={event => setBrand(current => ({ ...current, description: event.target.value }))}
                rows={3}
                maxLength={500}
                disabled={saving}
                className="mt-1.5 w-full rounded-lg border bg-[hsl(var(--background))] px-3 py-2.5 text-sm"
                data-testid="textarea-company-public-site-description"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold">
                Logo du site
                <div className="mt-1.5 flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--muted))]">
                    {settings.brand.logoUrl
                      ? <img src={settings.brand.logoUrl} alt={`Logo de ${settings.brand.name}`} className="h-full w-full object-contain" />
                      : <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Aucun</span>}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={saving}
                    onChange={event => setLogoFile(event.target.files?.[0] ?? null)}
                    className="min-w-0 flex-1 text-xs"
                    data-testid="input-company-public-site-logo"
                  />
                </div>
                {logoFile && <span className="mt-1 block truncate text-[11px] font-normal text-[hsl(var(--muted-foreground))]">{logoFile.name}</span>}
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold">
                  Couleur principale
                  <Input
                    type="color"
                    value={brand.primaryColor}
                    onChange={event => setBrand(current => ({ ...current, primaryColor: event.target.value }))}
                    disabled={saving}
                    className="mt-1.5 h-11 p-1"
                    data-testid="input-company-public-site-primary-color"
                  />
                </label>
                <label className="block text-xs font-bold">
                  Couleur d’accent
                  <Input
                    type="color"
                    value={brand.accentColor}
                    onChange={event => setBrand(current => ({ ...current, accentColor: event.target.value }))}
                    disabled={saving}
                    className="mt-1.5 h-11 p-1"
                    data-testid="input-company-public-site-accent-color"
                  />
                </label>
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Images d’accueil</h4>
                  <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                    Jusqu’à 12 images JPG, PNG ou WebP, communes aux rubriques publiques.
                  </p>
                </div>
                <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
                  {settings.brand.heroImages.length}/12
                </span>
              </div>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                disabled={saving || settings.brand.heroImages.length + heroFiles.length >= 12}
                onChange={event => setHeroFiles(Array.from(event.target.files ?? []).slice(0, Math.max(0, 12 - settings.brand.heroImages.length)))}
                className="mt-3 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(var(--muted))] file:px-2.5 file:py-1.5 file:text-xs file:font-bold"
                data-testid="input-company-public-site-hero-images"
              />
              {heroFiles.length > 0 && <p className="mt-1 text-[11px] font-semibold text-[hsl(var(--primary))]">{heroFiles.length} image(s) sélectionnée(s)</p>}
              {settings.brand.heroImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {settings.brand.heroImages.map(url => (
                    <span key={url} className="relative">
                      <img src={url} alt="" className="h-20 w-28 rounded-lg object-cover" />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void removeHeroImage(url)}
                        className="absolute right-1 top-1 rounded-full bg-[hsl(var(--destructive))] px-1.5 py-0.5 text-[10px] font-bold text-white disabled:opacity-50"
                        aria-label="Supprimer cette image d’accueil"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.04)] p-4 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 text-xs font-bold">
                Adresse publique par slug
                <Input readOnly value={publicUrl} className="mt-1.5" />
              </label>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border px-3 py-2.5 text-xs font-bold"
                data-testid="link-company-public-site-preview"
              >
                Ouvrir
              </a>
            </div>
          </div>

          {settings.authorized && (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">Pages publiques des modules</h3>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Choisissez les rubriques à publier sur ce même site. Les accès et fonctionnalités propres à chaque module restent inchangés.
                </p>
              </div>
              {settings.availableModules.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-sm text-[hsl(var(--muted-foreground))]" data-testid="status-company-public-site-no-modules">
                  Aucun module actif ne propose actuellement de page publique pour cette entreprise.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {settings.availableModules.map(module => (
                    <label
                      key={module.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border p-4"
                      data-testid={`option-public-site-module-${module.id}`}
                    >
                      <Checkbox
                        checked={moduleIds.includes(module.id)}
                        disabled={saving}
                        onCheckedChange={checked => toggleModule(module.id, checked === true)}
                        aria-label={`Publier ${module.label}`}
                        data-testid={`checkbox-public-site-module-${module.id}`}
                      />
                      <span>
                        <span className="block text-sm font-semibold">{module.label}</span>
                        <span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
                          {module.path}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">Domaine public</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Gérez ici les domaines du site commun, indépendamment du module E-commerce.
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.04)] p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              <p className="font-bold text-[hsl(var(--foreground))]">Connexion d’un domaine</p>
              <p className="mt-1">Ajoutez d’abord le domaine dans les domaines personnalisés de Render pour provisionner HTTPS, puis configurez la cible et l’enregistrement TXT indiqués après l’ajout.</p>
            </div>
            <form onSubmit={event => void addDomain(event)} className="flex flex-col gap-3 sm:flex-row">
              <label className="min-w-0 flex-1 text-xs font-bold">
                Nom de domaine
                <Input
                  value={domainInput}
                  onChange={event => setDomainInput(event.target.value)}
                  placeholder="www.exemple.sn"
                  disabled={domainBusy !== ''}
                  className="mt-1.5"
                  data-testid="input-company-public-site-domain"
                />
              </label>
              <Button type="submit" disabled={!domainInput.trim() || domainBusy !== ''} className="self-end" data-testid="button-add-company-public-site-domain">
                {domainBusy === 'add' ? 'Ajout…' : 'Ajouter le domaine'}
              </Button>
            </form>
            {settings.domains.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-[hsl(var(--muted-foreground))]" data-testid="status-company-public-site-no-domain">
                Aucun domaine personnalisé n’est encore connecté.
              </p>
            ) : (
              <div className="space-y-2">
                {settings.domains.map(domain => (
                  <div key={domain.id} className="rounded-xl border p-4" data-testid={`domain-company-public-site-${domain.id}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <a href={`https://${domain.domain}`} target="_blank" rel="noreferrer" className="break-all font-semibold text-[hsl(var(--primary))] underline-offset-4 hover:underline">
                            {domain.domain}
                          </a>
                          <span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-bold">
                            {domain.status === 'ACTIVE' ? 'Actif' : 'À vérifier'}
                          </span>
                        </div>
                        {domain.lastError && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{domain.lastError}</p>}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button type="button" variant="outline" disabled={domainBusy !== ''} onClick={() => void verifyDomain(domain.id)} data-testid={`button-verify-company-public-site-domain-${domain.id}`}>
                          {domainBusy === domain.id ? 'Vérification…' : 'Vérifier'}
                        </Button>
                        <Button type="button" variant="outline" disabled={domainBusy !== ''} onClick={() => void removeDomain(domain.id)} data-testid={`button-remove-company-public-site-domain-${domain.id}`}>
                          Retirer
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 rounded-lg bg-[hsl(var(--muted)/.35)] p-3 text-xs sm:grid-cols-2">
                      <div>
                        <p className="font-bold">Enregistrement TXT de vérification</p>
                        <p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Nom : {domain.verificationName}</p>
                        <p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Valeur : {domain.verificationValue}</p>
                      </div>
                      <div>
                        <p className="font-bold">Cible DNS Render</p>
                        <p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Cible : {domain.targetHost}</p>
                        <p className="mt-1 text-[hsl(var(--muted-foreground))]">Configurez le CNAME du sous-domaine ou les enregistrements A/ANAME indiqués par Render, puis relancez la vérification.</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-[hsl(var(--destructive))]" role="alert" data-testid="status-company-public-site-save-error">{error}</p>}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void save()}
              disabled={(!dirty && !logoFile && heroFiles.length === 0) || saving}
              data-testid="button-save-company-public-site"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}