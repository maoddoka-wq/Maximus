import { DataTable } from '../../components/ui/data-table';
import { StatusBadge } from '../../components/ui/status-badge';

export function DataTableDemo() {
  return <DataTable headers={['Référence', 'Client', 'Montant', 'Statut']} rows={[['CMD-2048', <strong key="a">Soleil Distribution</strong>, '240 000 F', <StatusBadge key="b" status="VALIDÉ" />], ['CMD-2049', 'Baobab Services', '85 500 F', <StatusBadge key="c" status="EN ATTENTE" />]]} />;
}