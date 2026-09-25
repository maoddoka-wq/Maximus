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
const ActivityRowDemo = lazyPage(() => import('./demos/activity-row').then(({ ActivityRowDemo }) => ActivityRowDemo));
const BrandDemo = lazyPage(() => import('./demos/brand').then(({ BrandDemo }) => BrandDemo));
const DataTableDemo = lazyPage(() => import('./demos/data-table').then(({ DataTableDemo }) => DataTableDemo));
const StatusBadgeDemo = lazyPage(() => import('./demos/status-badge').then(({ StatusBadgeDemo }) => StatusBadgeDemo));
const StepDemo = lazyPage(() => import('./demos/step-indicator').then(({ StepDemo }) => StepDemo));
const ToolbarDemo = lazyPage(() => import('./demos/toolbar').then(({ ToolbarDemo }) => ToolbarDemo));
const ButtonDemo = lazyPage(() => import('./demos/button').then(({ ButtonDemo }) => ButtonDemo));
const CardDemo = lazyPage(() => import('./demos/card').then(({ CardDemo }) => CardDemo));
const BadgeDemo = lazyPage(() => import('./demos/badge').then(({ BadgeDemo }) => BadgeDemo));
const LabelDemo = lazyPage(() => import('./demos/label').then(({ LabelDemo }) => LabelDemo));
const TextareaDemo = lazyPage(() => import('./demos/textarea').then(({ TextareaDemo }) => TextareaDemo));
const SeparatorDemo = lazyPage(() => import('./demos/separator').then(({ SeparatorDemo }) => SeparatorDemo));
const SkeletonDemo = lazyPage(() => import('./demos/skeleton').then(({ SkeletonDemo }) => SkeletonDemo));
const ButtonGroupDemo = lazyPage(() => import('./demos/button-group').then(({ ButtonGroupDemo }) => ButtonGroupDemo));
const AlertDemo = lazyPage(() => import('./demos/alert').then(({ AlertDemo }) => AlertDemo));
const ToastDemo = lazyPage(() => import('./demos/toast').then(({ ToastDemo }) => ToastDemo));
const ToasterDemo = lazyPage(() => import('./demos/toaster').then(({ ToasterDemo }) => ToasterDemo));
const TooltipDemo = lazyPage(() => import('./demos/tooltip').then(({ TooltipDemo }) => TooltipDemo));
const SonnerDemo = lazyPage(() => import('./demos/sonner').then(({ SonnerDemo }) => SonnerDemo));
const DialogDemo = lazyPage(() => import('./demos/dialog').then(({ DialogDemo }) => DialogDemo));
const AlertDialogDemo = lazyPage(() => import('./demos/alert-dialog').then(({ AlertDialogDemo }) => AlertDialogDemo));
const SheetDemo = lazyPage(() => import('./demos/sheet').then(({ SheetDemo }) => SheetDemo));
const DrawerDemo = lazyPage(() => import('./demos/drawer').then(({ DrawerDemo }) => DrawerDemo));
const FieldDemo = lazyPage(() => import('./demos/field').then(({ FieldDemo }) => FieldDemo));
const FormDemo = lazyPage(() => import('./demos/form').then(({ FormDemo }) => FormDemo));
const InputGroupDemo = lazyPage(() => import('./demos/input-group').then(({ InputGroupDemo }) => InputGroupDemo));
const SidebarDemo = lazyPage(() => import('./demos/sidebar').then(({ SidebarDemo }) => SidebarDemo));
const PopoverDemo = lazyPage(() => import('./demos/popover').then(({ PopoverDemo }) => PopoverDemo));
const SelectDemo = lazyPage(() => import('./demos/select').then(({ SelectDemo }) => SelectDemo));
const CommandDemo = lazyPage(() => import('./demos/command').then(({ CommandDemo }) => CommandDemo));
const DropdownMenuDemo = lazyPage(() => import('./demos/dropdown-menu').then(({ DropdownMenuDemo }) => DropdownMenuDemo));
const ContextMenuDemo = lazyPage(() => import('./demos/context-menu').then(({ ContextMenuDemo }) => ContextMenuDemo));
const HoverCardDemo = lazyPage(() => import('./demos/hover-card').then(({ HoverCardDemo }) => HoverCardDemo));
const AccordionDemo = lazyPage(() => import('./demos/accordion').then(({ AccordionDemo }) => AccordionDemo));
const CheckboxDemo = lazyPage(() => import('./demos/checkbox').then(({ CheckboxDemo }) => CheckboxDemo));
const CollapsibleDemo = lazyPage(() => import('./demos/collapsible').then(({ CollapsibleDemo }) => CollapsibleDemo));
const ProgressDemo = lazyPage(() => import('./demos/progress').then(({ ProgressDemo }) => ProgressDemo));
const RadioGroupDemo = lazyPage(() => import('./demos/radio-group').then(({ RadioGroupDemo }) => RadioGroupDemo));
const SliderDemo = lazyPage(() => import('./demos/slider').then(({ SliderDemo }) => SliderDemo));
const SwitchDemo = lazyPage(() => import('./demos/switch').then(({ SwitchDemo }) => SwitchDemo));
const TabsDemo = lazyPage(() => import('./demos/tabs').then(({ TabsDemo }) => TabsDemo));
const ToggleDemo = lazyPage(() => import('./demos/toggle').then(({ ToggleDemo }) => ToggleDemo));
const ToggleGroupDemo = lazyPage(() => import('./demos/toggle-group').then(({ ToggleGroupDemo }) => ToggleGroupDemo));
const BreadcrumbDemo = lazyPage(() => import('./demos/breadcrumb').then(({ BreadcrumbDemo }) => BreadcrumbDemo));
const CalendarDemo = lazyPage(() => import('./demos/calendar').then(({ CalendarDemo }) => CalendarDemo));
const EmptyDemo = lazyPage(() => import('./demos/empty').then(({ EmptyDemo }) => EmptyDemo));
const ItemDemo = lazyPage(() => import('./demos/item').then(({ ItemDemo }) => ItemDemo));
const KbdDemo = lazyPage(() => import('./demos/kbd').then(({ KbdDemo }) => KbdDemo));
const MenubarDemo = lazyPage(() => import('./demos/menubar').then(({ MenubarDemo }) => MenubarDemo));
const NavigationMenuDemo = lazyPage(() => import('./demos/navigation-menu').then(({ NavigationMenuDemo }) => NavigationMenuDemo));
const PaginationDemo = lazyPage(() => import('./demos/pagination').then(({ PaginationDemo }) => PaginationDemo));
const TableDemo = lazyPage(() => import('./demos/table').then(({ TableDemo }) => TableDemo));
const AspectRatioDemo = lazyPage(() => import('./demos/aspect-ratio').then(({ AspectRatioDemo }) => AspectRatioDemo));
const AvatarDemo = lazyPage(() => import('./demos/avatar').then(({ AvatarDemo }) => AvatarDemo));
const CarouselDemo = lazyPage(() => import('./demos/carousel').then(({ CarouselDemo }) => CarouselDemo));
const ChartDemo = lazyPage(() => import('./demos/chart').then(({ ChartDemo }) => ChartDemo));
const InputOTPDemo = lazyPage(() => import('./demos/input-otp').then(({ InputOTPDemo }) => InputOTPDemo));
const ResizableDemo = lazyPage(() => import('./demos/resizable').then(({ ResizableDemo }) => ResizableDemo));
const ScrollAreaDemo = lazyPage(() => import('./demos/scroll-area').then(({ ScrollAreaDemo }) => ScrollAreaDemo));
const SpinnerDemo = lazyPage(() => import('./demos/spinner').then(({ SpinnerDemo }) => SpinnerDemo));

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
      {
        id: 'field',
        name: 'Field · UI',
        description: 'Composition de champs avec orientations et aide.',
        Page: FieldDemo,
      },
      {
        id: 'form',
        name: 'Form',
        description: 'Contexte de formulaire, validation et messages accessibles.',
        Page: FormDemo,
      },
      {
        id: 'input-group',
        name: 'InputGroup',
        description: 'Saisie enrichie avec addons, boutons et textarea.',
        Page: InputGroupDemo,
      },
      {
        id: 'sidebar',
        name: 'Sidebar',
        description: 'Navigation responsive, réductible et pilotable au clavier.',
        Page: SidebarDemo,
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
      { id: 'activity-row', name: 'ActivityRow', description: 'Ligne d’activité et traçabilité utilisateur.', Page: ActivityRowDemo },
      { id: 'data-table', name: 'DataTable', description: 'Tableau de données avec cellules React.', Page: DataTableDemo },
    ],
  },
  {
    name: 'Primitives applicatives',
    entries: [
      { id: 'brand', name: 'Brand', description: 'Marque MAXIMUS sur surfaces claires et sombres.', Page: BrandDemo },
      { id: 'step-indicator', name: 'Step', description: 'Étapes actives, terminées et à venir.', Page: StepDemo },
      { id: 'status-badge', name: 'StatusBadge', description: 'États de statut positifs, en attente ou en erreur.', Page: StatusBadgeDemo },
      { id: 'toolbar', name: 'Toolbar', description: 'Recherche contrôlée et actions de tableau.', Page: ToolbarDemo },
    ],
  },
  {
    name: 'Fondations UI',
    entries: [
      { id: 'button', name: 'Button', description: 'Actions et variantes de bouton.', Page: ButtonDemo },
      { id: 'card', name: 'Card', description: 'Surface structurée avec en-tête et contenu.', Page: CardDemo },
      { id: 'badge', name: 'Badge', description: 'Étiquettes compactes et états.', Page: BadgeDemo },
      { id: 'label', name: 'Label', description: 'Libellé accessible pour les champs.', Page: LabelDemo },
      { id: 'textarea', name: 'Textarea', description: 'Saisie multiligne et états natifs.', Page: TextareaDemo },
      { id: 'separator', name: 'Separator', description: 'Séparation horizontale ou verticale.', Page: SeparatorDemo },
      { id: 'skeleton', name: 'Skeleton', description: 'Placeholder animé pour les chargements.', Page: SkeletonDemo },
      { id: 'button-group', name: 'ButtonGroup', description: 'Actions regroupées et séparateurs.', Page: ButtonGroupDemo },
    ],
  },
  {
    name: 'Feedback',
    entries: [
      { id: 'alert', name: 'Alert', description: 'Messages de statut et erreurs accessibles.', Page: AlertDemo },
      { id: 'toast', name: 'Toast', description: 'Notifications interactives avec actions et variantes.', Page: ToastDemo },
      { id: 'toaster', name: 'Toaster', description: 'Hôte global des notifications locales.', Page: ToasterDemo },
      { id: 'tooltip', name: 'Tooltip', description: 'Aide contextuelle au survol et au clavier.', Page: TooltipDemo },
      { id: 'sonner', name: 'Sonner', description: 'Notifications riches via le provider Sonner.', Page: SonnerDemo },
    ],
  },
  {
    name: 'Overlays',
    entries: [
      { id: 'dialog', name: 'Dialog', description: 'Fenêtre modale accessible et contrôlée.', Page: DialogDemo },
      { id: 'alert-dialog', name: 'AlertDialog', description: 'Confirmation accessible avec annulation explicite.', Page: AlertDialogDemo },
      { id: 'sheet', name: 'Sheet', description: 'Panneau latéral avec transitions et actions.', Page: SheetDemo },
      { id: 'drawer', name: 'Drawer', description: 'Tiroir mobile avec confirmation et annulation.', Page: DrawerDemo },
    ],
  },
  {
    name: 'Menus et sélecteurs',
    entries: [
      { id: 'popover', name: 'Popover', description: 'Panneau contextuel accessible.', Page: PopoverDemo },
      { id: 'select', name: 'Select', description: 'Sélection au clavier et au pointeur.', Page: SelectDemo },
      { id: 'command', name: 'Command', description: 'Recherche et commandes rapides.', Page: CommandDemo },
      { id: 'dropdown-menu', name: 'DropdownMenu', description: 'Menu d’actions accessible.', Page: DropdownMenuDemo },
      { id: 'context-menu', name: 'ContextMenu', description: 'Actions au clic contextuel.', Page: ContextMenuDemo },
      { id: 'hover-card', name: 'HoverCard', description: 'Aperçu contextuel au survol.', Page: HoverCardDemo },
    ],
  },
  {
    name: 'Contrôles et divulgation',
    entries: [
      { id: 'accordion', name: 'Accordion', description: 'Sections repliables accessibles.', Page: AccordionDemo },
      { id: 'checkbox', name: 'Checkbox', description: 'Sélection binaire contrôlée.', Page: CheckboxDemo },
      { id: 'collapsible', name: 'Collapsible', description: 'Contenu extensible contrôlé.', Page: CollapsibleDemo },
      { id: 'progress', name: 'Progress', description: 'Progression d’une opération.', Page: ProgressDemo },
      { id: 'radio-group', name: 'RadioGroup', description: 'Choix unique accessible.', Page: RadioGroupDemo },
      { id: 'slider', name: 'Slider', description: 'Réglage numérique au clavier.', Page: SliderDemo },
      { id: 'switch', name: 'Switch', description: 'Activation d’une option.', Page: SwitchDemo },
      { id: 'tabs', name: 'Tabs', description: 'Navigation entre panneaux.', Page: TabsDemo },
      { id: 'toggle', name: 'Toggle', description: 'Action activable et variantes.', Page: ToggleDemo },
      { id: 'toggle-group', name: 'ToggleGroup', description: 'Groupe de choix activables.', Page: ToggleGroupDemo },
    ],
  },
  {
    name: 'Données et navigation',
    entries: [
      { id: 'breadcrumb', name: 'Breadcrumb', description: 'Fil d’Ariane accessible.', Page: BreadcrumbDemo },
      { id: 'calendar', name: 'Calendar', description: 'Sélection de dates au clavier.', Page: CalendarDemo },
      { id: 'empty', name: 'Empty', description: 'État vide et action associée.', Page: EmptyDemo },
      { id: 'item', name: 'Item', description: 'Ligne de contenu composée.', Page: ItemDemo },
      { id: 'kbd', name: 'Kbd', description: 'Raccourcis clavier.', Page: KbdDemo },
      { id: 'menubar', name: 'Menubar', description: 'Menu horizontal accessible.', Page: MenubarDemo },
      { id: 'navigation-menu', name: 'NavigationMenu', description: 'Navigation avec sous-menus.', Page: NavigationMenuDemo },
      { id: 'pagination', name: 'Pagination', description: 'Navigation entre pages.', Page: PaginationDemo },
      { id: 'table', name: 'Table', description: 'Tableau sémantique tokenisé.', Page: TableDemo },
    ],
  },
  {
    name: 'Autres primitives',
    entries: [
      { id: 'aspect-ratio', name: 'AspectRatio', description: 'Cadre média à ratio constant et responsive.', Page: AspectRatioDemo },
      { id: 'avatar', name: 'Avatar', description: 'Identité visuelle avec image et repli.', Page: AvatarDemo },
      { id: 'carousel', name: 'Carousel', description: 'Défilement accessible horizontal ou vertical.', Page: CarouselDemo },
      { id: 'chart', name: 'Chart', description: 'Graphiques Recharts avec tokens de couleur.', Page: ChartDemo },
      { id: 'input-otp', name: 'InputOTP', description: 'Saisie de code à usage unique.', Page: InputOTPDemo },
      { id: 'resizable', name: 'Resizable', description: 'Panneaux redimensionnables au clavier.', Page: ResizableDemo },
      { id: 'scroll-area', name: 'ScrollArea', description: 'Zone de défilement avec barre stylée.', Page: ScrollAreaDemo },
      { id: 'spinner', name: 'Spinner', description: 'Indicateur de chargement animé.', Page: SpinnerDemo },
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