import { useEffect, useState } from 'react';

import { Switch } from '@workspace/maximus-design-system/components/ui/switch';
import {
  loadCompanyPushNotificationAccess,
  setCompanyPushNotificationAccess,
  type CompanyPushNotificationAccess as CompanyPushAccess,
} from '@/lib/company-push-notification-api';

type Props = {
  companyId: string;
  companyName: string;
  dedicatedInstallation?: boolean;
};

export function CompanyPushNotificationAccess({
  companyId,
  companyName,
  dedicatedInstallation = false,
}: Props) {
  const [access, setAccess] = useState<CompanyPushAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAccess(null);
    setError('');

    void loadCompanyPushNotificationAccess(companyId)
      .then((result) => {
        if (!cancelled) setAccess(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Le réglage des notifications push est indisponible.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const updateAccess = async (enabled: boolean) => {
    if (saving || !access) return;

    setSaving(true);
    setError('');
    try {
      setAccess(await setCompanyPushNotificationAccess(companyId, enabled));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le réglage des notifications push n’a pas pu être enregistré.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="card-surface rounded-2xl border border-[hsl(var(--primary)/.25)] p-6"
      aria-labelledby="company-push-access-title"
      data-testid="company-push-access"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">
            Réservé à l’administration MAXIMUS
          </p>
          <h2 id="company-push-access-title" className="mt-2 text-xl font-bold">
            Notifications push de {companyName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Autorisez ou bloquez les notifications hors application pour cette entreprise. Chaque personne doit
            toujours accepter les notifications dans son propre navigateur.
            {dedicatedInstallation
              ? ' Le réglage sera appliqué sur l’installation dédiée à sa prochaine synchronisation.'
              : ''}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[hsl(var(--muted))] px-3 py-1.5 text-xs font-bold">
          {loading ? 'Chargement…' : access?.enabled ? 'Autorisées' : 'Bloquées'}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-[hsl(var(--muted))] p-4">
        <div>
          <h3 className="text-sm font-semibold">Autoriser les notifications push</h3>
          <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            {access?.enabled
              ? 'Les appareils autorisés de cette entreprise peuvent recevoir des alertes.'
              : 'Désactivées par défaut. Les abonnements individuels existants sont conservés.'}
          </p>
        </div>
        <Switch
          aria-label={`Autoriser les notifications push pour ${companyName}`}
          checked={Boolean(access?.enabled)}
          disabled={loading || saving || !access}
          onCheckedChange={(enabled) => void updateAccess(enabled)}
        />
      </div>

      {error && (
        <p
          className="mt-3 rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-sm text-[hsl(var(--destructive))]"
          role="alert"
        >
          {error}
        </p>
      )}
      {saving && <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">Enregistrement…</p>}
    </section>
  );
}
