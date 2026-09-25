import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';

export function TextareaDemo() {
  return <div className="card-surface max-w-lg space-y-2 p-6"><Label htmlFor="textarea-demo">Commentaire</Label><Textarea id="textarea-demo" placeholder="Saisissez votre commentaire…" /><Textarea aria-label="Désactivé" disabled value="Lecture seule" readOnly /></div>;
}