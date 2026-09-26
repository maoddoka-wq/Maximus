import { useEffect, useMemo, useState } from 'react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Checkbox } from '@workspace/maximus-design-system/components/ui/checkbox';
import { Switch } from '@workspace/maximus-design-system/components/ui/switch';
import { showAppToast } from '@workspace/maximus-design-system/hooks/use-toast';
import type { Company } from '@/lib/store';
import {
  publicSiteApi,
  type CompanyPublicSiteSettings,
} from '@/lib/public-site-api';

export function CompanyPublicSitePanel({ company }: { company: Company }) {
  const [settings, setSettings] = useState<CompanyPublicSiteSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [moduleIds, setModuleIds] = useState<string[]>([]);
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
      || JSON.stringify(normalizedModuleIds) !== JSON.stringify(savedModuleIds));

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await publicSiteApi.company();
      setSettings(result);
      setEnabled(result.enabled);
      setModuleIds(result.moduleIds);
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
        setSettings(result);
        setEnabled(result.enabled);
        setModuleIds(result.moduleIds);
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
      const result = await publicSiteApi.updateCompany({
        enabled,
        moduleIds: normalizedModuleIds,
      });
      setSettings(result);
      setEnabled(result.enabled);
      setModuleIds(result.moduleIds);
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

  return (
    <section className="card-surface space-y-6 rounded-2xl p-5 sm:p-7" data-testid="panel-company-public-site">
      <div>
        <p className="mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">
          Organisation & accès
        </p>
        <h2 className="mt-2 text-lg font-bold">Site public de l’entreprise</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Le site public appartient à l’entreprise, pas à E-commerce ni à un autre module.
          Il conserve le domaine déjà utilisé par les boutiques; les modules autorisés peuvent y publier leurs pages.
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
                  ? 'L’activation publie le site sur le domaine de boutique déjà associé.'
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

          {settings.authorized && (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">Pages publiques des modules</h3>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Seuls les modules actifs pour l’entreprise et enregistrés pour le site public peuvent être sélectionnés.
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
                Le site public utilise les domaines déjà rattachés aux boutiques; aucun nouveau domaine n’est créé ici.
              </p>
            </div>
            {settings.domains.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-[hsl(var(--muted-foreground))]" data-testid="status-company-public-site-no-domain">
                Aucun domaine de boutique n’est encore associé à cette entreprise.
              </p>
            ) : (
              <div className="space-y-2">
                {settings.domains.map(domain => (
                  <div key={domain.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between" data-testid={`domain-company-public-site-${domain.id}`}>
                    <a
                      href={`https://${domain.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-semibold text-[hsl(var(--primary))] underline-offset-4 hover:underline"
                      data-testid={`link-company-public-site-domain-${domain.id}`}
                    >
                      {domain.domain}
                    </a>
                    <span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-bold">
                      {domain.status === 'ACTIVE' ? 'Actif' : 'Vérification requise'}
                    </span>
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
              disabled={!settings.authorized || !dirty || saving}
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