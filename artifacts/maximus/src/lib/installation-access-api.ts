import { requestJson } from './api-request';

export interface ErpAddress {
  id: string;
  installationId: string;
  url: string;
  hostname: string;
  status: 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'ERROR';
  isPrimary: boolean;
  validationMethod: 'local' | 'public';
  verificationName: string | null;
  verificationValue: string | null;
  lastError: string | null;
  verifiedAt: string | null;
}

export interface Installation {
  id: string;
  mode: 'dedicated' | 'on_premise';
  status: string;
  endpointUrl: string | null;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
  configurationVersion: number;
  revokedAt: string | null;
  addresses: ErpAddress[];
}

export interface InstallationAccessResponse {
  installations: Installation[];
  centralLoginUrl: string;
  primaryInstallationId: string | null;
}

export const installationAccessApi = {
  get: (companyId: string) =>
    requestJson<InstallationAccessResponse>(
      `/companies/${encodeURIComponent(companyId)}/installation-access`,
      { method: 'GET' }
    ),

  addAddress: (companyId: string, installationId: string, url: string) =>
    requestJson<{ ok: true; address: ErpAddress }>(
      `/companies/${encodeURIComponent(companyId)}/installation-access/${encodeURIComponent(installationId)}/addresses`,
      { method: 'POST', body: JSON.stringify({ url }) }
    ),

  verifyAddress: (companyId: string, installationId: string, addressId: string) =>
    requestJson<{ ok: true; address: ErpAddress }>(
      `/companies/${encodeURIComponent(companyId)}/installation-access/${encodeURIComponent(installationId)}/addresses/${encodeURIComponent(addressId)}/verify`,
      { method: 'POST' }
    ),

  activateAddress: (companyId: string, installationId: string, addressId: string) =>
    requestJson<{ ok: true; address: ErpAddress }>(
      `/companies/${encodeURIComponent(companyId)}/installation-access/${encodeURIComponent(installationId)}/addresses/${encodeURIComponent(addressId)}/activate`,
      { method: 'POST' }
    ),

  removeAddress: (companyId: string, installationId: string, addressId: string) =>
    requestJson<{ ok: true }>(
      `/companies/${encodeURIComponent(companyId)}/installation-access/${encodeURIComponent(installationId)}/addresses/${encodeURIComponent(addressId)}`,
      { method: 'DELETE' }
    ),
    
  rotateInstallationToken: (companyId: string, installationId: string, mode: 'dedicated' | 'on_premise') =>
    requestJson<{ ok: true; bootstrap: any }>(
      `/companies/${encodeURIComponent(companyId)}/installations/${encodeURIComponent(installationId)}`,
      { method: 'POST', body: JSON.stringify({ mode }) }
    ),

  revokeInstallation: (companyId: string, installationId: string) =>
    requestJson<{ ok: true }>(
      `/companies/${encodeURIComponent(companyId)}/installations/${encodeURIComponent(installationId)}`,
      { method: 'DELETE' }
    ),

  useAsPrimary: (companyId: string, installationId: string) =>
    requestJson<{ ok: true }>(
      `/companies/${encodeURIComponent(companyId)}/installation-access/${encodeURIComponent(installationId)}/use-as-primary`,
      { method: 'POST', body: JSON.stringify({ confirmedReady: true }) }
    ),

  removePrimary: (companyId: string) =>
    requestJson<{ ok: true }>(
      `/companies/${encodeURIComponent(companyId)}/installation-access/primary`,
      { method: 'DELETE' }
    ),
};
