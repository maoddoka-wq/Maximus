import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';

export function LabelDemo() {
  return <div className="card-surface max-w-md space-y-2 p-6"><Label htmlFor="label-demo">Nom de l’entreprise</Label><Input id="label-demo" placeholder="Entreprise" /></div>;
}