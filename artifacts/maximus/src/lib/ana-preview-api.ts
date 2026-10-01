import { requestJson } from '@/lib/api-request';

export type AnaPreviewSectionId = 'overview' | 'organization' | 'presences' | 'stocks';
export type AnaPreviewProfileKind = 'platform-admin' | 'company-admin' | 'director' | 'manager' | 'employee';
export type AnaPreviewPresenceAccess = 'team' | 'self' | 'none';
export type AnaPreviewStockAccess = 'manage' | 'read' | 'request' | 'none';

export interface AnaPreviewProfile {
  id: string;
  name: string;
  roleTitle: string;
  group: string;
  kind: AnaPreviewProfileKind;
  employeeId?: string;
  unitId?: string;
  moduleIds: string[];
  sectionIds: AnaPreviewSectionId[];
  accessLabels: string[];
  presenceAccess: AnaPreviewPresenceAccess;
  stockAccess: AnaPreviewStockAccess;
}

export interface AnaPreviewCompany {
  id: string;
  name: string;
  manager: string;
  country: string;
  sector: string;
  status: string;
  modules: Array<{ id: string; name: string }>;
}

export interface AnaPreviewEmployee {
  id: string;
  name: string;
  roleTitle: string;
  unitId: string;
  unitName: string;
  roleId: string;
  status: string;
  moduleIds: string[];
}

export interface AnaPreviewUnit {
  id: string;
  name: string;
  parentId: string | null;
  managerEmployeeId: string;
  managerName: string;
  moduleIds: string[];
}

export interface AnaPreviewProduct {
  id: string;
  reference: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minimumQuantity: number;
}

export interface AnaPreviewMovement {
  id: string;
  date: string;
  reference: string;
  productName: string;
  type: 'ENTRÉE' | 'SORTIE';
  quantity: number;
  employeeName: string;
  reason: string;
}

export interface AnaPreviewAttendance {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  unitName: string;
  arrival: string;
  departure: string;
  status: 'Présent' | 'En retard' | 'Absent';
}

export interface AnaPreviewPayload {
  company: AnaPreviewCompany;
  profiles: AnaPreviewProfile[];
  employees: AnaPreviewEmployee[];
  units: AnaPreviewUnit[];
  products: AnaPreviewProduct[];
  movements: AnaPreviewMovement[];
  attendance: AnaPreviewAttendance[];
  readOnly: true;
}

export function loadAnaPreview(): Promise<AnaPreviewPayload> {
  return requestJson<AnaPreviewPayload>('/preview/ana', { method: 'GET' });
}