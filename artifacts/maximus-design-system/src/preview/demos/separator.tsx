import { Separator } from '../../components/ui/separator';

export function SeparatorDemo() {
  return <div className="card-surface space-y-5 p-6"><p className="text-sm">Section supérieure</p><Separator /><div className="flex h-8 items-center gap-4 text-sm"><span>Gauche</span><Separator orientation="vertical" /><span>Droite</span></div></div>;
}