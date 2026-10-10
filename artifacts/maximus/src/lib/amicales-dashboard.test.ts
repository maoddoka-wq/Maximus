import assert from 'node:assert/strict';
import test from 'node:test';
import { getAmicaleDashboardSummary } from './amicales-dashboard.ts';
import type { AmicaleBootstrap } from './amicales-api.ts';

const fixture: AmicaleBootstrap = {
  members: [
    { id: 'm1', companyId: 'c1', reference: 'M1', name: 'Awa', studentIdentifier: 'S1', email: '', phone: '', faculty: '', studyYear: '', joinedAt: '2026-01-01', office: '', mandateStart: '', mandateEnd: '', notes: '', status: 'ACTIVE', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'm2', companyId: 'c1', reference: 'M2', name: 'Moussa', studentIdentifier: 'S2', email: '', phone: '', faculty: '', studyYear: '', joinedAt: '2026-01-01', office: '', mandateStart: '', mandateEnd: '', notes: '', status: 'ARCHIVED', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  ],
  contributions: [
    { id: 'old', companyId: 'c1', reference: 'R1', memberId: 'm1', memberName: 'Awa', period: 'Janvier', amount: 1000, paidOn: '2026-01-10', method: 'CASH', note: '', transactionReference: '', status: 'PAID', createdBy: 'u1', createdAt: '2026-01-10T12:00:00Z' },
    { id: 'new', companyId: 'c1', reference: 'R2', memberId: 'm1', memberName: 'Awa', period: 'Février', amount: 2000, paidOn: '2026-02-10', method: 'CASH', note: '', transactionReference: '', status: 'PAID', createdBy: 'u1', createdAt: '2026-02-10T12:00:00Z' },
  ],
  expenses: [
    { id: 'pending', companyId: 'c1', reference: 'D1', title: 'À décider', category: '', amount: 9000, expenseDate: '2026-02-01', description: '', vendor: '', status: 'PENDING', decisionNote: '', createdBy: 'u1', approvedBy: '', createdAt: '2026-02-01', updatedAt: '2026-02-01' },
    { id: 'approved', companyId: 'c1', reference: 'D2', title: 'Approuvée', category: '', amount: 3000, expenseDate: '2026-02-02', description: '', vendor: '', status: 'APPROVED', decisionNote: '', createdBy: 'u1', approvedBy: 'u2', createdAt: '2026-02-02', updatedAt: '2026-02-02' },
    { id: 'paid', companyId: 'c1', reference: 'D3', title: 'Payée', category: '', amount: 2500, expenseDate: '2026-02-03', description: '', vendor: '', status: 'PAID', decisionNote: '', createdBy: 'u1', approvedBy: 'u2', createdAt: '2026-02-03', updatedAt: '2026-02-03' },
    { id: 'rejected', companyId: 'c1', reference: 'D4', title: 'Refusée', category: '', amount: 7000, expenseDate: '2026-02-04', description: '', vendor: '', status: 'REJECTED', decisionNote: '', createdBy: 'u1', approvedBy: 'u2', createdAt: '2026-02-04', updatedAt: '2026-02-04' },
  ],
  activities: [
    { id: 'future', companyId: 'c1', reference: 'A1', title: 'Future', description: '', location: '', eventDate: '2026-10-10', participantCount: 0, attendeeCount: 0, status: 'PLANNED', createdAt: '2026-02-01', updatedAt: '2026-02-01' },
    { id: 'past', companyId: 'c1', reference: 'A2', title: 'Passée', description: '', location: '', eventDate: '2026-10-07', participantCount: 0, attendeeCount: 0, status: 'PLANNED', createdAt: '2026-02-01', updatedAt: '2026-02-01' },
    { id: 'completed', companyId: 'c1', reference: 'A3', title: 'Terminée', description: '', location: '', eventDate: '2026-10-15', participantCount: 0, attendeeCount: 0, status: 'COMPLETED', createdAt: '2026-02-01', updatedAt: '2026-02-01' },
  ],
  announcements: [
    { id: 'published', companyId: 'c1', reference: 'N1', title: 'Publiée', body: '', status: 'PUBLISHED', publishedAt: '2026-02-01', createdAt: '2026-02-01', updatedAt: '2026-02-01' },
  ],
  duesPeriods: [],
};

test('le tableau de bord ne compte que les activités futures planifiées et les dépenses payées', () => {
  const summary = getAmicaleDashboardSummary(fixture, '2026-10-08');

  assert.equal(summary.activeMembers, 1);
  assert.equal(summary.totalMembers, 2);
  assert.equal(summary.totalContributions, 3000);
  assert.equal(summary.paidExpenseAmount, 2500);
  assert.equal(summary.paidExpenseCount, 1);
  assert.equal(summary.approvedExpenseCount, 1);
  assert.equal(summary.pendingExpenses, 1);
  assert.deepEqual(summary.upcomingActivities.map(activity => activity.id), ['future']);
  assert.deepEqual(summary.latestContributions.map(contribution => contribution.id), ['new', 'old']);
  assert.equal(summary.publishedAnnouncements, 1);
});
