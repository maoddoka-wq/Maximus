import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSeparator, FieldSet, FieldTitle } from '#components/ui/field';
import { Input } from '#components/ui/input';

export function FieldDemo() {
  return (
    <div className="max-w-xl space-y-8">
      <FieldSet>
        <FieldGroup>
          <Field orientation="responsive">
            <FieldLabel htmlFor="field-name">Nom de l’entreprise</FieldLabel>
            <FieldContent>
              <Input id="field-name" defaultValue="MAXIMUS" />
              <FieldDescription>Le nom visible par vos équipes.</FieldDescription>
            </FieldContent>
          </Field>
          <FieldSeparator>Informations générales</FieldSeparator>
          <Field>
            <FieldTitle>Compte actif</FieldTitle>
            <FieldDescription>Les champs sont regroupés avec une hiérarchie claire.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}