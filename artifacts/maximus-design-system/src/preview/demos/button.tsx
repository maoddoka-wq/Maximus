import { Button } from '../../components/ui/button';

export function ButtonDemo() {
  return (
    <div className="card-surface space-y-6 p-6">
      <div className="flex flex-wrap gap-3">
        {(['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const).map((variant) => (
          <Button key={variant} variant={variant}>{variant}</Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Petit</Button><Button>Taille standard</Button><Button size="lg">Grand</Button>
        <Button disabled>Désactivé</Button>
      </div>
    </div>
  );
}