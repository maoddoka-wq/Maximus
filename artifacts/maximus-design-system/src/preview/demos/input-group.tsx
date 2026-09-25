import { Search, SlidersHorizontal } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from '#components/ui/input-group';

export function InputGroupDemo() {
  return (
    <div className="max-w-xl space-y-4">
      <InputGroup>
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput aria-label="Rechercher" placeholder="Rechercher dans les modules" />
        <InputGroupAddon align="inline-end"><InputGroupButton size="icon-sm" aria-label="Filtres"><SlidersHorizontal /></InputGroupButton></InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon align="block-start"><InputGroupText>Notes</InputGroupText></InputGroupAddon>
        <InputGroupTextarea aria-label="Notes" placeholder="Ajouter une note..." />
      </InputGroup>
    </div>
  );
}