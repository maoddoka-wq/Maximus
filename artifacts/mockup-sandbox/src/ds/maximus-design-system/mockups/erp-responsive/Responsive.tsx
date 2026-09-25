import { useState, type ReactNode } from 'react';
import {
  Bell,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  ShoppingCart,
  Users,
  WalletCards,
} from 'lucide-react';
import { ActivityRow } from '@workspace/maximus-design-system/components/ui/activity-row';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/maximus-design-system/components/ui/card';
import { DataTable } from '@workspace/maximus-design-system/components/ui/data-table';
import { Input } from '@workspace/maximus-design-system/components/ui/input';
import { Metric } from '@workspace/maximus-design-system/components/ui/metric-card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@workspace/maximus-design-system/components/ui/sheet';
import { StatusBadge } from '@workspace/maximus-design-system/components/ui/status-badge';

type Sale = {
  reference: string;
  client: string;
  amount: string;
  status: string;
  date: string;
};

type Activity = {
  id: string;
  user: string;
  action: string;
  module: string;
  object: string;
  date: string;
};

const sales: Sale[] = [
  {
    reference: 'VTE-2024-0184',
    client: 'Société Kanel Distribution',
    amount: '485 000 FCFA',
    status: 'VALIDÉ',
    date: '24 juin 2024',
  },
  {
    reference: 'VTE-2024-0183',
    client: 'Atelier Ndar',
    amount: '128 500 FCFA',
    status: 'VALIDÉ',
    date: '24 juin 2024',
  },
  {
    reference: 'VTE-2024-0182',
    client: 'Bâtiment & Services',
    amount: '875 000 FCFA',
    status: 'EN ATTENTE',
    date: '23 juin 2024',
  },
  {
    reference: 'VTE-2024-0181',
    client: 'Marché Central',
    amount: '64 000 FCFA',
    status: 'VALIDÉ',
    date: '23 juin 2024',
  },
];

const activities: Activity[] = [
  {
    id: 'a1',
    user: 'Awa Ndiaye',
    action: 'a validé la vente VTE-2024-0184',
    module: 'Commerce',
    object: 'Société Kanel Distribution',
    date: 'Il y a 18 min',
  },
  {
    id: 'a2',
    user: 'Moussa Diop',
    action: 'a créé une demande de réapprovisionnement',
    module: 'Stocks',
    object: 'Cartouches toner',
    date: 'Il y a 42 min',
  },
  {
    id: 'a3',
    user: 'Awa Ndiaye',
    action: 'a ajouté une tâche de coordination',
    module: 'Contrôle',
    object: 'Inventaire mensuel',
    date: 'Il y a 1 h',
  },
  {
    id: 'a4',
    user: 'Fatou Fall',
    action: 'a enregistré une nouvelle réception',
    module: 'Achats',
    object: 'Commande FAC-0098',
    date: 'Il y a 2 h',
  },
];

const navGroups = [
  {
    label: 'Administration',
    items: [
      { label: 'Vue d’ensemble', icon: Gauge, href: '/entreprise/dashboard' },
      {
        label: 'Contrôle & coordination',
        icon: ClipboardCheck,
        href: '/entreprise/controle',
      },
      {
        label: 'Organisation & accès',
        icon: Users,
        href: '/entreprise/organisation',
      },
    ],
  },
  {
    label: 'Modules',
    items: [
      { label: 'Gestion de stock', icon: Package, href: '/entreprise/stocks' },
      {
        label: 'Gestion commerciale',
        icon: ShoppingCart,
        href: '/entreprise/commerce',
      },
      { label: 'Finance', icon: WalletCards, href: '/entreprise/finance' },
      { label: 'Ressources humaines', icon: Users, href: '/entreprise/rh' },
      { label: 'Rapports', icon: LayoutGrid, href: '/entreprise/rapports' },
    ],
  },
];

const quickLinks = [
  {
    id: 'commerce',
    label: 'Ventes & clients',
    description: 'Suivez les ventes, les clients et la performance commerciale.',
    icon: ShoppingCart,
    path: '/entreprise/commerce',
  },
  {
    id: 'stocks',
    label: 'Stock & achats',
    description: 'Surveillez les niveaux, mouvements et réapprovisionnements.',
    icon: Package,
    path: '/entreprise/stocks',
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Consultez les écritures et les mouvements financiers.',
    icon: WalletCards,
    path: '/entreprise/finance',
  },
  {
    id: 'team',
    label: 'Équipe & présences',
    description: 'Organisez les équipes, les accès et le suivi quotidien.',
    icon: Users,
    path: '/entreprise/presences',
  },
];

function NavigationList({
  path,
  navigate,
  compact = false,
  onNavigate,
}: {
  path: string;
  navigate: (nextPath: string) => void;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navigation de l’espace entreprise" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
      {navGroups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          {!compact && (
            <p className="mb-2 border-l-2 border-accent bg-sidebar-accent px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-sidebar-foreground">
              {group.label}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = item.href === path;
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  type="button"
                  variant={active ? 'secondary' : 'ghost'}
                  title={compact ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    navigate(item.href);
                    onNavigate?.();
                  }}
                  className={`min-h-11 w-full justify-start px-3 text-left ${
                    compact ? 'justify-center px-2' : ''
                  }`}
                >
                  <Icon size={17} aria-hidden="true" />
                  {!compact && <span className="min-w-0">{item.label}</span>}
                </Button>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

function DesktopSidebar({
  collapsed,
  onToggle,
  path,
  navigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  path: string;
  navigate: (nextPath: string) => void;
}) {
  return (
    <aside
      className={`hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div
        className={`flex min-h-20 items-center border-b border-sidebar-border ${
          collapsed ? 'justify-between px-1' : 'justify-between px-3'
        }`}
      >
        <div className={`flex min-w-0 items-center ${collapsed ? '' : 'gap-3'}`}>
          <span
            className={`flex shrink-0 items-center justify-center bg-accent font-bold text-accent-foreground ${
              collapsed ? 'h-8 w-8 rounded-lg text-xs' : 'h-11 w-11 rounded-xl'
            }`}
          >
            NS
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="break-words text-sm font-bold leading-tight">NOVA SERVICES</p>
              <p className="mt-1 text-xs text-sidebar-foreground">Espace entreprise</p>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={collapsed ? 'Déployer le menu' : 'Rétracter le menu'}
          title={collapsed ? 'Déployer le menu' : 'Rétracter le menu'}
          className={collapsed ? 'min-h-9 min-w-9' : 'min-h-10 min-w-10'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </Button>
      </div>
      <NavigationList path={path} navigate={navigate} compact={collapsed} />
      <div className="border-t border-sidebar-border p-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => undefined}
          title={collapsed ? 'Se déconnecter' : undefined}
          className={`min-h-11 w-full justify-start px-3 ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut size={17} aria-hidden="true" />
          {!collapsed && 'Se déconnecter'}
        </Button>
        {!collapsed && (
          <p className="mt-4 px-3 text-sm font-black tracking-tight">
            MAXIMUS<span className="text-accent">.</span>
          </p>
        )}
      </div>
    </aside>
  );
}

function Topbar({
  title,
  onNavigate,
  onRefresh,
}: {
  title: string;
  onNavigate: (nextPath: string) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const menuTrigger: ReactNode = (
    <SheetTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Ouvrir le menu"
        className="min-h-10 min-w-10 md:hidden"
      >
        <Menu size={19} aria-hidden="true" />
      </Button>
    </SheetTrigger>
  );

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 border-b border-border bg-background px-3 backdrop-blur sm:min-h-20 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {menuTrigger}
        <div className="min-w-0">
          <p className="hidden items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:flex">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            Espace de travail
          </p>
          <p className="truncate text-sm font-bold leading-tight tracking-tight sm:mt-1 sm:text-xl">
            {title}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="relative hidden lg:block">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Rechercher une entreprise"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && search.trim()) {
                onNavigate('/entreprise/organisation');
              }
            }}
            placeholder="Rechercher une entreprise..."
            className="w-64 pl-9"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Actualiser les données"
          title="Actualiser les données"
          onClick={onRefresh}
          className="min-h-10 min-w-10"
        >
          <RefreshCw size={18} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Aide MAXIMUS"
          title="Aide MAXIMUS"
          onClick={() => undefined}
          className="min-h-10 min-w-10"
        >
          <HelpCircle size={18} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="2 notifications non lues"
          title="Notifications"
          onClick={() => onNavigate('/entreprise/notifications')}
          className="relative min-h-10 min-w-10"
        >
          <Bell size={18} aria-hidden="true" />
          <span className="absolute right-0 top-0 min-w-4 rounded-full bg-destructive px-1 text-center text-xs font-bold leading-4 text-destructive-foreground">
            2
          </span>
        </Button>
      </div>
    </header>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <CardHeader className="flex-row items-center justify-between gap-3 p-4 sm:p-5">
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-wider text-primary">{eyebrow}</p>
        <CardTitle className="mt-2">{title}</CardTitle>
      </div>
      {action}
    </CardHeader>
  );
}

export function Responsive() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [path, setPath] = useState('/entreprise/dashboard');
  const [updated, setUpdated] = useState(false);

  const navigate = (nextPath: string) => setPath(nextPath);
  const signals = [
    {
      icon: Package,
      title: '2 produit(s) à réapprovisionner',
      detail: 'Le seuil de sécurité est atteint.',
      href: '/entreprise/stocks',
    },
    {
      icon: ClipboardCheck,
      title: '1 achat(s) à suivre',
      detail: 'Commandes ou réceptions non finalisées.',
      href: '/entreprise/achats',
    },
    {
      icon: ClipboardCheck,
      title: '3 tâche(s) à traiter',
      detail: 'Coordination et décisions de votre périmètre.',
      href: '/entreprise/controle',
    },
  ];

  const refresh = () => {
    setUpdated(true);
    window.setTimeout(() => setUpdated(false), 1800);
  };

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <div className="flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
        <DesktopSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((current) => !current)}
          path={path}
          navigate={navigate}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          <Topbar title="Pilotage de NOVA SERVICES" onNavigate={navigate} onRefresh={refresh} />
          <div className="mx-auto max-w-screen-2xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
            <div className="mb-5 flex flex-col justify-between gap-3 border-b border-border pb-4 sm:mb-6 sm:flex-row sm:items-end sm:pb-5">
              <div className="min-w-0">
                <p className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">
                  NOVA SERVICES
                </p>
                <h1 className="max-w-4xl text-xl font-bold tracking-tight sm:text-3xl">
                  Pilotage de NOVA SERVICES
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Commerce · Une vue claire pour décider plus vite.
                </p>
              </div>
              <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                {updated ? 'Données actualisées à l’instant' : 'Mis à jour à l’instant'}
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <Card className="overflow-hidden p-4 sm:p-6">
                <div className="rounded-lg bg-primary/5 p-4 sm:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-2xl">
                      <p className="font-mono text-xs uppercase tracking-wider text-primary">
                        Pilotage de l’entreprise
                      </p>
                      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                        Une vue claire pour décider plus vite.
                      </h2>
                      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                        MAXIMUS rassemble ici les indicateurs et les alertes de vos modules autorisés.
                        Les données affichées respectent votre entreprise et votre rôle.
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <Button
                        type="button"
                        onClick={() => navigate('/entreprise/commerce')}
                        className="w-full sm:w-auto"
                      >
                        Ouvrir Ventes &amp; clients
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/entreprise/rapports')}
                        className="w-full sm:w-auto"
                      >
                        Voir les rapports
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <section
                aria-label="Indicateurs de l’entreprise"
                className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
              >
                <Metric
                  label="Chiffre d’affaires validé"
                  value="1,55 M"
                  suffix=" FCFA"
                  detail="3 vente(s) validée(s)"
                  icon={CircleDollarSign}
                  accent
                />
                <Metric
                  label="Ventes validées"
                  value="03"
                  detail="dans les données disponibles"
                  icon={ShoppingCart}
                />
                <Metric
                  label="Produits à surveiller"
                  value="02"
                  detail="seuil de sécurité atteint"
                  icon={Package}
                  warning
                />
                <Metric
                  label="Équipe active"
                  value="12"
                  detail="14 compte(s) dans votre périmètre"
                  icon={Users}
                />
              </section>

              <div className="grid gap-4 xl:grid-cols-2 xl:gap-6">
                <Card className="min-w-0">
                  <SectionHeading eyebrow="Décisions à prendre" title="Les signaux du jour" />
                  <CardContent className="space-y-2 p-4 pt-0 sm:p-5 sm:pt-0">
                    {signals.map(({ icon: Icon, title, detail, href }, index) => (
                      <Button
                        key={href}
                        type="button"
                        variant="outline"
                        onClick={() => navigate(href)}
                        className={`h-auto min-h-11 w-full justify-start whitespace-normal px-3 py-3 text-left ${
                          index === 0 ? 'border-accent bg-accent/10' : ''
                        }`}
                      >
                        <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <strong className="block text-sm">{title}</strong>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {detail}
                          </span>
                        </span>
                        <ChevronRight size={16} aria-hidden="true" className="shrink-0" />
                      </Button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="min-w-0">
                  <SectionHeading eyebrow="Accès rapides" title="Vos espaces MAXIMUS" />
                  <CardContent className="space-y-2 p-4 pt-0 sm:p-5 sm:pt-0">
                    {quickLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Button
                          key={link.id}
                          type="button"
                          variant="outline"
                          onClick={() => navigate(link.path)}
                          className="h-auto min-h-11 w-full justify-start gap-3 whitespace-normal px-3 py-3 text-left"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon size={17} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <strong className="block text-sm">{link.label}</strong>
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground sm:truncate">
                              {link.description}
                            </span>
                          </span>
                          <ChevronRight size={16} aria-hidden="true" className="shrink-0" />
                        </Button>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <SectionHeading
                  eyebrow="Activité commerciale"
                  title="Dernières ventes"
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/entreprise/commerce')}
                      className="shrink-0"
                    >
                      Tout voir <ChevronRight size={14} aria-hidden="true" />
                    </Button>
                  }
                />
                <div className="hidden xl:block">
                  <DataTable
                    headers={['Référence', 'Client', 'Montant', 'Statut', 'Date']}
                    rows={sales.map((sale) => [
                      sale.reference,
                      sale.client,
                      sale.amount,
                      <StatusBadge key={sale.reference} status={sale.status} />,
                      sale.date,
                    ])}
                  />
                </div>
                <div className="space-y-2 px-4 pb-4 xl:hidden">
                  {sales.map((sale) => (
                    <article
                      key={sale.reference}
                      className="min-w-0 rounded-lg border border-border p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                        <p className="break-all font-mono text-xs font-semibold text-primary">
                          {sale.reference}
                        </p>
                        <p className="text-xs text-muted-foreground">{sale.date}</p>
                      </div>
                      <p className="mt-2 break-words text-sm font-semibold">{sale.client}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold">{sale.amount}</p>
                        <StatusBadge status={sale.status} />
                      </div>
                    </article>
                  ))}
                </div>
              </Card>

              <Card className="overflow-hidden">
                <SectionHeading
                  eyebrow="Traçabilité"
                  title="Activité récente"
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/entreprise/controle')}
                      className="shrink-0"
                    >
                      Voir le contrôle <ChevronRight size={14} aria-hidden="true" />
                    </Button>
                  }
                />
                <div className="divide-y divide-border">
                  {activities.map((activity, index) => (
                    <ActivityRow key={activity.id} activity={activity} delay={index} />
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
      <SheetContent side="left" className="w-72 p-0 sm:max-w-sm md:hidden">
        <SheetHeader className="border-b border-border p-4 pr-14 text-left">
          <SheetTitle className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
              NS
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">NOVA SERVICES</span>
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Espace entreprise
              </span>
            </span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Accédez aux espaces et modules de NOVA SERVICES.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col pt-3">
          <NavigationList
            path={path}
            navigate={navigate}
            onNavigate={() => setMobileOpen(false)}
          />
          <div className="border-t border-border p-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMobileOpen(false)}
              className="min-h-11 w-full justify-start px-3"
            >
              <LogOut size={17} aria-hidden="true" />
              Se déconnecter
            </Button>
            <p className="mt-4 px-3 text-sm font-black tracking-tight">
              MAXIMUS<span className="text-accent">.</span>
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}