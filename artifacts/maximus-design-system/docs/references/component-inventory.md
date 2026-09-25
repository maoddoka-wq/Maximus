# Inventaire des composants MAXIMUS

Source : l’application existante, principalement `artifacts/maximus/src/components/app-ui.tsx`, `workspace-tabs.tsx` et `components/ui/`. Inventaire des exports publics normalisés en familles; les compositions propres aux pages ne sont pas incluses.

La palette statique du package est le thème global MAXIMUS. Les couleurs d’entreprise sont des surcharges runtime distinctes : voir `docs/AGENTS.md` et `references/README.md`.

## Lots et ordre des dépendances

1. Pilote : WorkspaceTabs, Field (application), ActionButton, Input, Metric.
2. Primitives applicatives restantes : Brand, Step, StatusBadge, ActivityRow, DataTable, Toolbar.
3. Fondations UI : Button, Card, Badge, Label, Textarea, Separator, Skeleton, ButtonGroup.
4. Feedback : Alert, Toast, Toaster, Tooltip, Sonner.
5. Overlays : Dialog, AlertDialog, Sheet, Drawer.
6. Formulaires et sidebar : Field (UI), Form, InputGroup, Sidebar.
7. Menus et sélecteurs : Popover, Select, Command, DropdownMenu, ContextMenu, HoverCard.
8. Contrôles et divulgation : Tabs, Accordion, Collapsible, Toggle, ToggleGroup, Checkbox, RadioGroup, Switch, Slider, Progress.
9. Données et navigation : Table, Pagination, Empty, Item, Breadcrumb, NavigationMenu, Menubar, Calendar, Kbd.
10. Autres primitives : AspectRatio, Avatar, Carousel, Chart, Resizable, ScrollArea, InputOTP, Spinner.

Les dépendances locales de chaque famille sont indiquées dans sa référence. Les cinq familles du pilote sont implémentées et en attente d’approbation; les lots 02–10 restent suspendus jusqu’à validation.

## Familles classées par usage observé

| Famille | Référence | Dépendances ou blocages | Importance observée | Lot | État |
| --- | --- | --- | --- | --- | --- |
| WorkspaceTabs | [`components/workspace-tabs.md`](components/workspace-tabs.md) | LucideIcon; CSS .module-tabs; controlled activeId/onChange | 9 fichier(s) : commerce-module, ecommerce-module, stock-module, transport-module, presence-module, payroll-module, operational-modules, control-center, company-organization | 01 — pilote | implemented |
| ActionButton | [`components/action-button.md`](components/action-button.md) | React MouseEvent/useState; Lucide Plus/LoaderCircle; PromiseLike behavior | 2 fichier(s) : src/App.tsx, src/pages/organization-shared.tsx | 01 — pilote | implemented |
| Field (application) | [`components/app-field.md`](components/app-field.md) | React useState; Eye/EyeOff; HTMLInputTypeAttribute; app CSS variables | 2 fichier(s) : src/App.tsx, src/pages/organization-shared.tsx | 01 — pilote | implemented |
| Input | [`components/input.md`](components/input.md) | React forwardRef; local cn utility | 2 fichier(s) : src/components/company-installation-access.tsx, src/components/ui/sidebar.tsx | 01 — pilote | implemented |
| Metric | [`components/metric-card.md`](components/metric-card.md) | LucideIcon; source theme classes .card-surface/.fade-up/.mono | 1 fichier(s) : src/App.tsx | 01 — pilote | implemented |
| ActivityRow | [`components/activity-row.md`](components/activity-row.md) | StoreData activity shape (type-only; local public prop type required); CSS tokens | 1 fichier(s) : src/App.tsx | 02 — application primitives | pending |
| Brand | [`components/brand.md`](components/brand.md) | wouter Link; maximus-mark.svg; CSS accent/sidebar tokens | 1 fichier(s) : src/App.tsx | 02 — application primitives | pending |
| DataTable | [`components/data-table.md`](components/data-table.md) | ReactNode cells; source table CSS | 1 fichier(s) : src/App.tsx | 02 — application primitives | pending |
| StatusBadge | [`components/status-badge.md`](components/status-badge.md) | CSS primary/accent/muted/destructive tokens | 1 fichier(s) : src/App.tsx | 02 — application primitives | pending |
| Step | [`components/step-indicator.md`](components/step-indicator.md) | Lucide Check; CSS primary/accent/border tokens | 1 fichier(s) : src/App.tsx | 02 — application primitives | pending |
| Toolbar | [`components/toolbar.md`](components/toolbar.md) | ReactNode; Lucide Search; controlled search value | 1 fichier(s) : src/App.tsx | 02 — application primitives | pending |
| Badge | [`components/badge.md`](components/badge.md) | class-variance-authority; cn | 1 fichier(s) : src/components/company-installation-access.tsx | 03 — UI foundations | pending |
| Button | [`components/button.md`](components/button.md) | @radix-ui/react-slot; class-variance-authority; cn; internal UI consumers | 1 fichier(s) : src/components/company-installation-access.tsx | 03 — UI foundations | pending |
| Card | [`components/card.md`](components/card.md) | cn utility | 1 fichier(s) : src/components/company-installation-access.tsx | 03 — UI foundations | pending |
| Skeleton | [`components/skeleton.md`](components/skeleton.md) | cn utility | 1 fichier(s) : src/components/ui/sidebar.tsx only | 03 — UI foundations | pending |
| Toast | [`components/toast.md`](components/toast.md) | @radix-ui/react-toast; Toaster | 1 fichier(s) : src/hooks/use-toast.ts | 04 — feedback | pending |
| Toaster | [`components/toaster.md`](components/toaster.md) | Toast; use-toast hook | 1 fichier(s) : src/App.tsx | 04 — feedback | pending |
| Tooltip | [`components/tooltip.md`](components/tooltip.md) | @radix-ui/react-tooltip; internal Sidebar | 1 fichier(s) : src/App.tsx | 04 — feedback | pending |
| AlertDialog | [`components/alert-dialog.md`](components/alert-dialog.md) | @radix-ui/react-alert-dialog; internal Button; cn | 1 fichier(s) : src/components/company-installation-access.tsx | 05 — overlays | pending |
| Dialog | [`components/dialog.md`](components/dialog.md) | @radix-ui/react-dialog; Lucide | 1 fichier(s) : src/components/company-installation-access.tsx | 05 — overlays | pending |
| ButtonGroup | [`components/button-group.md`](components/button-group.md) | Button; Separator; class-variance-authority; cn | 0 import direct; dépendances internes documentées | 03 — UI foundations | pending |
| Label | [`components/label.md`](components/label.md) | @radix-ui/react-label; cn; internal Field/Form | 0 import direct; dépendances internes documentées | 03 — UI foundations | pending |
| Separator | [`components/separator.md`](components/separator.md) | @radix-ui/react-separator; internal Field/InputGroup/Item/Sidebar | 0 import direct; dépendances internes documentées | 03 — UI foundations | pending |
| Textarea | [`components/textarea.md`](components/textarea.md) | cn utility; internal InputGroup | 0 import direct; dépendances internes documentées | 03 — UI foundations | pending |
| Alert | [`components/alert.md`](components/alert.md) | cn utility | 0 import direct; dépendances internes documentées | 04 — feedback | pending |
| Sonner | [`components/sonner.md`](components/sonner.md) | sonner; next-themes | 0 import direct; dépendances internes documentées | 04 — feedback | pending |
| Drawer | [`components/drawer.md`](components/drawer.md) | vaul | 0 import direct; dépendances internes documentées | 05 — overlays | pending |
| Sheet | [`components/sheet.md`](components/sheet.md) | @radix-ui/react-dialog; internal Sidebar | 0 import direct; dépendances internes documentées | 05 — overlays | pending |
| Field (UI) | [`components/field.md`](components/field.md) | Label; Separator | 0 import direct; dépendances internes documentées | 06 — forms and sidebar | pending |
| Form | [`components/form.md`](components/form.md) | react-hook-form; @hookform/resolvers; Label; Slot | 0 import direct; dépendances internes documentées | 06 — forms and sidebar | pending |
| InputGroup | [`components/input-group.md`](components/input-group.md) | Button; Input; Separator; Textarea | 0 import direct; dépendances internes documentées | 06 — forms and sidebar | pending |
| Sidebar | [`components/sidebar.md`](components/sidebar.md) | Button; Input; Separator; Sheet; Skeleton; Tooltip | 0 import direct; dépendances internes documentées | 06 — forms and sidebar | pending |
| Command | [`components/command.md`](components/command.md) | cmdk; internal Dialog | 0 import direct; dépendances internes documentées | 07 — menus and selectors | pending |
| ContextMenu | [`components/context-menu.md`](components/context-menu.md) | @radix-ui/react-context-menu | 0 import direct; dépendances internes documentées | 07 — menus and selectors | pending |
| DropdownMenu | [`components/dropdown-menu.md`](components/dropdown-menu.md) | @radix-ui/react-dropdown-menu; Lucide; cn | 0 import direct; dépendances internes documentées | 07 — menus and selectors | pending |
| HoverCard | [`components/hover-card.md`](components/hover-card.md) | @radix-ui/react-hover-card | 0 import direct; dépendances internes documentées | 07 — menus and selectors | pending |
| Popover | [`components/popover.md`](components/popover.md) | @radix-ui/react-popover | 0 import direct; dépendances internes documentées | 07 — menus and selectors | pending |
| Select | [`components/select.md`](components/select.md) | @radix-ui/react-select; Lucide; cn | 0 import direct; dépendances internes documentées | 07 — menus and selectors | pending |
| Accordion | [`components/accordion.md`](components/accordion.md) | @radix-ui/react-accordion | 0 import direct; dépendances internes documentées | 08 — selection controls | pending |
| Checkbox | [`components/checkbox.md`](components/checkbox.md) | @radix-ui/react-checkbox; Lucide; cn | 0 import direct; dépendances internes documentées | 08 — selection controls | pending |
| Collapsible | [`components/collapsible.md`](components/collapsible.md) | @radix-ui/react-collapsible | 0 import direct; dépendances internes documentées | 08 — selection controls | pending |
| Progress | [`components/progress.md`](components/progress.md) | @radix-ui/react-progress | 0 import direct; dépendances internes documentées | 08 — selection controls | pending |
| RadioGroup | [`components/radio-group.md`](components/radio-group.md) | @radix-ui/react-radio-group; Lucide; cn | 0 import direct; dépendances internes documentées | 08 — selection controls | pending |
| Slider | [`components/slider.md`](components/slider.md) | @radix-ui/react-slider; cn | 0 import direct; dépendances internes documentées | 08 — selection controls | pending |
| Switch | [`components/switch.md`](components/switch.md) | @radix-ui/react-switch; cn | 0 import direct; dépendances internes documentées | 08 — selection controls | pending |
| Tabs | [`components/tabs.md`](components/tabs.md) | @radix-ui/react-tabs; cn; distinct from WorkspaceTabs | 0 import direct; dépendances internes documentées | 08 — selection controls | pending |
| Toggle | [`components/toggle.md`](components/toggle.md) | @radix-ui/react-toggle; class-variance-authority; cn | 0 import direct; dépendances internes documentées | 08 — selection controls | pending |
| ToggleGroup | [`components/toggle-group.md`](components/toggle-group.md) | @radix-ui/react-toggle-group; Toggle | 0 import direct; dépendances internes documentées | 08 — selection controls | pending |
| Breadcrumb | [`components/breadcrumb.md`](components/breadcrumb.md) | Lucide icons; cn | 0 import direct; dépendances internes documentées | 09 — data and navigation | pending |
| Calendar | [`components/calendar.md`](components/calendar.md) | react-day-picker; Button; date utilities | 0 import direct; dépendances internes documentées | 09 — data and navigation | pending |
| Empty | [`components/empty.md`](components/empty.md) | Lucide; cn | 0 import direct; dépendances internes documentées | 09 — data and navigation | pending |
| Item | [`components/item.md`](components/item.md) | Separator; cn | 0 import direct; dépendances internes documentées | 09 — data and navigation | pending |
| Kbd | [`components/kbd.md`](components/kbd.md) | cn utility | 0 import direct; dépendances internes documentées | 09 — data and navigation | pending |
| Menubar | [`components/menubar.md`](components/menubar.md) | @radix-ui/react-menubar; Lucide | 0 import direct; dépendances internes documentées | 09 — data and navigation | pending |
| NavigationMenu | [`components/navigation-menu.md`](components/navigation-menu.md) | @radix-ui/react-navigation-menu; cn | 0 import direct; dépendances internes documentées | 09 — data and navigation | pending |
| Pagination | [`components/pagination.md`](components/pagination.md) | Button; Lucide; cn | 0 import direct; dépendances internes documentées | 09 — data and navigation | pending |
| Table | [`components/table.md`](components/table.md) | cn utility; distinct from app-ui DataTable | 0 import direct; dépendances internes documentées | 09 — data and navigation | pending |
| AspectRatio | [`components/aspect-ratio.md`](components/aspect-ratio.md) | @radix-ui/react-aspect-ratio | 0 import direct; dépendances internes documentées | 10 — additional primitives | pending |
| Avatar | [`components/avatar.md`](components/avatar.md) | @radix-ui/react-avatar | 0 import direct; dépendances internes documentées | 10 — additional primitives | pending |
| Carousel | [`components/carousel.md`](components/carousel.md) | embla-carousel-react; Button; Lucide; cn | 0 import direct; dépendances internes documentées | 10 — additional primitives | pending |
| Chart | [`components/chart.md`](components/chart.md) | recharts; tokenized chart colors | 0 import direct; dépendances internes documentées | 10 — additional primitives | pending |
| InputOTP | [`components/input-otp.md`](components/input-otp.md) | input-otp; Separator | 0 import direct; dépendances internes documentées | 10 — additional primitives | pending |
| Resizable | [`components/resizable.md`](components/resizable.md) | react-resizable-panels | 0 import direct; dépendances internes documentées | 10 — additional primitives | pending |
| ScrollArea | [`components/scroll-area.md`](components/scroll-area.md) | @radix-ui/react-scroll-area | 0 import direct; dépendances internes documentées | 10 — additional primitives | pending |
| Spinner | [`components/spinner.md`](components/spinner.md) | Lucide | 0 import direct; dépendances internes documentées | 10 — additional primitives | pending |
