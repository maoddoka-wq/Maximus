import { useState } from 'react';
import {
  Bell, ChevronRight, CircleDollarSign, ClipboardCheck,
  Gauge, HelpCircle, LayoutGrid, Menu, Package, PanelLeftClose, PanelLeftOpen,
  RefreshCw, Search, ShoppingCart, Users, WalletCards, X,
} from 'lucide-react';
import { ActivityRow } from '@workspace/maximus-design-system/components/ui/activity-row';
import { DataTable } from '@workspace/maximus-design-system/components/ui/data-table';
import { Metric } from '@workspace/maximus-design-system/components/ui/metric-card';
import { StatusBadge } from '@workspace/maximus-design-system/components/ui/status-badge';

type Sale = { reference: string; client: string; amount: string; status: string; date: string };
type Activity = { id: string; user: string; action: string; module: string; object: string; date: string };

const sales: Sale[] = [
  { reference: 'VTE-2024-0184', client: 'Société Kanel Distribution', amount: '485 000 FCFA', status: 'VALIDÉ', date: '24 juin 2024' },
  { reference: 'VTE-2024-0183', client: 'Atelier Ndar', amount: '128 500 FCFA', status: 'VALIDÉ', date: '24 juin 2024' },
  { reference: 'VTE-2024-0182', client: 'Bâtiment & Services', amount: '875 000 FCFA', status: 'EN ATTENTE', date: '23 juin 2024' },
  { reference: 'VTE-2024-0181', client: 'Marché Central', amount: '64 000 FCFA', status: 'VALIDÉ', date: '23 juin 2024' },
];
const activities: Activity[] = [
  { id: 'a1', user: 'Awa Ndiaye', action: 'a validé la vente VTE-2024-0184', module: 'Commerce', object: 'Société Kanel Distribution', date: 'Il y a 18 min' },
  { id: 'a2', user: 'Moussa Diop', action: 'a créé une demande de réapprovisionnement', module: 'Stocks', object: 'Cartouches toner', date: 'Il y a 42 min' },
  { id: 'a3', user: 'Awa Ndiaye', action: 'a ajouté une tâche de coordination', module: 'Contrôle', object: 'Inventaire mensuel', date: 'Il y a 1 h' },
  { id: 'a4', user: 'Fatou Fall', action: 'a enregistré une nouvelle réception', module: 'Achats', object: 'Commande FAC-0098', date: 'Il y a 2 h' },
];

const navGroups = [
  { label: 'Administration', items: [{ label: 'Vue d’ensemble', icon: Gauge, href: '/entreprise/dashboard' }, { label: 'Contrôle & coordination', icon: ClipboardCheck, href: '/entreprise/controle' }, { label: 'Organisation & accès', icon: Users, href: '/entreprise/organisation' }] },
  { label: 'Modules', items: [{ label: 'Gestion de stock', icon: Package, href: '/entreprise/stocks' }, { label: 'Gestion commerciale', icon: ShoppingCart, href: '/entreprise/commerce' }, { label: 'Finance', icon: WalletCards, href: '/entreprise/finance' }, { label: 'Ressources humaines', icon: Users, href: '/entreprise/rh' }, { label: 'Rapports', icon: LayoutGrid, href: '/entreprise/rapports' }] },
];

function Sidebar({ open, collapsed, onClose, onToggle, navigate }: { open: boolean; collapsed: boolean; onClose: () => void; onToggle: () => void; navigate: (path: string) => void }) {
  const compact = collapsed && !open;
  return <>
    <button aria-label="Fermer le menu" onClick={onClose} className={`fixed inset-0 z-40 bg-[hsl(var(--foreground)/.35)] backdrop-blur-sm md:hidden ${open ? 'block' : 'hidden'}`} />
    <aside className={`sidebar shrink-0 flex-col overscroll-contain overflow-y-auto transition-[width] duration-200 md:relative md:flex md:h-[100dvh] ${compact ? 'md:w-20' : 'md:w-64'} ${open ? 'fixed inset-y-0 left-0 z-50 flex w-72 shadow-2xl' : 'hidden'}`}>
      <div className={`sticky top-0 z-10 flex items-center border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar)/.96)] py-4 backdrop-blur md:border-b-0 md:bg-transparent md:py-6 ${compact ? 'gap-1 px-2' : 'justify-between px-4'}`}>
        <div className={`flex min-w-0 items-center ${compact ? 'gap-1' : 'gap-3'}`}>
          <span className={`${compact ? 'h-8 w-8 rounded-lg text-[10px]' : 'h-12 w-12 rounded-xl text-sm'} flex shrink-0 items-center justify-center bg-[hsl(var(--accent)/.18)] font-bold text-[hsl(var(--accent))]`}>NS</span>
          {!compact && <div className="min-w-0"><p className="break-words text-sm font-bold leading-tight">NOVA SERVICES</p><p className="mt-0.5 text-[10px] text-[hsl(var(--sidebar-foreground)/.55)]">Espace entreprise</p></div>}
        </div>
        <button aria-label={compact ? 'Déployer le menu' : 'Rétracter le menu'} onClick={onToggle} className={`hidden rounded-lg text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-[hsl(var(--sidebar-accent))] md:block ${compact ? 'p-1' : 'p-2'}`}>{compact ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={18} />}</button>
        <button aria-label="Fermer le menu" onClick={onClose} className="rounded-lg p-2 text-[hsl(var(--sidebar-foreground)/.7)] md:hidden"><X size={18} /></button>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-hidden px-3 pb-4">
        {navGroups.map((group, index) => <section key={group.label} className={`${!compact && index > 0 ? 'mt-4 border-t border-[hsl(var(--sidebar-border))] pt-3' : ''}`}>
          {!compact && <div className="mb-2 flex items-center border-l-2 border-[hsl(var(--accent))] bg-[hsl(var(--sidebar-accent)/.4)] px-3 py-2"><span className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.7)]">{group.label}</span></div>}
          <div className="space-y-1">{group.items.map(item => {
            const active = item.href === '/entreprise/dashboard';
            return <button key={item.href} title={compact ? item.label : undefined} onClick={() => { navigate(item.href); onClose(); }} className={`nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${compact ? 'justify-center' : ''} ${active ? 'active' : 'text-[hsl(var(--sidebar-foreground)/.7)]'}`}><item.icon size={17} strokeWidth={active ? 2.5 : 1.8} />{!compact && item.label}</button>;
          })}</div>
        </section>)}
      </nav>
      <div className={`border-t border-[hsl(var(--sidebar-border))] pt-4 ${compact ? 'm-3' : 'm-4'}`}>
        <button title={compact ? 'Se déconnecter' : undefined} className={`nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[hsl(var(--sidebar-foreground)/.64)] ${compact ? 'justify-center' : ''}`}><span className="text-base">↪</span>{!compact && 'Se déconnecter'}</button>
        {!compact && <div className="mt-4 text-sm font-black tracking-[-.06em] text-[hsl(var(--sidebar-foreground))]">MAXIMUS<span className="text-[hsl(var(--accent))]">.</span></div>}
      </div>
    </aside>
  </>;
}

function Topbar({ title, onMenu, navigate }: { title: string; onMenu: () => void; navigate: (path: string) => void }) {
  const [search, setSearch] = useState('');
  return <header className="topbar flex min-h-[78px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.88)] px-4 backdrop-blur sm:px-6 lg:px-8">
    <div className="flex min-w-0 items-center gap-3"><button aria-label="Ouvrir le menu" onClick={onMenu} className="topbar-icon rounded-lg p-2 md:hidden"><Menu size={19} /></button><div className="min-w-0 max-w-[calc(100vw-150px)]"><p className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />Espace de travail</p><div className="mt-0.5 flex min-w-0 items-center gap-2.5 sm:mt-1"><span className="hidden h-7 w-1 shrink-0 rounded-full bg-[hsl(var(--primary))] sm:block" /><div className="truncate text-base font-black leading-tight tracking-[-.035em] sm:text-xl">{title}</div></div></div></div>
    <div className="flex items-center gap-1.5 sm:gap-2.5"><div className="relative hidden lg:block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && search.trim() && navigate('/entreprise/organisation')} placeholder="Rechercher une entreprise..." className="topbar-search w-64 rounded-lg border border-transparent bg-[hsl(var(--muted))] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[hsl(var(--primary))]" /></div><button aria-label="Actualiser les données" className="topbar-icon rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><RefreshCw size={18} /></button><button aria-label="Aide MAXIMUS" className="topbar-icon rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><HelpCircle size={18} /></button><button aria-label="2 notifications non lues" onClick={() => navigate('/entreprise/notifications')} className="topbar-icon relative rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><Bell size={18} /><span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-[hsl(var(--destructive))] px-1 text-center text-[9px] font-bold leading-4 text-white">2</span></button></div>
  </header>;
}

export function Current() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [path, setPath] = useState('/entreprise/dashboard');
  const navigate = (next: string) => setPath(next);
  const lowStock = 2;
  const pendingPurchases = 1;
  const pendingTasks = 3;
  const signals = [
    { icon: Package, title: `${lowStock} produit(s) à réapprovisionner`, detail: 'Le seuil de sécurité est atteint.', href: '/entreprise/stocks' },
    { icon: ClipboardCheck, title: `${pendingPurchases} achat(s) à suivre`, detail: 'Commandes ou réceptions non finalisées.', href: '/entreprise/achats' },
    { icon: ClipboardCheck, title: `${pendingTasks} tâche(s) à traiter`, detail: 'Coordination et décisions de votre périmètre.', href: '/entreprise/controle' },
  ];
  const quickLinks = [
    { id: 'commerce', label: 'Ventes & clients', description: 'Suivez les ventes, les clients et la performance commerciale.', icon: ShoppingCart, path: '/entreprise/commerce' },
    { id: 'stocks', label: 'Stock & achats', description: 'Surveillez les niveaux, mouvements et réapprovisionnements.', icon: Package, path: '/entreprise/stocks' },
    { id: 'finance', label: 'Finance', description: 'Consultez les écritures et les mouvements financiers.', icon: WalletCards, path: '/entreprise/finance' },
    { id: 'team', label: 'Équipe & présences', description: 'Organisez les équipes, les accès et le suivi quotidien.', icon: Users, path: '/entreprise/presences' },
  ];
  return <div className="app-shell flex h-[100dvh] min-h-0 overflow-hidden">
    <Sidebar open={mobileOpen} collapsed={collapsed} onClose={() => setMobileOpen(false)} onToggle={() => setCollapsed(v => !v)} navigate={navigate} />
    <main className="app-main min-w-0 flex-1 overflow-y-auto overscroll-contain"><Topbar title="Pilotage de NOVA SERVICES" onMenu={() => setMobileOpen(true)} navigate={navigate} />
      <div className="page-pad page-content mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="page-header mb-6 flex flex-col justify-between gap-3 border-b border-[hsl(var(--border))] pb-5 sm:flex-row sm:items-end"><div className="min-w-0"><p className="mono mb-1.5 text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">NOVA SERVICES</p><h1 className="max-w-4xl text-2xl font-bold tracking-[-.04em] sm:text-3xl">Pilotage de NOVA SERVICES</h1><p className="mt-1.5 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Commerce · Une vue claire pour décider plus vite.</p></div><div className="mono hidden text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))] sm:block">Mis à jour à l’instant</div></div>
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-[hsl(var(--primary)/.22)] bg-[linear-gradient(135deg,hsl(var(--primary)/.09),hsl(var(--card)),hsl(var(--accent)/.1))] p-6 sm:p-7"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Pilotage de l’entreprise</p><h2 className="mt-3 text-2xl font-bold tracking-[-.04em] sm:text-3xl">Une vue claire pour décider plus vite.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">MAXIMUS rassemble ici les indicateurs et les alertes de vos modules autorisés. Les données affichées respectent votre entreprise et votre rôle.</p></div><div className="flex shrink-0 flex-wrap gap-2"><button onClick={() => navigate('/entreprise/commerce')} className="rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:opacity-90">Ouvrir Ventes & clients</button><button onClick={() => navigate('/entreprise/rapports')} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)] px-4 py-3 text-xs font-bold transition hover:bg-[hsl(var(--muted))]">Voir les rapports</button></div></div></section>
          <div className="mobile-stat-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="Chiffre d’affaires validé" value="1,55 M" suffix=" FCFA" detail="3 vente(s) validée(s)" icon={CircleDollarSign} accent /><Metric label="Ventes validées" value="03" detail="dans les données disponibles" icon={ShoppingCart} /><Metric label="Produits à surveiller" value="02" detail="seuil de sécurité atteint" icon={Package} warning /><Metric label="Équipe active" value="12" detail="14 compte(s) dans votre périmètre" icon={Users} /></div>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><section className="card-surface rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">Décisions à prendre</p><h2 className="mt-2 text-xl font-bold">Les signaux du jour</h2></div><Bell size={18} className="text-[hsl(var(--muted-foreground))]" /></div><div className="mt-6 space-y-3">{signals.map(({ icon: Icon, title, detail, href }, i) => <button key={href} onClick={() => navigate(href)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:bg-[hsl(var(--muted)/.45)] ${i === 0 ? 'border-[hsl(var(--accent)/.45)] bg-[hsl(var(--accent)/.1)]' : ''}`}><Icon size={17} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" /><span className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">{detail}</span></span><ChevronRight size={16} className="mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]" /></button>)}</div></section>
            <section className="card-surface rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">Accès rapides</p><h2 className="mt-2 text-xl font-bold">Vos espaces MAXIMUS</h2></div><Gauge size={18} className="text-[hsl(var(--muted-foreground))]" /></div><div className="mt-5 space-y-2">{quickLinks.map(link => { const Icon = link.icon; return <button key={link.id} onClick={() => navigate(link.path)} className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-[hsl(var(--primary)/.35)] hover:bg-[hsl(var(--muted)/.4)]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Icon size={17} /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{link.label}</strong><span className="mt-0.5 block truncate text-[11px] text-[hsl(var(--muted-foreground))]">{link.description}</span></span><ChevronRight size={16} className="shrink-0 text-[hsl(var(--muted-foreground))]" /></button>; })}</div></section></div>
          <section className="card-surface overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b p-5"><div><p className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">Activité commerciale</p><h2 className="mt-2 font-bold">Dernières ventes</h2></div><button onClick={() => navigate('/entreprise/commerce')} className="text-xs font-bold text-[hsl(var(--primary))]">Tout voir <ChevronRight className="inline" size={14} /></button></div><DataTable headers={['Référence', 'Client', 'Montant', 'Statut', 'Date']} rows={sales.map(sale => [sale.reference, sale.client, sale.amount, <StatusBadge key={sale.reference} status={sale.status} />, sale.date])} /></section>
          <section className="card-surface overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b p-5"><div><p className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">Traçabilité</p><h2 className="mt-2 font-bold">Activité récente</h2></div><button onClick={() => navigate('/entreprise/controle')} className="text-xs font-bold text-[hsl(var(--primary))]">Voir le contrôle <ChevronRight className="inline" size={14} /></button></div><div className="divide-y">{activities.map((activity, index) => <ActivityRow key={activity.id} activity={activity} delay={index} />)}</div></section>
        </div>
      </div>
    </main>
  </div>;
}
