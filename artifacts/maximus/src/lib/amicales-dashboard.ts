import type { AmicaleBootstrap } from './amicales-api.ts';

export function getAmicaleDashboardSummary(data: AmicaleBootstrap, today: string) {
  const upcomingActivities = data.activities
    .filter(activity => activity.status === 'PLANNED' && activity.eventDate.slice(0, 10) >= today)
    .sort((left, right) => left.eventDate.localeCompare(right.eventDate))
    .slice(0, 3);
  const paidContributions = data.contributions.filter(item => item.status === 'PAID');
  const latestContributions = [...data.contributions]
    .sort((left, right) =>
      right.paidOn.localeCompare(left.paidOn) || right.createdAt.localeCompare(left.createdAt),
    )
    .slice(0, 4);
  const paidExpenses = data.expenses.filter(expense => expense.status === 'PAID');
  const approvedExpenses = data.expenses.filter(expense => expense.status === 'APPROVED');

  return {
    activeMembers: data.members.filter(member => member.status === 'ACTIVE').length,
    totalMembers: data.members.length,
    totalContributions: paidContributions.reduce((total, item) => total + item.amount, 0),
    contributionCount: paidContributions.length,
    paidExpenseAmount: paidExpenses.reduce((total, item) => total + item.amount, 0),
    paidExpenseCount: paidExpenses.length,
    approvedExpenseCount: approvedExpenses.length,
    pendingExpenses: data.expenses.filter(expense => expense.status === 'PENDING').length,
    upcomingActivities,
    publishedAnnouncements: data.announcements.filter(item => item.status === 'PUBLISHED').length,
    latestContributions,
  };
}
