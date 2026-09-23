import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BarChart3, Building2, CalendarDays, Check, Eye, FileSignature, Globe2, Pencil, Settings2, UserRound, UsersRound, X } from 'lucide-react';
import { createImmobilierApi, type ImmobilierLead, type ImmobilierListing, type ImmobilierListingInput } from '@/lib/immobilier-api';
import { showAppToast } from '@/hooks/use-toast';

const emptyForm: ImmobilierListingInput = {
  title: '',
  propertyType: 'APPARTEMENT',
  transactionType: 'SALE',
  status: 'DRAFT',
  description: '',
  city: 'Dakar',
  neighborhood: '',
  address: '',
  price: 0,
  areaM2: null,
  bedrooms: null,
  bathrooms: null,
  furnished: false,
  featured: false,
};

const money = (value: number) => new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
const statusLabel: Record<string, string> = { DRAFT: 'Brouillon', PUBLISHED: 'Publiée', RESERVED: 'Réservée', SOLD: 'Vendue', RENTED: 'Louée', NEW: 'Nouvelle', CONTACTED: 'Contactée', CLOSED: 'Clôturée' };
const featureDetails = {
  dashboard: { title: 'Tableau de bord immobilier', description: 'Suivez les biens, la diffusion des annonces et les demandes reçues.', eyebrow: 'Vue d’ensemble' },
  biens: { title: 'Biens immobiliers', description: 'Gérez les biens disponibles et leurs caractéristiques avant leur publication.', eyebrow: 'Patrimoine' },
  annonces: { title: 'Annonces immobilières', description: 'Publiez les biens disponibles et suivez leur statut de diffusion sur votre vitrine.', eyebrow: 'Diffusion' },
  prospects: { title: 'Prospects immobiliers', description: 'Qualifiez les demandes de contact et suivez les prochaines actions commerciales.', eyebrow: 'Relation client' },
  visites: { title: 'Visites immobilières', description: 'Organisez les demandes de visite et suivez leur traitement.', eyebrow: 'Agenda commercial' },
  mandats: { title: 'Mandats immobiliers', description: 'Centralisez les mandats confiés à l’agence et leurs échéances.', eyebrow: 'Gestion contractuelle' },
  agents: { title: 'Agents immobiliers', description: 'Suivez les agents de l’agence et la répartition de leurs responsabilités.', eyebrow: 'Équipe' },
  rapports: { title: 'Rapports immobiliers', description: 'Analysez la diffusion des annonces, les demandes et la performance commerciale.', eyebrow: 'Pilotage' },
  parametres: { title: 'Paramètres immobiliers', description: 'Configurez les règles de fonctionnement et de diffusion du module immobilier.', eyebrow: 'Configuration' },
  'vitrine-publique': { title: 'Vitrine publique', description: 'Contrôlez les biens actuellement visibles par les visiteurs de votre vitrine.', eyebrow: 'Publication' },
} as const;
type ImmobilierFeatureId = keyof typeof featureDetails;
const isImmobilierFeatureId = (value: string): value is ImmobilierFeatureId => Object.prototype.hasOwnProperty.call(featureDetails, value);

export default function ImmobilierModulePage({ companyId, canCreate = true, canModify = true, featurePermissions, activeFeatureId = 'dashboard', preview = false }: { companyId: string; canCreate?: boolean; canModify?: boolean; featurePermissions?: Partial<Record<string, string[]>>; activeFeatureId?: string; preview?: boolean }) {
  const api = useMemo(() => createImmobilierApi(companyId), [companyId]);
  const [listings, setListings] = useState<ImmobilierListing[]>([]);
  const [leads, setLeads] = useState<ImmobilierLead[]>([]);
  const [form, setForm] = useState<ImmobilierListingInput>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [tab, setTab] = useState<'listings' | 'leads'>('listings');
  const [loading, setLoading] = useState(true);
  const currentFeatureId: ImmobilierFeatureId = isImmobilierFeatureId(activeFeatureId) ? activeFeatureId : 'dashboard';
  const activeFeature = featureDetails[currentFeatureId];
  const propertyView = currentFeatureId === 'biens';
  const announcementView = currentFeatureId === 'annonces';
  const leadView = currentFeatureId === 'prospects' || currentFeatureId === 'visites';
  const listingView = propertyView || announcementView;
  const visibleListings = announcementView ? listings.filter(item => item.status === 'PUBLISHED') : listings;
  const visibleLeads = currentFeatureId === 'visites'
    ? leads.filter(item => item.requestType === 'VISIT')
    : currentFeatureId === 'prospects'
      ? leads.filter(item => item.requestType === 'CONTACT')
      : leads;
  const canCreateListings = featurePermissions?.annonces ? featurePermissions.annonces.includes('créer') : canCreate;
  const canModifyListings = featurePermissions?.annonces ? featurePermissions.annonces.includes('modifier') : canModify;
  const canManageLeads = featurePermissions?.prospects ? featurePermissions.prospects.includes('modifier') : canModify;

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.bootstrap();
      setListings(result.listings);
      setLeads(result.leads);
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Les données immobilières ne sont pas disponibles.', 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (!preview) void load(); }, [companyId, preview]);
  useEffect(() => { setTab(leadView ? 'leads' : 'listings'); }, [currentFeatureId, leadView]);
  useEffect(() => {
    if (!formOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setFormOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen]);

  const reset = () => { setEditing(null); setForm(emptyForm); setFormOpen(false); };
  const openCreateForm = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (editing) {
        const result = await api.updateListing(editing, form);
        setListings(items => items.map(item => item.id === editing ? result.listing : item));
        showAppToast('Annonce mise à jour.', 'success');
      } else {
        const result = await api.createListing(form);
        setListings(items => [result.listing, ...items]);
        showAppToast('Annonce créée.', 'success');
      }
      reset();
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'L’annonce n’a pas pu être enregistrée.', 'error');
    }
  };
  const edit = (listing: ImmobilierListing) => {
    setEditing(listing.id);
    setForm({ ...listing });
    setFormOpen(true);
  };
  const archive = async (listing: ImmobilierListing) => {
    if (!window.confirm(`Archiver « ${listing.title} » ?`)) return;
    try {
      await api.archiveListing(listing.id);
      setListings(items => items.filter(item => item.id !== listing.id));
      showAppToast('Annonce archivée.', 'success');
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'L’annonce n’a pas pu être archivée.', 'error');
    }
  };
  const updateLead = async (lead: ImmobilierLead, status: ImmobilierLead['status']) => {
    try {
      await api.updateLead(lead.id, status);
      setLeads(items => items.map(item => item.id === lead.id ? { ...item, status } : item));
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'La demande n’a pas pu être mise à jour.', 'error');
    }
  };

  return <div className="space-y-5 fade-up">
    <section className="rounded-2xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Immobilier · {activeFeature.eyebrow}</p><h1 className="mt-2 text-2xl font-bold tracking-[-.04em]">{activeFeature.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{activeFeature.description}</p></div>
        <div className="flex items-center gap-3">
          <Building2 className="hidden text-[hsl(var(--primary))] sm:block" size={32} />
          {listingView && canCreateListings && <button type="button" onClick={openCreateForm} className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/.2)] transition hover:-translate-y-0.5"><Building2 size={16} />Ajouter une annonce</button>}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold">{listings.filter(item => item.status === 'PUBLISHED').length} annonces publiées</span><span className="rounded-full bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold">{leads.filter(item => item.status === 'NEW').length} demandes nouvelles</span><span className="rounded-full bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold">{listings.length} biens enregistrés</span></div>
    </section>
    {currentFeatureId === 'dashboard' && <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-2xl border bg-[hsl(var(--card))] p-5"><Building2 className="text-[hsl(var(--primary))]" size={22} /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Biens enregistrés</p><p className="mt-1 text-3xl font-bold">{listings.length}</p><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{listings.filter(item => item.status === 'PUBLISHED').length} publiés sur la vitrine</p></article>
      <article className="rounded-2xl border bg-[hsl(var(--card))] p-5"><UsersRound className="text-[hsl(var(--primary))]" size={22} /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Prospects</p><p className="mt-1 text-3xl font-bold">{leads.filter(item => item.requestType === 'CONTACT').length}</p><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{leads.filter(item => item.status === 'NEW').length} demandes à traiter</p></article>
      <article className="rounded-2xl border bg-[hsl(var(--card))] p-5"><CalendarDays className="text-[hsl(var(--primary))]" size={22} /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Visites demandées</p><p className="mt-1 text-3xl font-bold">{leads.filter(item => item.requestType === 'VISIT').length}</p><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Demandes issues de la vitrine publique</p></article>
    </section>}
    {['mandats', 'agents', 'rapports', 'parametres', 'vitrine-publique'].includes(currentFeatureId) && <section className="rounded-2xl border bg-[hsl(var(--card))] p-6">
      {currentFeatureId === 'mandats' && <div className="flex items-start gap-4"><FileSignature className="mt-1 text-[hsl(var(--primary))]" size={28} /><div><h2 className="text-lg font-bold">Suivi des mandats</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Cette vue est réservée au suivi des contrats confiés à l’agence. Les mandats pourront être reliés à un bien, un propriétaire, une durée et un statut de diffusion.</p><div className="mt-5 rounded-xl bg-[hsl(var(--muted))] p-4 text-sm font-semibold">Aucun mandat n’est encore enregistré.</div></div></div>}
      {currentFeatureId === 'agents' && <div className="flex items-start gap-4"><UsersRound className="mt-1 text-[hsl(var(--primary))]" size={28} /><div><h2 className="text-lg font-bold">Équipe des agents</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Préparez la répartition des biens, des prospects et des visites entre les agents de votre agence.</p><div className="mt-5 rounded-xl bg-[hsl(var(--muted))] p-4 text-sm font-semibold">La gestion des agents se configure depuis Organisation.</div></div></div>}
      {currentFeatureId === 'rapports' && <div><div className="flex items-start gap-4"><BarChart3 className="mt-1 text-[hsl(var(--primary))]" size={28} /><div><h2 className="text-lg font-bold">Performance de l’activité</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Indicateurs calculés à partir des données immobilières de votre entreprise.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[hsl(var(--muted))] p-4"><p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Taux de publication</p><p className="mt-2 text-2xl font-bold">{listings.length ? Math.round((listings.filter(item => item.status === 'PUBLISHED').length / listings.length) * 100) : 0}%</p></div><div className="rounded-xl bg-[hsl(var(--muted))] p-4"><p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Demandes nouvelles</p><p className="mt-2 text-2xl font-bold">{leads.filter(item => item.status === 'NEW').length}</p></div><div className="rounded-xl bg-[hsl(var(--muted))] p-4"><p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Biens vendus ou loués</p><p className="mt-2 text-2xl font-bold">{listings.filter(item => item.status === 'SOLD' || item.status === 'RENTED').length}</p></div></div></div>}
      {currentFeatureId === 'parametres' && <div className="flex items-start gap-4"><Settings2 className="mt-1 text-[hsl(var(--primary))]" size={28} /><div><h2 className="text-lg font-bold">Configuration du module</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Les droits détaillés sont pilotés par les packs et les rôles de l’entreprise.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-4"><p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Fonctionnalités actives</p><p className="mt-2 text-sm font-bold">10 fonctionnalités Immobilier</p></div><div className="rounded-xl border p-4"><p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Données de l’entreprise</p><p className="mt-2 text-sm font-bold">Périmètre isolé par entreprise</p></div></div></div></div>}
      {currentFeatureId === 'vitrine-publique' && <div className="flex items-start gap-4"><Globe2 className="mt-1 text-[hsl(var(--primary))]" size={28} /><div><h2 className="text-lg font-bold">Aperçu de la vitrine publique</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Seuls les biens publiés sont proposés aux visiteurs et peuvent recevoir des demandes de contact ou de visite.</p><div className="mt-5 rounded-xl bg-[hsl(var(--muted))] p-4 text-sm font-semibold">{listings.filter(item => item.status === 'PUBLISHED').length} bien(s) actuellement visible(s) publiquement.</div></div></div>}
    </section>}
    {listingView && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-3">{loading ? <div className="rounded-2xl border p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Chargement des {propertyView ? 'biens' : 'annonces'}…</div> : visibleListings.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucun {propertyView ? 'bien' : 'annonce'} à afficher.</div> : visibleListings.map(listing => <article key={listing.id} className="rounded-2xl border bg-[hsl(var(--card))] p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[hsl(var(--primary)/.1)] px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--primary))]">{statusLabel[listing.status]}</span><span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{listing.transactionType === 'SALE' ? 'Vente' : 'Location'} · {listing.propertyType}</span></div><h2 className="mt-3 text-lg font-bold">{listing.title}</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city} · {money(listing.price)}</p></div><Building2 size={20} className="text-[hsl(var(--primary))]" /></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{listing.description || 'Aucune description renseignée.'}</p><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{listing.areaM2 && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">{listing.areaM2} m²</span>}{listing.bedrooms !== null && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">{listing.bedrooms} chambre(s)</span>}{listing.furnished && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">Meublé</span>}</div>{canModifyListings && <div className="mt-4 flex gap-2 border-t pt-3"><button type="button" onClick={() => edit(listing)} className="rounded-lg border px-3 py-2 text-xs font-bold"><Pencil size={13} className="mr-1 inline" />Modifier</button><button type="button" onClick={() => void archive(listing)} className="rounded-lg border px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))]"><X size={13} className="mr-1 inline" />Archiver</button></div>}</article>)}</section>
      {formOpen && (canCreateListings || editing) && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[hsl(var(--foreground)/.45)] p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) reset(); }}>
        <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="immobilier-listing-form-title" className="modal-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[hsl(var(--background))] p-5 shadow-2xl sm:p-6">
          <div className="flex items-center justify-between"><div><h2 id="immobilier-listing-form-title" className="font-bold">{editing ? 'Modifier l’annonce' : 'Ajouter une annonce'}</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Les brouillons restent invisibles sur la vitrine.</p></div><button type="button" onClick={reset} aria-label="Fermer" className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><X size={18} /></button></div><div className="mt-5 space-y-3"><label className="block text-xs font-bold">Titre<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" placeholder="Villa moderne à Almadies" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold">Type<select value={form.propertyType} onChange={e => setForm({ ...form, propertyType: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm">{['APPARTEMENT', 'MAISON', 'VILLA', 'TERRAIN', 'BUREAU', 'LOCAL_COMMERCIAL'].map(value => <option key={value}>{value}</option>)}</select></label><label className="block text-xs font-bold">Opération<select value={form.transactionType} onChange={e => setForm({ ...form, transactionType: e.target.value as 'SALE' | 'RENT' })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="SALE">Vente</option><option value="RENT">Location</option></select></label></div><label className="block text-xs font-bold">Statut<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ImmobilierListing['status'] })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm">{['DRAFT', 'PUBLISHED', 'RESERVED', 'SOLD', 'RENTED'].map(value => <option key={value} value={value}>{statusLabel[value]}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold">Prix<input required type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><label className="block text-xs font-bold">Surface<input type="number" min="0" value={form.areaM2 ?? ''} onChange={e => setForm({ ...form, areaM2: e.target.value ? Number(e.target.value) : null })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label></div><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold">Ville<input required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><label className="block text-xs font-bold">Quartier<input value={form.neighborhood ?? ''} onChange={e => setForm({ ...form, neighborhood: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label></div><label className="block text-xs font-bold">Description<textarea rows={4} value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={Boolean(form.featured)} onChange={e => setForm({ ...form, featured: e.target.checked })} />Mettre en avant</label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={reset} className="rounded-lg border px-4 py-2.5 text-sm font-bold">Annuler</button><button type="submit" className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]"><Check size={15} />{editing ? 'Enregistrer les changements' : 'Créer l’annonce'}</button></div>
        </form>
      </div>}
    </div>}
    {leadView && <section className="space-y-3">{loading ? <div className="rounded-2xl border p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Chargement des demandes…</div> : visibleLeads.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune {currentFeatureId === 'visites' ? 'demande de visite' : 'demande de contact'} pour le moment.</div> : visibleLeads.map(lead => <article key={lead.id} className="rounded-2xl border bg-[hsl(var(--card))] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold"><UserRound size={15} className="text-[hsl(var(--primary))]" />{lead.name}<span className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px]">{lead.requestType === 'VISIT' ? 'Demande de visite' : 'Contact'}</span></div><p className="mt-2 text-sm font-semibold">{lead.listingTitle ?? 'Demande générale'}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{lead.email}{lead.phone ? ` · ${lead.phone}` : ''}</p></div><CalendarDays size={18} className="text-[hsl(var(--primary))]" /></div>{lead.message && <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{lead.message}</p>}{canManageLeads && <select value={lead.status} onChange={e => void updateLead(lead, e.target.value as ImmobilierLead['status'])} className="mt-4 rounded-lg border px-3 py-2 text-xs font-bold">{['NEW', 'CONTACTED', 'CLOSED'].map(value => <option key={value} value={value}>{statusLabel[value]}</option>)}</select>}</article>)}</section>}
  </div>;
}