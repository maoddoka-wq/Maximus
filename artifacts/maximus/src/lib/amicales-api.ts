import { requestJson } from './api-request';

export type AmicaleMemberStatus = 'ACTIVE' | 'ARCHIVED';
export type AmicaleExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
export type AmicaleActivityStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED';
export type AmicaleAnnouncementStatus = 'DRAFT' | 'PUBLISHED';

export interface AmicaleMember {
  id: string;
  companyId: string;
  reference: string;
  name: string;
  studentIdentifier: string;
  email: string;
  phone: string;
  faculty: string;
  studyYear: string;
  joinedAt: string;
  office: string;
  mandateStart: string;
  mandateEnd: string;
  notes: string;
  status: AmicaleMemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AmicaleContribution {
  id: string;
  companyId: string;
  reference: string;
  memberId: string;
  memberName: string;
  period: string;
  amount: number;
  paidOn: string;
  method: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'OTHER';
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface AmicaleExpense {
  id: string;
  companyId: string;
  reference: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  vendor: string;
  status: AmicaleExpenseStatus;
  decisionNote: string;
  createdBy: string;
  approvedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AmicaleActivity {
  id: string;
  companyId: string;
  reference: string;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  participantCount: number;
  attendeeCount: number;
  status: AmicaleActivityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AmicaleAnnouncement {
  id: string;
  companyId: string;
  reference: string;
  title: string;
  body: string;
  status: AmicaleAnnouncementStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AmicaleBootstrap {
  members: AmicaleMember[];
  contributions: AmicaleContribution[];
  expenses: AmicaleExpense[];
  activities: AmicaleActivity[];
  announcements: AmicaleAnnouncement[];
}

export type AmicaleMemberInput = Pick<AmicaleMember, 'name'> & Partial<
  Omit<AmicaleMember, 'id' | 'companyId' | 'reference' | 'status' | 'createdAt' | 'updatedAt' | 'name'>
>;

export type AmicaleContributionInput = {
  memberId: string;
  period: string;
  amount: number;
  paidOn: string;
  method: AmicaleContribution['method'];
  note?: string;
};

export type AmicaleExpenseInput = {
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  description?: string;
  vendor?: string;
};

export type AmicaleActivityInput = {
  title: string;
  description?: string;
  location?: string;
  eventDate: string;
  participantCount?: number;
  attendeeCount?: number;
  status?: AmicaleActivityStatus;
};

export type AmicaleAnnouncementInput = {
  title: string;
  body: string;
  status?: AmicaleAnnouncementStatus;
};

const request = <T>(path: string, options?: RequestInit) =>
  requestJson<T>(path, options, {
    fallbackMessage: 'Le module Amicale étudiante est indisponible.',
  });

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const createAmicaleApi = (companyId: string) => {
  const scopedPath = (path: string) =>
    `${path}?companyId=${encodeURIComponent(companyId)}`;

  return {
    bootstrap: () => request<AmicaleBootstrap>(scopedPath('/amicales/bootstrap')),
    createMember: (body: AmicaleMemberInput) =>
      request<{ member: AmicaleMember }>(scopedPath('/amicales/members'), json(body)),
    updateMember: (id: string, body: Partial<AmicaleMemberInput>) =>
      request<{ member: AmicaleMember }>(
        scopedPath(`/amicales/members/${encodeURIComponent(id)}`),
        { ...json(body), method: 'PATCH' },
      ),
    archiveMember: (id: string) =>
      request<{ member: AmicaleMember }>(
        scopedPath(`/amicales/members/${encodeURIComponent(id)}/archive`),
        json({}),
      ),
    createContribution: (body: AmicaleContributionInput) =>
      request<{ contribution: AmicaleContribution }>(
        scopedPath('/amicales/contributions'),
        json(body),
      ),
    createExpense: (body: AmicaleExpenseInput) =>
      request<{ expense: AmicaleExpense }>(scopedPath('/amicales/expenses'), json(body)),
    decideExpense: (id: string, status: 'APPROVED' | 'REJECTED', decisionNote?: string) =>
      request<{ expense: AmicaleExpense }>(
        scopedPath(`/amicales/expenses/${encodeURIComponent(id)}/decision`),
        json({ status, decisionNote }),
      ),
    markExpensePaid: (id: string) =>
      request<{ expense: AmicaleExpense }>(
        scopedPath(`/amicales/expenses/${encodeURIComponent(id)}/paid`),
        json({}),
      ),
    createActivity: (body: AmicaleActivityInput) =>
      request<{ activity: AmicaleActivity }>(scopedPath('/amicales/activities'), json(body)),
    updateActivity: (id: string, body: Partial<AmicaleActivityInput>) =>
      request<{ activity: AmicaleActivity }>(
        scopedPath(`/amicales/activities/${encodeURIComponent(id)}`),
        { ...json(body), method: 'PATCH' },
      ),
    createAnnouncement: (body: AmicaleAnnouncementInput) =>
      request<{ announcement: AmicaleAnnouncement }>(
        scopedPath('/amicales/announcements'),
        json(body),
      ),
    updateAnnouncement: (id: string, body: Partial<AmicaleAnnouncementInput>) =>
      request<{ announcement: AmicaleAnnouncement }>(
        scopedPath(`/amicales/announcements/${encodeURIComponent(id)}`),
        { ...json(body), method: 'PATCH' },
      ),
  };
};
