import { useState } from 'react';
import { BarChart3, Package, Users } from 'lucide-react';
import {
  WorkspaceTabs,
  type WorkspaceTabItem,
} from '../../components/ui/workspace-tabs';

const WITH_ICONS: WorkspaceTabItem[] = [
  { id: 'overview', label: 'Vue générale', icon: BarChart3 },
  { id: 'team', label: 'Équipe', icon: Users },
  { id: 'stock', label: 'Stock', icon: Package },
];

const WITHOUT_ICONS: WorkspaceTabItem[] = [
  { id: 'details', label: 'Détails' },
  { id: 'activity', label: 'Activité' },
  { id: 'settings', label: 'Paramètres' },
];

export function WorkspaceTabsDemo() {
  const [activeWithIcons, setActiveWithIcons] = useState('overview');
  const [activeWithoutIcons, setActiveWithoutIcons] = useState('details');

  return (
    <div className="space-y-6">
      <section className="card-surface space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold">Avec icônes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les onglets sont contrôlés par le parent et restent accessibles au clavier.
          </p>
        </div>
        <WorkspaceTabs
          items={WITH_ICONS}
          activeId={activeWithIcons}
          onChange={setActiveWithIcons}
          ariaLabel="Exemple d’onglets avec icônes"
          testIdPrefix="workspace-tabs-icons"
        />
        <p className="text-xs text-muted-foreground">
          Onglet sélectionné : <span className="font-medium text-foreground">{activeWithIcons}</span>
        </p>
      </section>

      <section className="card-surface space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold">Sans icône</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les libellés peuvent défiler horizontalement quand l’espace manque.
          </p>
        </div>
        <WorkspaceTabs
          items={WITHOUT_ICONS}
          activeId={activeWithoutIcons}
          onChange={setActiveWithoutIcons}
          ariaLabel="Exemple d’onglets sans icônes"
        />
      </section>
    </div>
  );
}