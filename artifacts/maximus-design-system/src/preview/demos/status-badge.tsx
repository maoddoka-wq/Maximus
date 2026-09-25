import { StatusBadge } from '../../components/ui/status-badge';

export function StatusBadgeDemo() {
  return <div className="card-surface flex flex-wrap gap-3 p-6">{['ACTIF', 'EN ATTENTE', 'EN RETARD', 'BROUILLON'].map((status) => <StatusBadge key={status} status={status} />)}</div>;
}