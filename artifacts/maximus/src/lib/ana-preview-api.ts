import { requestJson } from '@/lib/api-request';
import type { PresenceItem } from '@/lib/presence-api';
import type { StockBootstrap } from '@/lib/stock-api';
import type { Company, StoreData } from '@/lib/store';

export type AnaPreviewProfileKind = 'platform-admin' | 'company-admin' | 'employee';

export interface AnaPreviewProfile {
  id: string;
  name: string;
  roleTitle: string;
  group: string;
  kind: AnaPreviewProfileKind;
  employeeId?: string;
}

export interface AnaPreviewPayload {
  company: Company;
  profiles: AnaPreviewProfile[];
  storeData: Partial<StoreData>;
  stockData: StockBootstrap;
  presenceData: { items: PresenceItem[] };
  readOnly: true;
}

export function loadAnaPreview(): Promise<AnaPreviewPayload> {
  return requestJson<AnaPreviewPayload>('/preview/ana', { method: 'GET' });
}