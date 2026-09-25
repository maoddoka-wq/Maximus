import { Badge } from '../../components/ui/badge';

export function BadgeDemo() {
  return <div className="card-surface flex flex-wrap gap-3 p-6">{(['default', 'secondary', 'outline', 'destructive'] as const).map((variant) => <Badge key={variant} variant={variant}>{variant}</Badge>)}</div>;
}