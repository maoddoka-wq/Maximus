import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Toaster } from '../../components/ui/sonner';
export function SonnerDemo() {
  return <div className="space-y-4 p-6"><p className="text-sm text-muted-foreground">Toasts riches avec le provider Sonner, indépendants du système Toast local.</p><Button onClick={() => toast.success('Export terminé', { description: 'Le fichier est prêt à être téléchargé.' })}>Tester Sonner</Button><Toaster position="bottom-right" /></div>;
}