import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
export function AlertDemo() {
  return <div className="space-y-4 p-6"><Alert><AlertTitle>Synchronisation terminée</AlertTitle><AlertDescription>Les données de stock sont à jour.</AlertDescription></Alert><Alert variant="destructive"><AlertTitle>Accès refusé</AlertTitle><AlertDescription>Votre rôle ne permet pas cette opération.</AlertDescription></Alert></div>;
}