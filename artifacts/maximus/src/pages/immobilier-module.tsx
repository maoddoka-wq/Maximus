import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Building2, CalendarDays, Check, Eye, Pencil, Plus, UserRound, X } from 'lucide-react';
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

export default function ImmobilierModulePage({ companyId, canCreate = true, canModify = true, featurePermissions, preview = false }: { companyId: string; canCreate?: boolean; canModify?: boolean; featurePermissions?: Partial<Record<string, string[]>>; preview?: boolean }) {
  const api = useMemo(() => createImmobilierApi(companyId), [companyId]);
  const [listings, setListings] = useState<ImmobilierListing[]>([]);
  const [leads, setLeads] = useState<ImmobilierLead[]>([]);
  const [form, setForm] = useState<ImmobilierListingInput>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [tab, setTab] = useState<'listings' | 'leads'>('listings');
  const [loading, setLoading] = useState(true);
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

  const reset = () => { setEditing(null); setForm(emptyForm); };
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Immobilier</p><h1 className="mt-2 text-2xl font-bold tracking-[-.04em]">Biens, annonces et demandes</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Publiez les biens disponibles, suivez les prospects et transformez les demandes de visite en opportunités.</p></div>
        <Building2 className="hidden text-[hsl(var(--primary))] sm:block" size={32} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold">{listings.filter(item => item.status === 'PUBLISHED').length} annonces publiées</span><span className="rounded-full bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold">{leads.filter(item => item.status === 'NEW').length} demandes nouvelles</span></div>
    </section>
    <div className="flex gap-2 border-b"><button type="button" onClick={() => setTab('listings')} className={`px-4 py-3 text-sm font-bold ${tab === 'listings' ? 'border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>Annonces</button><button type="button" onClick={() => setTab('leads')} className={`px-4 py-3 text-sm font-bold ${tab === 'leads' ? 'border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>Prospects et visites</button></div>
    {tab === 'listings' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-3">{loading ? <div className="rounded-2xl border p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Chargement des annonces…</div> : listings.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune annonce. Créez votre première annonce immobilière.</div> : listings.map(listing => <article key={listing.id} className="rounded-2xl border bg-[hsl(var(--card))] p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[hsl(var(--primary)/.1)] px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--primary))]">{statusLabel[listing.status]}</span><span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{listing.transactionType === 'SALE' ? 'Vente' : 'Location'} · {listing.propertyType}</span></div><h2 className="mt-3 text-lg font-bold">{listing.title}</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city} · {money(listing.price)}</p></div><Building2 size={20} className="text-[hsl(var(--primary))]" /></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{listing.description || 'Aucune description renseignée.'}</p><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{listing.areaM2 && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">{listing.areaM2} m²</span>}{listing.bedrooms !== null && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">{listing.bedrooms} chambre(s)</span>}{listing.furnished && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">Meublé</span>}</div>{canModifyListings && <div className="mt-4 flex gap-2 border-t pt-3"><button type="button" onClick={() => edit(listing)} className="rounded-lg border px-3 py-2 text-xs font-bold"><Pencil size={13} className="mr-1 inline" />Modifier</button><button type="button" onClick={() => void archive(listing)} className="rounded-lg border px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))]"><X size={13} className="mr-1 inline" />Archiver</button></div>}</article>)}</section>
      {canCreateListings || editing ? <form onSubmit={save} className="rounded-2xl border bg-[hsl(var(--card))] p-5 lg:sticky lg:top-4 lg:self-start"><div className="flex items-center justify-between"><div><h2 className="font-bold">{editing ? 'Modifier l’annonce' : 'Nouvelle annonce'}</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Les brouillons restent invisibles sur la vitrine.</p></div>{editing && <button type="button" onClick={reset} className="rounded-full border p-1.5"><X size={14} /></button>}</div><div className="mt-5 space-y-3"><label className="block text-xs font-bold">Titre<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" placeholder="Villa moderne à Almadies" /></label><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><label className="block text-xs font-bold">Type<select value={form.propertyType} onChange={e => setForm({ ...form, propertyType: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm">{['APPARTEMENT', 'MAISON', 'VILLA', 'TERRAIN', 'BUREAU', 'LOCAL_COMMERCIAL'].map(value => <option key={value}>{value}</option>)}</select></label><label className="block text-xs font-bold">Opération<select value={form.transactionType} onChange={e => setForm({ ...form, transactionType: e.target.value as 'SALE' | 'RENT' })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="SALE">Vente</option><option value="RENT">Location</option></select></label></div><label className="block text-xs font-bold">Statut<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ImmobilierListing['status'] })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm">{['DRAFT', 'PUBLISHED', 'RESERVED', 'SOLD', 'RENTED'].map(value => <option key={value} value={value}>{statusLabel[value]}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold">Prix<input required type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><label className="block text-xs font-bold">Surface<input type="number" min="0" value={form.areaM2 ?? ''} onChange={e => setForm({ ...form, areaM2: e.target.value ? Number(e.target.value) : null })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label></div><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold">Ville<input required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><label className="block text-xs font-bold">Quartier<input value={form.neighborhood ?? ''} onChange={e => setForm({ ...form, neighborhood: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label></div><label className="block text-xs font-bold">Description<textarea rows={4} value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={Boolean(form.featured)} onChange={e => setForm({ ...form, featured: e.target.checked })} />Mettre en avant</label></div><button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Check size={15} />{editing ? 'Enregistrer les changements' : 'Créer l’annonce'}</button></form> : <div className="rounded-2xl border border-dashed p-6 text-sm text-[hsl(var(--muted-foreground))]">Votre pack actuel permet la consultation. Demandez le pack Agent immobilier ou Gestion d’agence pour publier.</div>}
    </div>}
    {tab === 'leads' && <section className="space-y-3">{leads.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune demande publique pour le moment.</div> : leads.map(lead => <article key={lead.id} className="rounded-2xl border bg-[hsl(var(--card))] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold"><UserRound size={15} className="text-[hsl(var(--primary))]" />{lead.name}<span className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px]">{lead.requestType === 'VISIT' ? 'Demande de visite' : 'Contact'}</span></div><p className="mt-2 text-sm font-semibold">{lead.listingTitle ?? 'Demande générale'}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{lead.email}{lead.phone ? ` · ${lead.phone}` : ''}</p></div><CalendarDays size={18} className="text-[hsl(var(--primary))]" /></div>{lead.message && <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{lead.message}</p>}{canManageLeads && <select value={lead.status} onChange={e => void updateLead(lead, e.target.value as ImmobilierLead['status'])} className="mt-4 rounded-lg border px-3 py-2 text-xs font-bold">{['NEW', 'CONTACTED', 'CLOSED'].map(value => <option key={value} value={value}>{statusLabel[value]}</option>)}</select>}</article>)}</section>}
  </div>;
}