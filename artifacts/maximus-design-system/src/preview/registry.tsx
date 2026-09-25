import { lazy, type ComponentType } from 'react';
import {
  BrandPage,
  ColorsPage,
  FontsPage,
  LayoutPage,
  OverviewPage,
} from './foundations';

function lazyPage(load: () => Promise<ComponentType>) {
  return lazy(async () => ({ default: await load() }));
}

const ActionButtonDemo = lazyPage(() =>
  import('./demos/action-button').then(({ ActionButtonDemo }) => ActionButtonDemo),
);
const AppFieldDemo = lazyPage(() =>
  import('./demos/app-field').then(({ AppFieldDemo }) => AppFieldDemo),
);
const InputDemo = lazyPage(() =>
  import('./demos/input').then(({ InputDemo }) => InputDemo),
);
const MetricDemo = lazyPage(() =>
  import('./demos/metric-card').then(({ MetricDemo }) => MetricDemo),
);
const WorkspaceTabsDemo = lazyPage(() =>
  import('./demos/workspace-tabs').then(({ WorkspaceTabsDemo }) => WorkspaceTabsDemo),
);

export type PreviewEntry = {
  id: string;
  name: string;
  description: string;
  Page: ComponentType;
};

export type NavGroup = {
  name: string;
  entries: PreviewEntry[];
};

export const DESIGN_SYSTEM = {
  title: 'MAXIMUS Design System',
  description:
    'Le référentiel visuel et les composants de l’ERP MAXIMUS, avec des couleurs d’entreprise conservées à l’exécution.',
} as const;

export const OVERVIEW_ENTRY: PreviewEntry = {
  id: 'overview',
  name: 'Vue d’ensemble',
  description: 'Les fondations visuelles et les composants du pilote.',
  Page: OverviewPage,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    name: 'Marque',
    entries: [
      {
        id: 'brand-logo',
        name: 'Logo MAXIMUS',
        description: 'Logo source et aperçus sur les surfaces de marque.',
        Page: BrandPage,
      },
    ],
  },
  {
    name: 'Couleurs',
    entries: [
      {
        id: 'color-roles',
        name: 'Rôles de couleur',
        description: 'Palette globale claire et sombre, plus les variables d’entreprise.',
        Page: ColorsPage,
      },
    ],
  },
  {
    name: 'Typographie',
    entries: [
      {
        id: 'type-scale',
        name: 'Familles et échelle',
        description: 'DM Sans, Space Mono et leurs usages dans l’ERP.',
        Page: FontsPage,
      },
    ],
  },
  {
    name: 'Mise en page',
    entries: [
      {
        id: 'spacing-radius',
        name: 'Espacement et rayons',
        description: 'Pas de base, échelle d’espacement et traitements des angles.',
        Page: LayoutPage,
      },
    ],
  },
  {
    name: 'Navigation',
    entries: [
      {
        id: 'workspace-tabs',
        name: 'WorkspaceTabs',
        description: 'Onglets de module contrôlés, avec et sans icônes.',
        Page: WorkspaceTabsDemo,
      },
    ],
  },
  {
    name: 'Actions',
    entries: [
      {
        id: 'action-button',
        name: 'ActionButton',
        description: 'Actions standard, primaires, en attente et désactivées.',
        Page: ActionButtonDemo,
      },
    ],
  },
  {
    name: 'Formulaires et saisie',
    entries: [
      {
        id: 'app-field',
        name: 'Field · application',
        description: 'Label, aide, saisie et contrôle du mot de passe.',
        Page: AppFieldDemo,
      },
      {
        id: 'input',
        name: 'Input',
        description: 'Champ HTML réutilisable, référence et états.',
        Page: InputDemo,
      },
    ],
  },
  {
    name: 'Données',
    entries: [
      {
        id: 'metric-card',
        name: 'Metric',
        description: 'Valeur, unité, icône, indicateur LIVE et alerte.',
        Page: MetricDemo,
      },
    ],
  },
];

export const ALL_ENTRIES: PreviewEntry[] = [
  OVERVIEW_ENTRY,
  ...NAV_GROUPS.flatMap((group) => group.entries),
];

const duplicateIds = ALL_ENTRIES.map((entry) => entry.id).filter(
  (id, index, ids) => ids.indexOf(id) !== index,
);

if (duplicateIds.length > 0) {
  throw new Error(
    `Duplicate preview page id(s): ${[...new Set(duplicateIds)].join(
      ', ',
    )}. Every page id must be unique across all nav groups.`,
  );
}