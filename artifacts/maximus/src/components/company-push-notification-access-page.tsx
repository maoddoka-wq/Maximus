import { useEffect, useMemo, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/maximus-design-system/components/ui/select';
import { CompanyPushNotificationAccess } from '@/components/company-push-notification-access';
import type { StoreData } from '@/lib/store';

export function CompanyPushNotificationAccessPage({ data }: { data: StoreData }) {
  const companies = useMemo(
    () => [...data.companies].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [data.companies],
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => companies[0]?.id ?? '');

  useEffect(() => {
    setSelectedCompanyId((current) =>
      companies.some((company) => company.id === current) ? current : companies[0]?.id ?? '',
    );
  }, [companies]);

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <h2 className="font-bold">Choisir une entreprise</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          MAXIMUS contrôle l’accès aux notifications push. Après activation, chaque personne doit encore autoriser
          les notifications sur son propre navigateur ou appareil.
        </p>
        {companies.length > 0 ? (
          <div className="mt-4 max-w-xl">
            <label htmlFor="push-access-company" className="mb-2 block text-sm font-semibold">
              Entreprise
            </label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger id="push-access-company" data-testid="select-push-access-company">
                <SelectValue placeholder="Choisir une entreprise" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-[hsl(var(--muted-foreground))]">
            Aucune entreprise n’est disponible pour le moment.
          </p>
        )}
      </section>

      {selectedCompany && (
        <CompanyPushNotificationAccess
          key={selectedCompany.id}
          companyId={selectedCompany.id}
          companyName={selectedCompany.name}
        />
      )}
    </div>
  );
}
