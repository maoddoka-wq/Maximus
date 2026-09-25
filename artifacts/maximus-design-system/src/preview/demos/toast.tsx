import { Button } from '../../components/ui/button';
import { Toaster } from '../../components/ui/toaster';
import { showAppToast } from '#hooks/use-toast';
export function ToastDemo() {
  return <div className="space-y-4 p-6"><p className="text-sm text-muted-foreground">Déclenchez une notification pour tester le clavier, la fermeture et les variantes.</p><div className="flex flex-wrap gap-2"><Button onClick={() => showAppToast('Le document a été enregistré.', 'success')}>Succès</Button><Button variant="destructive" onClick={() => showAppToast('Impossible de charger les données.', 'error')}>Erreur</Button><Button variant="outline" onClick={() => showAppToast('Une nouvelle information est disponible.', 'info')}>Information</Button></div><Toaster /></div>;
}