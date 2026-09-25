import { useState } from 'react';
import { Field } from '../../components/ui/app-field';

export function AppFieldDemo() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reference, setReference] = useState('CMD-2026-0142');

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card-surface space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold">Connexion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Le type email et les identifiants de connexion déterminent l’autocomplétion.
          </p>
        </div>
        <Field
          label="Adresse e-mail"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="nom@entreprise.sn"
          testId="design-system-login-email"
        />
        <Field
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Votre mot de passe"
          testId="design-system-login-password"
        />
      </section>

      <section className="card-surface space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold">Saisie libre</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un champ peut fournir son aide ou reprendre l’aide générée depuis son libellé.
          </p>
        </div>
        <Field
          label="Référence de commande"
          value={reference}
          onChange={setReference}
          help="La référence apparaît sur le reçu et dans l’historique."
        />
        <Field label="Libellé" value="" onChange={() => undefined} />
      </section>
    </div>
  );
}