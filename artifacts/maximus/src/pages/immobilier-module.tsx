import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  FileSignature,
  Globe2,
  ImagePlus,
  Pencil,
  Plus,
  Settings2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import {
  createImmobilierApi,
  type ImmobilierLead,
  type ImmobilierListing,
  type ImmobilierListingInput,
  type ImmobilierMedia,
  type ImmobilierProperty,
  type ImmobilierPropertyInput,
} from '@/lib/immobilier-api';
import { showAppToast } from '@/hooks/use-toast';

const emptyProperty: ImmobilierPropertyInput = {
  reference: '',
  propertyType: 'APPARTEMENT',
  transactionType: 'SALE',
  status: 'AVAILABLE',
  city: 'Dakar',
  neighborhood: '',
  address: '',
  price: 0,
  areaM2: null,
  bedrooms: null,
  bathrooms: null,
  furnished: false,
  internalNotes: '',
};

const emptyListing: ImmobilierListingInput = {
  propertyId: '',
  title: '',
  status: 'DRAFT',
  description: '',
  featured: false,
};

const statusLabel: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  SOLD: 'Vendu',
  RENTED: 'Loué',
  ARCHIVED: 'Archivé',
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publiée',
  NEW: 'Nouvelle',
  CONTACTED: 'Contactée',
  CLOSED: 'Clôturée',
};

const money = (value: number) => new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';

const featureDetails = {
  dashboard: { title: 'Tableau de bord immobilier', description: 'Suivez les biens, les annonces et les demandes reçues.', eyebrow: 'Vue d’ensemble' },
  biens: { title: 'Biens immobiliers', description: 'Gérez les biens physiques de votre portefeuille, indépendamment de leur publication.', eyebrow: 'Patrimoine' },
  annonces: { title: 'Annonces immobilières', description: 'Créez des publications commerciales à partir de biens existants.', eyebrow: 'Diffusion' },
  prospects: { title: 'Prospects immobiliers', description: 'Qualifiez les demandes de contact reçues depuis la vitrine.', eyebrow: 'Relation client' },
  visites: { title: 'Visites immobilières', description: 'Traitez les demandes de visite et leurs prochaines actions.', eyebrow: 'Agenda commercial' },
  mandats: { title: 'Mandats immobiliers', description: 'Centralisez les mandats confiés à l’agence et leurs échéances.', eyebrow: 'Gestion contractuelle' },
  agents: { title: 'Agents immobiliers', description: 'Suivez les agents et la répartition de leurs responsabilités.', eyebrow: 'Équipe' },
  rapports: { title: 'Rapports immobiliers', description: 'Analysez le portefeuille, les publications et les demandes.', eyebrow: 'Pilotage' },
  parametres: { title: 'Paramètres immobiliers', description: 'Consultez les règles d’accès et de publication du module.', eyebrow: 'Configuration' },
  'vitrine-publique': { title: 'Vitrine publique', description: 'Contrôlez les biens actuellement visibles par les visiteurs.', eyebrow: 'Publication' },
} as const;

type ImmobilierFeatureId = keyof typeof featureDetails;
type AuxiliaryFeatureId = 'mandats' | 'agents' | 'rapports' | 'parametres' | 'vitrine-publique';
type FormMode = 'create-property' | 'edit-property' | 'create-listing' | 'edit-listing';

const isFeatureId = (value: string): value is ImmobilierFeatureId =>
  Object.prototype.hasOwnProperty.call(featureDetails, value);
const isAuxiliaryFeatureId = (value: ImmobilierFeatureId): value is AuxiliaryFeatureId =>
  ['mandats', 'agents', 'rapports', 'parametres', 'vitrine-publique'].includes(value);

export default function ImmobilierModulePage({
  companyId,
  canCreate = true,
  canModify = true,
  featurePermissions,
  activeFeatureId = 'dashboard',
  preview = false,
}: {
  companyId: string;
  canCreate?: boolean;
  canModify?: boolean;
  featurePermissions?: Partial<Record<string, string[]>>;
  activeFeatureId?: string;
  preview?: boolean;
}) {
  const api = useMemo(() => createImmobilierApi(companyId), [companyId]);
  const [properties, setProperties] = useState<ImmobilierProperty[]>([]);
  const [listings, setListings] = useState<ImmobilierListing[]>([]);
  const [leads, setLeads] = useState<ImmobilierLead[]>([]);
  const [propertyForm, setPropertyForm] = useState<ImmobilierPropertyInput>(emptyProperty);
  const [listingForm, setListingForm] = useState<ImmobilierListingInput>(emptyListing);
  const [propertyFiles, setPropertyFiles] = useState<File[]>([]);
  const [listingFiles, setListingFiles] = useState<File[]>([]);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentFeatureId: ImmobilierFeatureId = isFeatureId(activeFeatureId) ? activeFeatureId : 'dashboard';
  const activeFeature = featureDetails[currentFeatureId];
  const propertyView = currentFeatureId === 'biens';
  const listingView = currentFeatureId === 'annonces';
  const leadView = currentFeatureId === 'prospects' || currentFeatureId === 'visites';
  const canCreateProperties = featurePermissions?.biens ? featurePermissions.biens.includes('créer') : canCreate;
  const canModifyProperties = featurePermissions?.biens ? featurePermissions.biens.includes('modifier') : canModify;
  const canCreateListings = featurePermissions?.annonces ? featurePermissions.annonces.includes('créer') : canCreate;
  const canModifyListings = featurePermissions?.annonces ? featurePermissions.annonces.includes('modifier') : canModify;
  const canManageLeads = featurePermissions?.prospects ? featurePermissions.prospects.includes('modifier') : canModify;
  const visibleLeads = currentFeatureId === 'visites'
    ? leads.filter(item => item.requestType === 'VISIT')
    : leads.filter(item => item.requestType === 'CONTACT');

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.bootstrap();
      setProperties(result.properties ?? []);
      setListings(result.listings ?? []);
      setLeads(result.leads ?? []);
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Les données immobilières ne sont pas disponibles.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!preview) void load();
  }, [api, preview]);

  const closeForm = () => {
    setFormMode(null);
    setEditingId(null);
    setPropertyForm(emptyProperty);
    setListingForm(emptyListing);
    setPropertyFiles([]);
    setListingFiles([]);
  };

  useEffect(() => {
    if (!formMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeForm();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formMode]);

  const openCreateProperty = () => {
    setEditingId(null);
    setPropertyForm(emptyProperty);
    setFormMode('create-property');
  };

  const openCreateListing = () => {
    setEditingId(null);
    setListingForm({ ...emptyListing, propertyId: properties[0]?.id ?? '' });
    setFormMode('create-listing');
  };

  const editProperty = (property: ImmobilierProperty) => {
    setEditingId(property.id);
    setPropertyForm({ ...property });
    setFormMode('edit-property');
  };

  const editListing = (listing: ImmobilierListing) => {
    setEditingId(listing.id);
    setListingForm({ ...listing });
    setFormMode('edit-listing');
  };

  const saveProperty = async (event: FormEvent) => {
    event.preventDefault();
    try {
      let savedProperty: ImmobilierProperty;
      if (editingId) {
        const result = await api.updateProperty(editingId, propertyForm);
        savedProperty = result.property;
        showAppToast('Bien mis à jour.', 'success');
      } else {
        const result = await api.createProperty(propertyForm);
        savedProperty = result.property;
        showAppToast('Bien créé.', 'success');
      }
      if (propertyFiles.length > 0) {
        const result = await api.uploadPropertyMedia(savedProperty.id, propertyFiles);
        savedProperty = result.property;
      }
      setProperties(items => editingId
        ? items.map(item => item.id === savedProperty.id ? savedProperty : item)
        : [savedProperty, ...items]);
      closeForm();
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Le bien n’a pas pu être enregistré.', 'error');
    }
  };

  const saveListing = async (event: FormEvent) => {
    event.preventDefault();
    try {
      let savedListing: ImmobilierListing;
      if (editingId) {
        const result = await api.updateListing(editingId, listingForm);
        savedListing = result.listing;
        showAppToast('Annonce mise à jour.', 'success');
      } else {
        const result = await api.createListing(listingForm);
        savedListing = result.listing;
        showAppToast('Annonce créée.', 'success');
      }
      if (listingFiles.length > 0) {
        const result = await api.uploadListingMedia(savedListing.id, listingFiles);
        savedListing = result.listing;
      }
      setListings(items => editingId
        ? items.map(item => item.id === savedListing.id ? savedListing : item)
        : [savedListing, ...items]);
      closeForm();
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'L’annonce n’a pas pu être enregistrée.', 'error');
    }
  };

  const archiveProperty = async (property: ImmobilierProperty) => {
    if (!window.confirm(`Archiver le bien « ${property.reference} » ?`)) return;
    try {
      await api.archiveProperty(property.id);
      setProperties(items => items.filter(item => item.id !== property.id));
      setListings(items => items.filter(item => item.propertyId !== property.id));
      showAppToast('Bien archivé.', 'success');
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Le bien n’a pas pu être archivé.', 'error');
    }
  };

  const archiveListing = async (listing: ImmobilierListing) => {
    if (!window.confirm(`Archiver l’annonce « ${listing.title} » ?`)) return;
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

  const propertyForListing = (listing: ImmobilierListing) =>
    properties.find(property => property.id === listing.propertyId);

  return (
    <div className="space-y-5 fade-up">
      <section className="rounded-2xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Immobilier · {activeFeature.eyebrow}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-[-.04em]">{activeFeature.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{activeFeature.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="hidden text-[hsl(var(--primary))] sm:block" size={32} />
            {propertyView && canCreateProperties && <button type="button" onClick={openCreateProperty} className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/.2)]"><Plus size={16} />Ajouter un bien</button>}
            {listingView && canCreateListings && <button type="button" onClick={openCreateListing} className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/.2)]"><Plus size={16} />Ajouter une annonce</button>}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold">{properties.length} biens</span>
          <span className="rounded-full bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold">{listings.filter(item => item.status === 'PUBLISHED').length} annonces publiées</span>
          <span className="rounded-full bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold">{leads.filter(item => item.status === 'NEW').length} demandes nouvelles</span>
        </div>
      </section>

      {currentFeatureId === 'dashboard' && <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={<Building2 size={22} />} label="Biens disponibles" value={properties.filter(item => item.status === 'AVAILABLE').length} detail={`${properties.length} biens dans le portefeuille`} />
        <SummaryCard icon={<Globe2 size={22} />} label="Annonces publiées" value={listings.filter(item => item.status === 'PUBLISHED').length} detail={`${listings.length} publications enregistrées`} />
        <SummaryCard icon={<CalendarDays size={22} />} label="Visites demandées" value={leads.filter(item => item.requestType === 'VISIT').length} detail={`${leads.filter(item => item.status === 'NEW').length} demandes nouvelles`} />
      </section>}

      {propertyView && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <LoadingState label="biens" /> : properties.length === 0 ? <EmptyState title="Aucun bien enregistré" text="Créez une fiche bien avant de pouvoir lui associer une annonce." /> : properties.map(property => (
          <article key={property.id} className="flex flex-col overflow-hidden rounded-2xl border bg-[hsl(var(--card))]">
            <MediaStrip media={property.gallery} />
            <div className="flex flex-1 flex-col p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[hsl(var(--primary)/.1)] px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--primary))]">{property.reference}</span><span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[10px] font-bold">{statusLabel[property.status]}</span></div>
                <h2 className="mt-3 text-lg font-bold">{property.propertyType} · {property.city}</h2>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{property.neighborhood || 'Quartier non renseigné'} · {property.transactionType === 'SALE' ? 'Vente' : 'Location'} · {money(property.price)}</p>
              </div>
              <div className="flex gap-2">{canModifyProperties && <button type="button" onClick={() => editProperty(property)} className="rounded-lg border px-3 py-2 text-xs font-bold"><Pencil size={13} className="mr-1 inline" />Modifier</button>}{canModifyProperties && <button type="button" onClick={() => void archiveProperty(property)} className="rounded-lg border px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))]"><X size={13} className="mr-1 inline" />Archiver</button>}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{property.areaM2 !== null && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">{property.areaM2} m²</span>}{property.bedrooms !== null && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">{property.bedrooms} chambre(s)</span>}{property.bathrooms !== null && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">{property.bathrooms} salle(s) de bain</span>}{property.furnished && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">Meublé</span>}</div>
            {property.internalNotes && <p className="mt-4 rounded-xl bg-[hsl(var(--muted))] p-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><strong>Note interne :</strong> {property.internalNotes}</p>}
            </div>
          </article>
        ))}
      </section>}

      {listingView && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <LoadingState label="annonces" /> : listings.length === 0 ? <EmptyState title="Aucune annonce créée" text="Créez d’abord un bien, puis publiez-le avec une annonce commerciale." /> : listings.map(listing => {
          const property = propertyForListing(listing);
          return <article key={listing.id} className="flex flex-col overflow-hidden rounded-2xl border bg-[hsl(var(--card))]">
            <MediaStrip media={listing.gallery} />
            <div className="flex flex-1 flex-col p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[hsl(var(--primary)/.1)] px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--primary))]">{statusLabel[listing.status]}</span>{listing.featured && <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-700">À la une</span>}</div><h2 className="mt-3 text-lg font-bold">{listing.title}</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Bien {property?.reference ?? listing.propertyId} · {property?.city ?? listing.city} · {property ? money(property.price) : money(listing.price)}</p></div>
              <div className="flex gap-2">{canModifyListings && <button type="button" onClick={() => editListing(listing)} className="rounded-lg border px-3 py-2 text-xs font-bold"><Pencil size={13} className="mr-1 inline" />Modifier</button>}{canModifyListings && <button type="button" onClick={() => void archiveListing(listing)} className="rounded-lg border px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))]"><X size={13} className="mr-1 inline" />Archiver</button>}</div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{listing.description || 'Aucune description commerciale renseignée.'}</p>
            </div>
          </article>;
        })}
      </section>}

      {leadView && <section className="space-y-3">
        {loading ? <LoadingState label="demandes" /> : visibleLeads.length === 0 ? <EmptyState title={currentFeatureId === 'visites' ? 'Aucune visite demandée' : 'Aucun prospect'} text="Les demandes reçues depuis la vitrine apparaîtront ici." /> : visibleLeads.map(lead => <article key={lead.id} className="rounded-2xl border bg-[hsl(var(--card))] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold"><UserRound size={15} className="text-[hsl(var(--primary))]" />{lead.name}<span className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px]">{lead.requestType === 'VISIT' ? 'Demande de visite' : 'Contact'}</span></div><p className="mt-2 text-sm font-semibold">{lead.listingTitle ?? 'Demande générale'}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{lead.email}{lead.phone ? ` · ${lead.phone}` : ''}</p></div><CalendarDays size={18} className="text-[hsl(var(--primary))]" /></div>{lead.message && <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{lead.message}</p>}{canManageLeads && <select value={lead.status} onChange={event => void updateLead(lead, event.target.value as ImmobilierLead['status'])} className="mt-4 rounded-lg border px-3 py-2 text-xs font-bold">{['NEW', 'CONTACTED', 'CLOSED'].map(value => <option key={value} value={value}>{statusLabel[value]}</option>)}</select>}</article>)}
      </section>}

      {isAuxiliaryFeatureId(currentFeatureId) && <AuxiliaryFeature featureId={currentFeatureId} properties={properties} listings={listings} leads={leads} />}

      {formMode && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[hsl(var(--foreground)/.45)] p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeForm(); }}>
        {formMode === 'create-property' || formMode === 'edit-property'
          ? <PropertyForm mode={formMode} form={propertyForm} setForm={setPropertyForm} files={propertyFiles} setFiles={setPropertyFiles} onSubmit={saveProperty} onClose={closeForm} />
          : <ListingForm mode={formMode} form={listingForm} setForm={setListingForm} files={listingFiles} setFiles={setListingFiles} properties={properties} onSubmit={saveListing} onClose={closeForm} />}
      </div>}
    </div>
  );
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return <article className="rounded-2xl border bg-[hsl(var(--card))] p-5">{icon}<p className="mt-4 text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{detail}</p></article>;
}

function LoadingState({ label }: { label: string }) {
  return <div className="rounded-2xl border p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Chargement des {label}…</div>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-dashed p-10 text-center"><p className="font-bold">{title}</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{text}</p></div>;
}

function PropertyForm({ mode, form, setForm, files, setFiles, onSubmit, onClose }: { mode: 'create-property' | 'edit-property'; form: ImmobilierPropertyInput; setForm: (form: ImmobilierPropertyInput) => void; files: File[]; setFiles: (files: File[]) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  return <form onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="immobilier-property-form-title" className="modal-panel max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[hsl(var(--background))] p-5 shadow-2xl sm:p-6">
    <FormHeader id="immobilier-property-form-title" title={mode === 'edit-property' ? 'Modifier le bien' : 'Ajouter un bien'} text="Le bien est votre fiche interne. Il pourra ensuite recevoir une ou plusieurs annonces." onClose={onClose} />
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Référence interne" value={String(form.reference ?? '')} onChange={reference => setForm({ ...form, reference })} placeholder="BIEN-2026-001" />
      <SelectField label="Statut du bien" value={form.status} onChange={status => setForm({ ...form, status: status as ImmobilierPropertyInput['status'] })} options={['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED']} labels={statusLabel} />
      <SelectField label="Type de bien" value={form.propertyType} onChange={propertyType => setForm({ ...form, propertyType })} options={['APPARTEMENT', 'MAISON', 'VILLA', 'TERRAIN', 'BUREAU', 'LOCAL_COMMERCIAL']} />
      <SelectField label="Transaction" value={form.transactionType} onChange={transactionType => setForm({ ...form, transactionType: transactionType as 'SALE' | 'RENT' })} options={['SALE', 'RENT']} labels={{ SALE: 'Vente', RENT: 'Location' }} />
      <Field label="Ville" required value={form.city} onChange={city => setForm({ ...form, city })} />
      <Field label="Quartier" value={String(form.neighborhood ?? '')} onChange={neighborhood => setForm({ ...form, neighborhood })} />
      <Field label="Adresse" value={String(form.address ?? '')} onChange={address => setForm({ ...form, address })} />
      <Field label="Prix" required type="number" value={String(form.price)} onChange={price => setForm({ ...form, price: Number(price) })} />
      <Field label="Surface (m²)" type="number" value={String(form.areaM2 ?? '')} onChange={area => setForm({ ...form, areaM2: area ? Number(area) : null })} />
      <Field label="Chambres" type="number" value={String(form.bedrooms ?? '')} onChange={bedrooms => setForm({ ...form, bedrooms: bedrooms ? Number(bedrooms) : null })} />
      <Field label="Salles de bain" type="number" value={String(form.bathrooms ?? '')} onChange={bathrooms => setForm({ ...form, bathrooms: bathrooms ? Number(bathrooms) : null })} />
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold"><input type="checkbox" checked={Boolean(form.furnished)} onChange={event => setForm({ ...form, furnished: event.target.checked })} />Bien meublé</label>
      <label className="block text-sm font-bold sm:col-span-2">Notes internes<textarea rows={3} value={String(form.internalNotes ?? '')} onChange={event => setForm({ ...form, internalNotes: event.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" placeholder="Informations réservées à l’équipe…" /></label>
       <MediaUploadField files={files} setFiles={setFiles} />
    </div>
    <FormActions onClose={onClose} submitLabel={mode === 'edit-property' ? 'Enregistrer le bien' : 'Créer le bien'} />
  </form>;
}

function ListingForm({ mode, form, setForm, files, setFiles, properties, onSubmit, onClose }: { mode: 'create-listing' | 'edit-listing'; form: ImmobilierListingInput; setForm: (form: ImmobilierListingInput) => void; files: File[]; setFiles: (files: File[]) => void; properties: ImmobilierProperty[]; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  return <form onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="immobilier-listing-form-title" className="modal-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[hsl(var(--background))] p-5 shadow-2xl sm:p-6">
    <FormHeader id="immobilier-listing-form-title" title={mode === 'edit-listing' ? 'Modifier l’annonce' : 'Ajouter une annonce'} text="L’annonce est une publication commerciale liée à un bien existant." onClose={onClose} />
    <div className="mt-5 space-y-4">
      <label className="block text-sm font-bold">Bien à publier<select required disabled={mode === 'edit-listing'} value={form.propertyId} onChange={event => setForm({ ...form, propertyId: event.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="">Sélectionner un bien…</option>{properties.map(property => <option key={property.id} value={property.id}>{property.reference} · {property.propertyType} · {property.city}</option>)}</select></label>
      <Field label="Titre commercial" required value={form.title} onChange={title => setForm({ ...form, title })} placeholder="Villa moderne aux Almadies" />
      <SelectField label="Statut de diffusion" value={form.status} onChange={status => setForm({ ...form, status: status as ImmobilierListingInput['status'] })} options={['DRAFT', 'PUBLISHED']} labels={statusLabel} />
      <label className="block text-sm font-bold">Description commerciale<textarea rows={5} value={String(form.description ?? '')} onChange={event => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" placeholder="Présentez le bien aux visiteurs…" /></label>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={Boolean(form.featured)} onChange={event => setForm({ ...form, featured: event.target.checked })} />Mettre l’annonce à la une</label>
       <MediaUploadField files={files} setFiles={setFiles} />
      {properties.length === 0 && <p className="rounded-xl bg-amber-500/10 p-3 text-sm font-semibold text-amber-800">Créez d’abord un bien dans la fonctionnalité Biens.</p>}
    </div>
    <FormActions onClose={onClose} submitLabel={mode === 'edit-listing' ? 'Enregistrer l’annonce' : 'Publier l’annonce'} disabled={!properties.length} />
  </form>;
}

function FormHeader({ id, title, text, onClose }: { id: string; title: string; text: string; onClose: () => void }) {
  return <div className="flex items-start justify-between gap-4"><div><h2 id={id} className="font-bold">{title}</h2><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{text}</p></div><button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><X size={18} /></button></div>;
}

function FormActions({ onClose, submitLabel, disabled = false }: { onClose: () => void; submitLabel: string; disabled?: boolean }) {
  return <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2.5 text-sm font-bold">Annuler</button><button type="submit" disabled={disabled} className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50"><Check size={15} />{submitLabel}</button></div>;
}

function Field({ label, value, onChange, type = 'text', placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="block text-sm font-bold">{label}<input required={required} type={type} min={type === 'number' ? 0 : undefined} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>;
}

function SelectField({ label, value, onChange, options, labels = {} }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return <label className="block text-sm font-bold">{label}<select value={value} onChange={event => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm">{options.map(option => <option key={option} value={option}>{labels[option] ?? option}</option>)}</select></label>;
}

const mediaAccept = 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,video/ogg';

function MediaUploadField({ files, setFiles }: { files: File[]; setFiles: (files: File[]) => void }) {
  return <label className="block rounded-xl border border-dashed border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.04)] p-4 text-sm font-bold sm:col-span-2">
    <span className="flex items-center gap-2"><ImagePlus size={16} className="text-[hsl(var(--primary))]" />Galerie du bien</span>
    <span className="mt-1 block text-xs font-normal leading-5 text-[hsl(var(--muted-foreground))]">Ajoutez plusieurs photos ou vidéos (JPG, PNG, WebP, MP4, WebM, MOV, OGG). Elles seront enregistrées avec la fiche.</span>
    <input type="file" accept={mediaAccept} multiple onChange={event => setFiles(Array.from(event.target.files ?? []))} className="mt-3 block w-full text-xs font-semibold file:mr-3 file:rounded-lg file:border-0 file:bg-[hsl(var(--primary))] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[hsl(var(--primary-foreground))]" />
    {files.length > 0 && <span className="mt-2 block text-xs font-semibold text-[hsl(var(--primary))]">{files.length} média{files.length > 1 ? 's' : ''} prêt{files.length > 1 ? 's' : ''} à envoyer · {files.map(file => file.name).join(', ')}</span>}
  </label>;
}

function MediaStrip({ media }: { media: ImmobilierMedia[] }) {
  if (media.length === 0) {
    return <div className="flex h-36 items-center justify-center bg-[hsl(var(--muted)/.45)] text-xs font-semibold text-[hsl(var(--muted-foreground))]"><ImagePlus size={18} className="mr-2" />Aucun média</div>;
  }
  return <div className="grid h-36 grid-cols-3 gap-1 overflow-hidden bg-[hsl(var(--muted)/.35)]">
    {media.slice(0, 3).map(item => item.type === 'video'
      ? <video key={item.id} src={item.url} muted playsInline className="h-full w-full object-cover" />
      : <img key={item.id} src={item.url} alt="" className="h-full w-full object-cover" />)}
  </div>;
}

function AuxiliaryFeature({ featureId, properties, listings, leads }: { featureId: AuxiliaryFeatureId; properties: ImmobilierProperty[]; listings: ImmobilierListing[]; leads: ImmobilierLead[] }) {
  if (featureId === 'rapports') {
    const published = listings.filter(item => item.status === 'PUBLISHED').length;
    return <section className="rounded-2xl border bg-[hsl(var(--card))] p-6"><div className="flex items-start gap-4"><BarChart3 className="mt-1 text-[hsl(var(--primary))]" size={28} /><div><h2 className="text-lg font-bold">Performance de l’activité</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Indicateurs calculés à partir des données persistées de votre entreprise.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="Biens" value={properties.length} /><Metric label="Taux de publication" value={`${listings.length ? Math.round((published / listings.length) * 100) : 0}%`} /><Metric label="Demandes nouvelles" value={leads.filter(item => item.status === 'NEW').length} /></div></section>;
  }
  if (featureId === 'vitrine-publique') return <section className="rounded-2xl border bg-[hsl(var(--card))] p-6"><Globe2 className="text-[hsl(var(--primary))]" size={28} /><h2 className="mt-4 text-lg font-bold">Biens visibles sur la vitrine</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Une annonce publiée est toujours rattachée à une fiche Bien et reprend ses informations de prix et de localisation.</p><div className="mt-5 rounded-xl bg-[hsl(var(--muted))] p-4 text-sm font-semibold">{listings.filter(item => item.status === 'PUBLISHED').length} annonce(s) actuellement publiée(s).</div></section>;
  if (featureId === 'parametres') return <section className="rounded-2xl border bg-[hsl(var(--card))] p-6"><Settings2 className="text-[hsl(var(--primary))]" size={28} /><h2 className="mt-4 text-lg font-bold">Règles du module</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><Setting title="Séparation métier" text="Les biens sont les fiches internes ; les annonces sont les publications liées." /><Setting title="Publication" text="Une annonce doit être liée à un bien actif avant d’être publiée." /><Setting title="Données privées" text="Les notes internes d’un bien ne sont jamais envoyées sur la vitrine." /><Setting title="Accès" text="Les droits Biens et Annonces sont contrôlés séparément." /></div></section>;
  if (featureId === 'agents') return <section className="rounded-2xl border bg-[hsl(var(--card))] p-6"><UsersRound className="text-[hsl(var(--primary))]" size={28} /><h2 className="mt-4 text-lg font-bold">Équipe immobilière</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Les agents et leurs droits se gèrent dans Organisation. Le module distingue maintenant leurs accès aux Biens, aux Annonces et aux demandes.</p></section>;
  return <section className="rounded-2xl border bg-[hsl(var(--card))] p-6"><FileSignature className="text-[hsl(var(--primary))]" size={28} /><h2 className="mt-4 text-lg font-bold">Suivi des mandats</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Les mandats seront rattachés aux fiches Bien, tandis que les annonces resteront les publications commerciales.</p><div className="mt-5 rounded-xl bg-[hsl(var(--muted))] p-4 text-sm font-semibold">Aucun mandat enregistré.</div></section>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl bg-[hsl(var(--muted))] p-4"><p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}

function Setting({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border p-4"><p className="text-sm font-bold">{title}</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{text}</p></div>;
}