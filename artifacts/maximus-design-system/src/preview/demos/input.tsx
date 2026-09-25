import { useState } from 'react';
import { Input } from '../../components/ui/input';

export function InputDemo() {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-6">
      <section className="card-surface space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold">Types courants</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Le composant transmet les props natives et accepte une référence.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Nom
            <Input
              aria-label="Nom du contact"
              placeholder="Nom du contact"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            E-mail
            <Input type="email" aria-label="E-mail du contact" placeholder="nom@entreprise.sn" />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Recherche
            <Input type="search" aria-label="Rechercher" placeholder="Rechercher…" />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Mot de passe
            <Input type="password" aria-label="Mot de passe" placeholder="••••••••" />
          </label>
        </div>
      </section>

      <section className="card-surface space-y-4 p-5 sm:p-6">
        <h2 className="font-semibold">État désactivé</h2>
        <Input disabled aria-label="Champ désactivé" value="Lecture seule" readOnly />
      </section>
    </div>
  );
}