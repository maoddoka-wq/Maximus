import { useState } from 'react';
import { Download, Save, UserPlus } from 'lucide-react';
import { ActionButton } from '../../components/ui/action-button';

export function ActionButtonDemo() {
  const [message, setMessage] = useState('Aucune action lancée.');

  const saveRecord = async () => {
    setMessage('Enregistrement en cours…');
    await new Promise<void>((resolve) => window.setTimeout(resolve, 650));
    setMessage('Enregistrement terminé.');
  };

  return (
    <div className="space-y-6">
      <section className="card-surface space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold">Variantes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Le bouton standard convient aux actions secondaires; la variante primaire
            marque l’action principale.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton icon={UserPlus}>Ajouter un employé</ActionButton>
          <ActionButton primary icon={Save} onClick={saveRecord} testId="action-button-save">
            Enregistrer
          </ActionButton>
          <ActionButton icon={Download}>Exporter</ActionButton>
        </div>
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      </section>

      <section className="card-surface space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold">États</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pending bloque les clics répétés et rend l’état occupé accessible.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton primary loading>
            Enregistrement
          </ActionButton>
          <ActionButton disabled>Indisponible</ActionButton>
        </div>
      </section>
    </div>
  );
}