type CompanyIdentity = {
  id: string;
  status?: string;
};

type CompanySubscriptionRecord = {
  companyId: string;
};

const archivedCompanyStatuses = new Set(['ARCHIVÉ', 'ARCHIVED']);

export function filterSubscriptionsForVisibleCompanies<T extends CompanySubscriptionRecord>(
  subscriptions: readonly T[],
  companies: readonly CompanyIdentity[],
): T[] {
  const visibleCompanyIds = new Set(
    companies
      .filter(company => !archivedCompanyStatuses.has(company.status ?? ''))
      .map(company => company.id),
  );

  return subscriptions.filter(subscription => visibleCompanyIds.has(subscription.companyId));
}