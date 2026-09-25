import { Brand } from '../../components/ui/brand';

export function BrandDemo() {
  return <div className="grid gap-4 sm:grid-cols-2"><section className="card-surface p-6"><Brand large homeHref="#" /></section><section className="rounded-xl bg-[hsl(var(--sidebar))] p-6"><Brand large inverse homeHref="#" /></section></div>;
}