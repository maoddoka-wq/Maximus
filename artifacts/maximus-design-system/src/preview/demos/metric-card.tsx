import {
  CircleDollarSign,
  Package,
  TrendingDown,
  Users,
} from 'lucide-react';
import { Metric } from '../../components/ui/metric-card';

export function MetricDemo() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Metric
        label="Chiffre d’affaires"
        value="8 420 000"
        suffix=" F"
        detail="12,4 % au-dessus de la période précédente"
        icon={CircleDollarSign}
        accent
      />
      <Metric
        label="Clients actifs"
        value="146"
        detail="Sur les 30 derniers jours"
        icon={Users}
      />
      <Metric
        label="Articles en stock"
        value="1 284"
        detail="36 références suivies"
        icon={Package}
      />
      <Metric
        label="Marge à surveiller"
        value="8,2"
        suffix=" %"
        detail="Sous le seuil de 10 %"
        icon={TrendingDown}
        warning
      />
    </div>
  );
}