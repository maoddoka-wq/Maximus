import { Button } from '../../components/ui/button';
import { Toaster } from '../../components/ui/toaster';
import { showAppToast } from '#hooks/use-toast';
export function ToasterDemo() {
  return <div className="space-y-4 p-6"><div className="rounded-lg border border-dashed p-4"><p className="font-medium">Hôte global de notifications</p><p className="mt-1 text-sm text-muted-foreground">Le Toaster rend les notifications partagées par toutes les pages.</p><Button className="mt-4" onClick={() => showAppToast('Notification rendue par le Toaster.', 'warning')}>Afficher une notification</Button></div><Toaster /></div>;
}