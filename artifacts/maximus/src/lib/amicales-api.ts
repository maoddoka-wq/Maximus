import { requestJson } from './api-request';

export type AmicaleMemberStatus = 'ACTIVE' | 'ARCHIVED';
export type AmicaleExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
export type AmicaleActivityStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED';
export type AmicaleAnnouncementStatus = 'DRAFT' | 'PUBLISHED';
export type AmicalePaymentMethod = 'CASH' | 'WAVE' | 'ORANGE_MONEY' | 'FREE_MONEY' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'OTHER';

export interface AmicaleDuesPeriod {
  id: string;
  period: string;
  amount: number;
  status: 'ACTIVE';
}

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
  method: AmicalePaymentMethod;
  note: string;
  transactionReference: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
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
  duesPeriods: AmicaleDuesPeriod[];
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
  transactionReference?: string;
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

export type AmicaleDuesPeriodInput = { period: string; amount: number };

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
    createDuesPeriod: (body: AmicaleDuesPeriodInput) =>
      request<{ duesPeriod: AmicaleDuesPeriod }>(scopedPath('/amicales/dues-periods'), json(body)),
    updateDuesPeriod: (id: string, amount: number) =>
      request<{ duesPeriod: AmicaleDuesPeriod }>(
        scopedPath(`/amicales/dues-periods/${encodeURIComponent(id)}`),
        { ...json({ amount }), method: 'PATCH' },
      ),
    createMemberCheckout: (period: string, provider: 'WAVE' | 'ORANGE_MONEY') =>
      request<{ contribution: AmicaleContribution; checkoutUrl: string }>(
        scopedPath('/amicales/contributions/checkout'),
        json({ period, provider }),
      ),
    checkMemberPayment: (id: string) =>
      request<{ contribution: AmicaleContribution }>(
        scopedPath(`/amicales/contributions/${encodeURIComponent(id)}/payment-status`),
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
