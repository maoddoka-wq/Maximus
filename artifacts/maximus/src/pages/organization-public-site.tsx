import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, ExternalLink, Globe2, ImagePlus, Store } from 'lucide-react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Input } from '@workspace/maximus-design-system/components/ui/input';
import type { Company } from '@/lib/store';
import type { EcommerceStore } from '@/lib/ecommerce-api';
import { companyRequestApi } from '@/lib/company-request-api';
import { OrganizationPublicSiteDomains } from './organization-public-site-domains';

type PublicSiteForm = Pick<
  EcommerceStore,
  'name' | 'slug' | 'status' | 'description' | 'primaryColor' | 'accentColor' | 'homepageEnabled'
>;

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function OrganizationPublicSite({ company }: { company: Company }) {
  const [store, setStore] = useState<EcommerceStore | null>(null);
  const [form, setForm] = useState<PublicSiteForm | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFiles, setHeroFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void companyRequestApi.publicSiteSettings(company.id)
      .then(({ store: loadedStore }) => {
        if (cancelled) return;
        setStore(loadedStore);
        setForm({
          name: loadedStore.name,
          slug: loadedStore.slug,
          status: loadedStore.status,
          description: loadedStore.description,
          primaryColor: loadedStore.primaryColor,
          accentColor: loadedStore.accentColor,
          homepageEnabled: loadedStore.homepageEnabled,
        });
        setSlugEdited(false);
      })
      .catch((cause) => {
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

  const publicBasePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const publicUrl = form
    ? `${window.location.origin}${publicBasePath}/shop/${encodeURIComponent(slugify(form.slug) || 'boutique')}`
    : '';

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    setSaving(true);
    setError('');
    setNotice('');
    try {
      let result = await companyRequestApi.updatePublicSiteSettings(company.id, form);
      if (logoFile) {
        result = await companyRequestApi.uploadPublicSiteLogo(company.id, logoFile);
      }
      setStore(result.store);
      setForm({
        name: result.store.name,
        slug: result.store.slug,
        status: result.store.status,
        description: result.store.description,
        primaryColor: result.store.primaryColor,
        accentColor: result.store.accentColor,
        homepageEnabled: result.store.homepageEnabled,
      });
      setLogoFile(null);
      setNotice('Les paramètres du site public ont été enregistrés.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Les paramètres n’ont pas pu être enregistrés.');
    } finally {
      setSaving(false);
    }
  };

  const uploadHeroImages = async () => {
    if (!store || heroFiles.length === 0) return;

    setSaving(true);
    setError('');
    setNotice('');
    try {
      for (const file of heroFiles) {
        const result = await companyRequestApi.uploadPublicSiteHeroImages(company.id, [file]);
        setStore(result.store);
        setHeroFiles(current => current.slice(1));
      }
      setNotice('Les images de la bannière ont été ajoutées.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Les images de la bannière n’ont pas pu être envoyées.');
    } finally {
      setSaving(false);
    }
  };

  const deleteHeroImage = async (url: string) => {
    if (!store) return;
    const imageId = url.split('/').pop();
    if (!imageId) return;

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await companyRequestApi.deletePublicSiteHeroImage(company.id, imageId);
      setStore(result.store);
      setNotice('L’image a été retirée de la bannière.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'L’image n’a pas pu être supprimée.');
    } finally {
      setSaving(false);
    }
  };

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Le lien n’a pas pu être copié depuis ce navigateur.');
    }
  };

  return (
    <section className="card-surface rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Site public</h2>
          <p className="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
            Gérez l’identité et la publication de votre site, indépendamment des réglages de ses modules.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[hsl(var(--muted))] px-3 py-1.5 text-xs font-bold">
          <Globe2 size={14} />
          {loading ? 'Chargement…' : form?.status === 'PUBLISHED' ? 'Publié' : form?.status === 'SUSPENDED' ? 'Suspendu' : 'Brouillon'}
        </span>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-[hsl(var(--muted-foreground))]">Chargement des paramètres…</p>
      ) : form && store ? (
        <form onSubmit={save} className="mt-6 max-w-3xl space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Nom public
              <Input
                data-testid="input-public-site-name"
                className="mt-1.5 h-11"
                minLength={2}
                maxLength={120}
                required
                value={form.name}
                disabled={saving}
                onChange={(event) => setForm(current => current ? {
                  ...current,
                  name: event.target.value,
                  ...(!slugEdited ? { slug: slugify(event.target.value) } : {}),
                } : current)}
              />
            </label>
            <label className="block text-xs font-bold">
              Adresse publique (slug)
              <Input
                data-testid="input-public-site-slug"
                className="mt-1.5 h-11"
                minLength={3}
                maxLength={80}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                value={form.slug}
                disabled={saving}
                onChange={(event) => {
                  setSlugEdited(true);
                  setForm(current => current ? { ...current, slug: slugify(event.target.value) } : current);
                }}
              />
            </label>
          </div>

          <label className="block max-w-sm text-xs font-bold">
            Logo du site
            <div className="mt-1.5 flex items-center gap-3 rounded-lg border bg-[hsl(var(--card))] p-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--muted))]">
                {store.logoUrl
                  ? <img src={store.logoUrl} alt={`Logo de ${store.name}`} className="h-full w-full object-contain" />
                  : <Store size={18} className="text-[hsl(var(--muted-foreground))]" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">Image JPG, PNG ou WebP · 5 Mo maximum</span>
                <input
                  data-testid="input-public-site-logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={saving}
                  onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full text-xs"
                />
              </span>
              <ImagePlus size={16} className="shrink-0 text-[hsl(var(--muted-foreground))]" />
            </div>
          </label>
          {logoFile && <p className="-mt-3 text-xs text-[hsl(var(--muted-foreground))]">Nouveau logo : {logoFile.name}</p>}

          <label className="block max-w-sm text-xs font-bold">
            Statut de publication
            <select
              data-testid="select-public-site-status"
              value={form.status}
              disabled={saving}
              onChange={(event) => setForm(current => current ? {
                ...current,
                status: event.target.value as EcommerceStore['status'],
              } : current)}
              className="mt-1.5 h-11 w-full rounded-lg border bg-[hsl(var(--background))] px-3 text-sm font-medium"
            >
              <option value="DRAFT">Brouillon</option>
              <option value="PUBLISHED">Publié</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>
          </label>

          <label className="flex items-start gap-3 rounded-xl border p-4">
            <input
              data-testid="checkbox-public-homepage-enabled"
              type="checkbox"
              checked={form.homepageEnabled}
              disabled={saving}
              onChange={event => setForm(current => current ? {
                ...current,
                homepageEnabled: event.target.checked,
              } : current)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-bold">Activer la page d’accueil publique</span>
              <span className="mt-1 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                Les autres rubriques publiques restent accessibles lorsque cette page est désactivée.
              </span>
            </span>
          </label>

          <label className="block text-xs font-bold">
            Description de la page d’accueil
            <textarea
              data-testid="textarea-public-homepage-description"
              maxLength={500}
              rows={4}
              disabled={saving}
              value={form.description}
              onChange={event => setForm(current => current ? { ...current, description: event.target.value } : current)}
              className="mt-1.5 w-full rounded-lg border bg-[hsl(var(--background))] px-3 py-2.5 text-sm font-normal"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ['primaryColor', 'Couleur principale'],
              ['accentColor', 'Couleur d’accent'],
            ] as const).map(([key, label]) => (
              <label key={key} className="block text-xs font-bold">
                {label}
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="color"
                    value={form[key]}
                    disabled={saving}
                    onChange={event => setForm(current => current ? { ...current, [key]: event.target.value } : current)}
                    className="h-11 w-12 rounded-lg border p-1"
                    aria-label={`${label} — sélecteur`}
                  />
                  <Input
                    value={form[key]}
                    disabled={saving}
                    maxLength={7}
                    pattern="#[0-9a-fA-F]{6}"
                    onChange={event => setForm(current => current ? { ...current, [key]: event.target.value } : current)}
                    className="h-11"
                    aria-label={label}
                  />
                </div>
              </label>
            ))}
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold">Bannière défilante</p>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  Ajoutez jusqu’à 12 images JPG, PNG ou WebP. Plusieurs images défilent automatiquement sur l’accueil public.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-xs font-bold">
                {store.heroImages.length}/12
              </span>
            </div>
            <input
              data-testid="input-public-homepage-hero-images"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={saving || store.heroImages.length >= 12}
              onChange={event => setHeroFiles(Array.from(event.target.files ?? []).slice(0, 12 - store.heroImages.length))}
              className="mt-3 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(var(--muted))] file:px-2.5 file:py-1.5 file:text-xs file:font-bold"
            />
            {heroFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-[hsl(var(--primary))]">
                  {heroFiles.length} image(s) sélectionnée(s)
                </p>
                <Button type="button" size="sm" onClick={() => void uploadHeroImages()} disabled={saving}>
                  <ImagePlus size={14} className="mr-2" />
                  {saving ? 'Envoi…' : 'Ajouter à la bannière'}
                </Button>
              </div>
            )}
            {store.heroImages.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {store.heroImages.map((url, index) => (
                  <div key={url} className="group relative overflow-hidden rounded-lg border bg-[hsl(var(--muted)/.25)]">
                    <img src={url} alt={`Image de la bannière ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void deleteHeroImage(url)}
                      aria-label={`Retirer l’image ${index + 1} de la bannière`}
                      className="absolute right-2 top-2 rounded-full bg-[hsl(var(--destructive))] px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed px-3 py-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                Aucune image personnalisée. Le visuel par défaut est utilisé.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.04)] p-4">
            <label className="block text-xs font-bold">
              Lien public
              <Input
                readOnly
                value={publicUrl}
                className="mt-1.5 h-11 bg-[hsl(var(--card))]"
                aria-label="Lien public du site"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void copyPublicUrl()}>
                <Copy size={14} className="mr-2" />
                {copied ? 'Copié' : 'Copier le lien'}
              </Button>
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} className="mr-2" />
                  Ouvrir le site
                </a>
              </Button>
            </div>
          </div>

          <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            La publication de l’entreprise et l’autorisation MAXIMUS sont deux contrôles distincts.
            Les pages et fonctions accessibles dépendent toujours des modules autorisés.
          </p>

          {error && <p role="alert" className="rounded-lg bg-[hsl(var(--destructive)/.08)] p-3 text-sm text-[hsl(var(--destructive))]">{error}</p>}
          {notice && <p role="status" className="rounded-lg bg-[hsl(var(--primary)/.08)] p-3 text-sm text-[hsl(var(--primary))]">{notice}</p>}

          <div className="flex justify-end border-t pt-4">
            <Button data-testid="button-save-public-site" type="submit" disabled={saving}>
              <Check size={15} className="mr-2" />
              {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6 space-y-3">
          {error && <p role="alert" className="rounded-lg bg-[hsl(var(--destructive)/.08)] p-3 text-sm text-[hsl(var(--destructive))]">{error}</p>}
          <Button variant="outline" disabled={loading} onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      )}
      <OrganizationPublicSiteDomains key={company.id} companyId={company.id} />
    </section>
  );
}