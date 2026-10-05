import { requestJson } from './api-request';

export type CompanyPushNotificationAccess = {
  companyId: string;
  enabled: boolean;
  updatedAt: string | null;
};

export function loadCompanyPushNotificationAccess(companyId: string): Promise<CompanyPushNotificationAccess> {
  return requestJson<CompanyPushNotificationAccess>(
    `/companies/${encodeURIComponent(companyId)}/notifications/push-access`,
    undefined,
    { fallbackMessage: 'Le réglage des notifications push est indisponible.' },
  );
}

export function setCompanyPushNotificationAccess(
  companyId: string,
  enabled: boolean,
): Promise<CompanyPushNotificationAccess> {
  return requestJson<CompanyPushNotificationAccess>(
    `/companies/${encodeURIComponent(companyId)}/notifications/push-access`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    },
    { fallbackMessage: 'Le réglage des notifications push n’a pas pu être enregistré.' },
  );
}
