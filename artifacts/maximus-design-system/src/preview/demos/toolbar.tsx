import { useState } from 'react';
import { Toolbar } from '../../components/ui/toolbar';

export function ToolbarDemo() {
  const [search, setSearch] = useState('');
  return <Toolbar search={search} setSearch={setSearch}><button type="button" className="rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold">Ajouter</button></Toolbar>;
}