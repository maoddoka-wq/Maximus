import type { Dispatch, SetStateAction } from 'react';
import { getModuleFeatureOptions } from '@/lib/module-features';
import { permissionLevelFor, type ModulePackDraft, updatePackPermission } from '@/lib/module-pack';
import type { Module } from '@/lib/store';

type ModulePackDraftFormProps = {
  module: Module;
  packForm: ModulePackDraft;
  onChange: Dispatch<SetStateAction<ModulePackDraft>>;
};

function PackField({
  label,
  value,
  onChange,
  placeholder,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  testId: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        data-testid={testId}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-3 text-sm font-normal transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.14)]"
      />
    </label>
  );
}

export function ModulePackDraftForm({ module, packForm, onChange }: ModulePackDraftFormProps) {
  const featureOptions = getModuleFeatureOptions(module);

  return (
    <section className="rounded-xl border bg-[hsl(var(--muted)/.18)] p-4">
      <div>
        <p className="text-sm font-bold">
          Pack métier à créer avec le module{' '}
          <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">(optionnel)</span>
        </p>
        <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          Préparez dès maintenant un modèle de rôle réutilisable. Vous pourrez ajouter d’autres packs ensuite depuis le
          détail du module.
        </p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PackField
          label="Nom du pack"
          value={packForm.name}
          onChange={(value) => onChange((current) => ({ ...current, name: value }))}
          placeholder="Ex. Gestionnaire de stock"
          testId="input-module-initial-pack-name"
        />
        <PackField
          label="Description"
          value={packForm.description}
          onChange={(value) => onChange((current) => ({ ...current, description: value }))}
          placeholder="À quoi sert ce pack ?"
          testId="input-module-initial-pack-description"
        />
      </div>
      <p className="mt-4 text-xs font-bold">Droits inclus par fonctionnalité</p>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        {featureOptions.map((feature) => (
          <label
            key={feature.id}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-xs hover:bg-[hsl(var(--muted))]"
          >
            <span className="font-medium">{feature.label}</span>
            <select
              data-testid={`select-module-initial-pack-permission-${feature.id}`}
              value={permissionLevelFor(packForm.featurePermissions[feature.id])}
              onChange={(event) => onChange((current) => updatePackPermission(current, feature.id, event.target.value))}
              className="rounded-md border bg-[hsl(var(--card))] px-2 py-1.5 text-[10px] font-semibold"
            >
              <option value="none">Non incluse</option>
              <option value="view">Voir seulement</option>
              <option value="create">Voir et créer</option>
              <option value="edit">Voir, créer et modifier</option>
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}
