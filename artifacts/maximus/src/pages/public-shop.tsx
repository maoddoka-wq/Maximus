 text-left text-xs font-semibold leading-4 text-[hsl(var(--foreground))] sm:text-sm">{name}</button> : <h3 className="mt-1 line-clamp-2 min-h-8 break-words text-xs font-semibold leading-4 text-[hsl(var(--foreground))] sm:text-sm">{name}</h3>}
       <p className="mt-1.5 text-sm font-bold leading-4 text-[hsl(var(--foreground))] sm:text-base">{price}{priceSuffix && <span className="ml-0.5 text-[9px] font-medium text-[hsl(var(--muted-foreground))]">{priceSuffix}</span>}</p>
       {compareAtPrice && compareAtPrice > priceValue && <div className="mt-1 flex items-center gap-1.5"><span className="truncate text-[10px] text-[hsl(var(--muted-foreground))] line-through">{money(compareAtPrice, store.currency)}</span><span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700">-{discount}%</span></div>}
         {onAdd && <div className="mt-auto flex items-center gap-1.5 pt-2.5">
           {isAvailable && <button type="button" onClick={onAdd} className="flex-1 rounded-lg px-2 py-2 text-[10px] font-bold text-white shadow-sm transition hover:brightness-95 sm:text-xs" style={{ backgroundColor: 'var(--shop-accent)' }}><ShoppingBag size={12} className="mr-1 inline-block" />Ajouter</button>}
      </div>}
    </div>
  </article>;
}

function CatalogSections({
  products,
  rentals,
  categories,
  store,
  onProduct,
  onAdd,
}: {
  products: PublicProduct[];
  rentals: PublicRental[];
  categories: string[];
  store: PublicShopBootstrap['store'];
  onProduct: (product: PublicProduct) => void;
  onAdd: (product: PublicProduct) => void;
}) {
  return <div className="space-y-8">
    {categories.map(category => {
      const categoryProducts = products.filter(product => product.category === category);
      const categoryRentals = rentals.filter(rental => rental.category === category);
      if (categoryProducts.length === 0 && categoryRentals.length === 0) return null;
       return <section key={category}>
         <div className="mb-3 flex items-end justify-between gap-3 border-b border-black/5 pb-2"><div><p className="text-[9px] font-bold uppercase tracking-[.15em]" style={{ color: 'var(--shop-primary)' }}>Catégorie</p><h2 className="mt-1 text-lg font-bold tracking-[-.02em] sm:text-xl">{category}</h2></div><span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">{categoryProducts.length + categoryRentals.length} offre{categoryProducts.length + categoryRentals.length > 1 ? 's' : ''}</span></div>
           <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
               {categoryProducts.map(product => <PublicOfferCard key={`product-${product.slug}`} imageUrl={product.imageUrl} icon={Package} badge={`Produit · ${product.category}`} name={product.name} price={money(product.price, store.currency)} priceValue={product.price} compareAtPrice={product.compareAtPrice} availability={product.stock > 0 ? `${product.stock} en stock` : 'Indisponible'} store={store} onOpen={() => onProduct(product)} onAdd={() => onAdd(product)} />)}
           {categoryRentals.map(rental => <PublicOfferCard key={`rental-${rental.name}`} imageUrl={rental.imageUrl} icon={Home} badge={`Location · ${rental.category}`} name={rental.name} price={money(rental.price, store.currency)} priceValue={rental.price} priceSuffix={`/ ${rental.billingUnit === 'MOIS' ? 'mois' : rental.billingUnit === 'SEMAINE' ? 'semaine' : 'jour'}`} availability={rental.isAvailable ? `${rental.availability} en stock` : 'Indisponible'} store={store} />)}
        </div>
      </section>;
    })}
  </div>;
}

function DeliveryPage({ store, zones, customer, requests, form, setForm, submitted, onSubmit, submitting, onNavigate }: { store: PublicShopBootstrap['store']; zones: PublicShopBootstrap['deliveryZones']; customer: EcommerceCustomer | null; requests: EcommerceDeliveryRequest[]; form: { requesterName: string; requesterEmail: string; requesterPhone: string; address: string; deliveryZoneId: string; serviceType: EcommerceDeliveryServiceType; desiredDate: string; note: string }; setForm: (form: { requesterName: string; requesterEmail: string; requesterPhone: string; address: string; deliveryZoneId: string; serviceType: EcommerceDeliveryServiceType; desiredDate: string; note: string }) => void; submitted: EcommerceDeliveryRequest | null; onSubmit: () => void; submitting: boolean; onNavigate: (path: string) => void }) {
  const steps = [
    { icon: ShoppingBag, title: 'Choisissez vos articles', text: 'Ajoutez vos produits au panier et indiquez votre adresse.' },
    { icon: Truck, title: 'Nous préparons votre colis', text: 'La boutique confirme la commande et organise l’acheminement.' },
    { icon: Check, title: 'Suivez la livraison', text: 'Retrouvez chaque évolution dans votre espace client.' },
  ];

  return <section className="mx-auto max-w-5xl">
    <div className="mt-6 grid gap-4 md:grid-cols-3">{steps.map(({ icon: Icon, title, text }, index) => <div key={title} className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${store.primaryColor}22`, color: store.accentColor }}><Icon size={20} /></span><span className="mt-5 block text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">0{index + 1}</span><h2 className="mt-2 text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div>)}</div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Demander un service</p>
        <h2 className="mt-2 text-2xl font-bold">Besoin d’une livraison ?</h2>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Décrivez votre besoin, même sans passer une commande dans la boutique.</p>
         {submitted ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><Check className="text-emerald-700" size={22} /><p className="mt-3 font-bold text-emerald-900">Demande enregistrée</p><p className="mt-1 text-sm text-emerald-800">Référence : {submitted.reference}. Notre équipe reviendra vers vous pour confirmer le créneau.</p>{customer && <button type="button" onClick={() => onNavigate('/compte')} className="mt-4 text-sm font-bold text-emerald-900 underline">Voir mon espace client</button>}</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2"><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet" value={form.requesterName} onChange={event => setForm({ ...form, requesterName: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Email" type="email" value={form.requesterEmail} onChange={event => setForm({ ...form, requesterEmail: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.requesterPhone} onChange={event => setForm({ ...form, requesterPhone: event.target.value })} />{zones.length > 0 && <label className="block text-sm font-semibold">Zone de livraison<select required className="mt-1.5 w-full rounded-xl border bg-[hsl(var(--card))] px-3 py-3 text-sm font-normal" value={form.deliveryZoneId} onChange={event => setForm({ ...form, deliveryZoneId: event.target.value })}><option value="">Choisir une zone</option>{zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}{zone.fee > 0 ? ` · ${money(zone.fee, store.currency)}` : ''}</option>)}</select></label>}<select className="rounded-xl border bg-[hsl(var(--card))] px-3 py-3 text-sm" value={form.serviceType} onChange={event => setForm({ ...form, serviceType: event.target.value as EcommerceDeliveryServiceType })}><option value="STANDARD">Livraison standard</option><option value="URGENT">Livraison urgente</option></select><textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={2} placeholder="Adresse complète de livraison" value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} /><label className="text-sm font-semibold">Date souhaitée<input className="mt-1.5 block w-full rounded-xl border px-3 py-3 text-sm font-normal" type="date" value={form.desiredDate} onChange={event => setForm({ ...form, desiredDate: event.target.value })} /></label><textarea className="rounded-xl border px-3 py-3 text-sm" rows={2} placeholder="Précisions (facultatif)" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /><button type="button" onClick={onSubmit} disabled={submitting || !form.requesterName.trim() || !form.requesterEmail.trim() || !form.address.trim() || (zones.length > 0 && !form.deliveryZoneId)} className="rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2" style={{ backgroundColor: store.accentColor }}>{submitting ? 'Envoi en cours…' : 'Envoyer ma demande'}</button></div>}
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--primary)/.22)] bg-[hsl(var(--primary)/.08)] p-4 text-sm"><Clock3 size={18} className="mt-0.5 shrink-0" style={{ color: store.accentColor }} /><span>Les délais et frais peuvent dépendre de votre zone. L’adresse enregistrée dans votre compte facilite chaque nouvelle demande.</span></div>
    </div>
     {customer && requests.length > 0 && <div className="mt-6 rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Mon suivi</p><h2 className="mt-2 text-xl font-bold">Mes demandes récentes</h2><div className="mt-4 divide-y">{requests.slice(0, 5).map(request => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{request.reference}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{request.deliveryZoneName ? `${request.deliveryZoneName} · ` : ''}{request.serviceType === 'URGENT' ? 'Urgente' : 'Standard'}{request.desiredDate ? ` · ${request.desiredDate}` : ''}</p></div><span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-bold">{request.status}</span></div>)}</div></div>}
  </section>;
}

function RentalProductCard({ rental, store, onSelect }: { rental: PublicRental; store: PublicShopBootstrap['store']; onSelect: () => void }) {
  const unit = rental.billingUnit === 'MOIS' ? 'mois' : rental.billingUnit === 'SEMAINE' ? 'semaine' : 'jour';
  return <article className="overflow-hidden rounded-xl border border-[#e8e0d4] bg-white shadow-sm">
    <div className="relative flex aspect-[2/1] items-center justify-center overflow-hidden bg-[#fbfaf7]">
       {rental.imageUrl ? <img src={rental.imageUrl} alt={rental.name} className="h-full w-full object-cover" /> : <Home size={32} className="text-[hsl(var(--muted-foreground))]" />}
      <span className={`absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${rental.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{rental.isAvailable ? 'Disponible' : 'Indisponible'}</span>
    </div>
    <div className="p-3.5 sm:p-4">
      <p className="truncate text-[9px] font-bold uppercase tracking-[.14em] text-[#8c6c37]">{rental.category || 'Général'} · Location</p>
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <h2 className="min-w-0 break-words text-sm font-bold leading-tight text-[#20252f] sm:text-base">{rental.name}</h2>
        <p className="shrink-0 text-right text-xs font-bold text-[#20252f] sm:text-sm">{money(rental.dailyRate ?? rental.price, store.currency)}<span className="block text-[10px] font-medium text-[#655e55]">/ jour</span></p>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#eee7dc] pt-2 text-[11px] font-semibold text-[#655e55]">
        <div className="flex items-center gap-1.5"><Home size={14} className="shrink-0 text-[#8c6c37]" /><span>{rental.seats ? `${rental.seats} places` : 'Places N/A'}</span></div>
        <div className="flex items-center gap-1.5 truncate"><span>{rental.transmission === 'AUTOMATIC' ? 'Auto' : rental.transmission === 'MANUAL' ? 'Manuelle' : 'Transmission N/A'}</span></div>
      </div>
      <button type="button" onClick={onSelect} disabled={!rental.isAvailable} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: 'var(--shop-accent)' }}><MessageCircle size={14} />Discuter sur WhatsApp</button>
    </div>
  </article>;
}

function RentalPage({ rentals, store, customer, slug, domain, onBack }: { rentals: PublicRental[]; store: PublicShopBootstrap['store']; customer: EcommerceCustomer | null; slug?: string; domain?: boolean; onBack: () => void }) {
  const [selectedRental, setSelectedRental] = useState<PublicRental | null>(null);

  if (selectedRental) {
    return <RentalBookingForm rental={selectedRental} store={store} customer={customer} onBack={() => setSelectedRental(null)} />;
  }

  const categories = [...new Set(rentals.map(rental => rental.category || 'Général'))].sort((a, b) => a.localeCompare(b, 'fr'));

  return <section className="mx-auto max-w-6xl">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour à la boutique</button>
    <header className="mt-6 flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-end">
      <div><p className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: store.primaryColor }}>Flotte automobile</p><h1 className="mt-2 text-2xl font-bold tracking-[-.04em]">Trouvez votre prochaine location</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Échangez directement avec le propriétaire pour vérifier la disponibilité et les conditions.</p></div>
      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{rentals.length} véhicule{rentals.length > 1 ? 's' : ''}</span>
    </header>
    {rentals.length === 0
      ? <div className="mt-6 rounded-2xl border border-dashed p-10 text-center"><p className="text-sm font-semibold">Les offres de location arrivent bientôt.</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Aucune location publiée n’est disponible dans cette boutique.</p></div>
      : <div className="mt-6 space-y-8">{categories.map(category => {
        const categoryRentals = rentals.filter(rental => (rental.category || 'Général') === category);
        return <section key={category}>
          <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Catégorie</p><h2 className="mt-1 text-xl font-bold">{category}</h2></div><span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{categoryRentals.length} véhicule{categoryRentals.length > 1 ? 's' : ''}</span></div>
           <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{categoryRentals.map(rental => <RentalProductCard key={`${category}-${rental.name}-${rental.billingUnit}`} rental={rental} store={store} onSelect={() => setSelectedRental(rental)} />)}</div>
        </section>;
      })}</div>}
  </section>;
}

function RentalBookingForm({ rental, store, customer, onBack }: { rental: PublicRental; store: PublicShopBootstrap['store']; customer: EcommerceCustomer | null; onBack: () => void }) {
  const [form, setForm] = useState({ startsAt: '', endsAt: '', tripType: 'FAMILY' as EcommerceCarTripType, departure: '', destination: '', customerName: customer?.name || '', customerEmail: customer?.email || '', customerPhone: customer?.phone || '', note: '' });
  const [error, setError] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const whatsapp = whatsappNumber(store.locationSettings?.whatsapp || '');
  const whatsappMessage = store.locationSettings?.message?.trim() || 'Bonjour, je souhaite échanger au sujet de cette location.';

  const openWhatsapp = () => {
    if (!whatsapp) {
      setError('Le propriétaire n’a pas encore renseigné son numéro WhatsApp.');
      return;
    }
    if (!form.startsAt || !form.endsAt || !form.customerName.trim()) {
      setError('Indiquez au moins votre nom et les dates souhaitées.');
      return;
    }
    const details = [
      whatsappMessage,
      '',
      `Véhicule : ${rental.name}`,
      `Dates : du ${form.startsAt} au ${form.endsAt}`,
      `Type : ${form.tripType === 'BUSINESS' ? 'Professionnel' : 'Famille / Personnel'}`,
      `Nom : ${form.customerName.trim()}`,
      form.customerPhone.trim() ? `Téléphone : ${form.customerPhone.trim()}` : '',
      form.customerEmail.trim() ? `Email : ${form.customerEmail.trim()}` : '',
      form.departure.trim() ? `Départ souhaité : ${form.departure.trim()}` : '',
      form.destination.trim() ? `Destination : ${form.destination.trim()}` : '',
      form.note.trim() ? `Message : ${form.note.trim()}` : '',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(details)}`, '_blank', 'noopener,noreferrer');
  };

  return <section className="mx-auto max-w-4xl">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour aux véhicules</button>
    <div className="mt-6 flex flex-col md:flex-row gap-8">
      <div className="w-full md:w-1/3 shrink-0 space-y-4">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
           <GalleryCarousel mainImage={rental.imageUrl} gallery={rental.gallery} alt={rental.name} icon={Home} />
          <div className="p-4">
            <h2 className="text-lg font-bold">{rental.name}</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{rental.category}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {rental.seats && <span className="rounded bg-[hsl(var(--muted))] px-2 py-1 font-semibold">{rental.seats} places</span>}
              {rental.transmission && <span className="rounded bg-[hsl(var(--muted))] px-2 py-1 font-semibold">{rental.transmission === 'AUTOMATIC' ? 'Automatique' : 'Manuelle'}</span>}
              {rental.fuel && <span className="rounded bg-[hsl(var(--muted))] px-2 py-1 font-semibold">{rental.fuel}</span>}
            </div>
            <p className="mt-4 text-xl font-bold text-[hsl(var(--foreground))]">{money(rental.dailyRate ?? rental.price, store.currency)}<span className="text-xs font-normal text-[hsl(var(--muted-foreground))]"> / jour</span></p>
          </div>
        </div>
      </div>
      
      <div className="w-full md:w-2/3">
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        
        <div className="rounded-3xl border bg-[hsl(var(--card))] p-6 shadow-sm sm:p-8 space-y-6 fade-up">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: 'var(--shop-primary)' }}>Contact direct</p>
            <h2 className="mt-2 text-xl font-bold">Parlez au propriétaire sur WhatsApp</h2>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Plus besoin de calculer la distance. Envoyez votre demande et échangez directement sur les dates, le trajet et les conditions.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">Date de départ<input type="date" required min={today} value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
            <label className="block text-sm font-bold">Date de retour<input type="date" required min={form.startsAt || today} value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-bold">Type de voyage</label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={form.tripType === 'FAMILY'} onChange={() => setForm({ ...form, tripType: 'FAMILY' })} /> Famille / Personnel</label>
              <label className="flex items-center gap-2"><input type="radio" checked={form.tripType === 'BUSINESS'} onChange={() => setForm({ ...form, tripType: 'BUSINESS' })} /> Professionnel</label>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">Votre nom<input required placeholder="Nom complet" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
            <label className="block text-sm font-bold">Téléphone<input placeholder="Numéro WhatsApp" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
            <label className="block text-sm font-bold">Email<input type="email" placeholder="Votre adresse email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">Départ souhaité<span className="mt-1 block text-xs font-normal text-[hsl(var(--muted-foreground))]">Facultatif, pour aider le propriétaire à vous répondre.</span><input placeholder="Ex. Aéroport de Dakar" value={form.departure} onChange={e => setForm({ ...form, departure: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
            <label className="block text-sm font-bold">Destination<span className="mt-1 block text-xs font-normal text-[hsl(var(--muted-foreground))]">Facultatif, aucun calcul automatique.</span><input placeholder="Ex. Saly Portudal" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
          </div>
          <label className="block text-sm font-bold">Message complémentaire<textarea rows={3} placeholder="Une question ou une précision pour le propriétaire ?" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
          <button type="button" onClick={openWhatsapp} disabled={!whatsapp || !form.startsAt || !form.endsAt || !form.customerName.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: '#25D366' }}><MessageCircle size={18} />{whatsapp ? 'Ouvrir la discussion WhatsApp' : 'WhatsApp du propriétaire non configuré'}</button>
          <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">Le message sera prérempli avec le véhicule et vos informations.</p>
        </div>
      </div>
    </div>
  </section>;
}

function FeatureUnavailable({ title, text, onBack }: { title: string; text: string; onBack: () => void }) {
  return <section className="mx-auto max-w-xl rounded-3xl border bg-[hsl(var(--card))] p-8 text-center shadow-sm"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))]"><LockKeyhole size={21} /></span><h1 className="mt-5 text-2xl font-bold">{title}</h1><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p><button type="button" onClick={onBack} className="mt-6 rounded-xl px-4 py-3 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Retour à la boutique</button></section>;
}

function AuthPanel({ mode, onModeChange, form, setForm, onSubmit, onBack }: { mode: 'login' | 'register'; onModeChange: (mode: 'login' | 'register') => void; form: { name: string; email: string; phone: string; password: string }; setForm: (form: { name: string; email: string; phone: string; password: string }) => void; onSubmit: () => void; onBack: () => void }) {
  return <section className="mx-auto w-full min-w-0 max-w-md rounded-3xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour à la boutique</button><div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))]"><LockKeyhole size={22} /></div><h1 className="mt-5 break-words text-2xl font-bold">{mode === 'login' ? 'Bienvenue dans votre espace' : 'Créer votre compte client'}</h1><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{mode === 'login' ? 'Suivez vos commandes et retrouvez vos informations de livraison.' : 'Votre compte est propre à cette boutique et ne donne accès qu’à vos données.'}</p><div className="mt-6 min-w-0 space-y-3">{mode === 'register' && <><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></>}<input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Email" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Mot de passe (8 caractères minimum)" type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></div><button type="button" onClick={onSubmit} className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button><button type="button" onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')} className="mt-4 w-full text-sm font-semibold underline underline-offset-4">{mode === 'login' ? 'Créer un compte' : 'J’ai déjà un compte'}</button></section>;
}

function CartPanelV2({ cart, total, requiresShipping, zones, deliveryZoneId, setDeliveryZoneId, store, customer, form, setForm, paymentProvider, setPaymentProvider, onChange, onSubmit, submitting, onBack }: { cart: CartLine[]; total: number; requiresShipping: boolean; zones: PublicShopBootstrap['deliveryZones']; deliveryZoneId: string; setDeliveryZoneId: (id: string) => void; store: PublicShopBootstrap['store']; customer: EcommerceCustomer | null; form: { customerName: string; customerEmail: string; customerPhone: string; shippingAddress: string; note: string }; setForm: (form: { customerName: string; customerEmail: string; customerPhone: string; shippingAddress: string; note: string }) => void; paymentProvider: PaymentProvider; setPaymentProvider: (provider: PaymentProvider) => void; onChange: (slug: string, delta: number) => void; onSubmit: () => void; submitting: boolean; onBack: () => void }) {
  const requiresZone = requiresShipping && zones.length > 0;
  const canSubmit = !submitting && Boolean(form.customerName.trim()) && Boolean(form.customerEmail.trim()) && (!requiresShipping || Boolean(form.shippingAddress.trim())) && (!requiresZone || Boolean(deliveryZoneId)) && cart.length > 0;
  return <section className="mx-auto max-w-3xl">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Continuer mes achats</button>
    <div className="mt-5 rounded-3xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: 'var(--shop-primary)' }}>Panier</p>
      <h1 className="mt-1 text-2xl font-bold">Votre commande</h1>
      {cart.length === 0 ? <p className="py-14 text-center text-sm text-[hsl(var(--muted-foreground))]">Votre panier est vide.</p> : <>
         <div className="mt-6 divide-y border-y">{cart.map(line => <div key={line.product.slug} className="flex items-center gap-3 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{line.product.name}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{line.product.fulfillmentType === 'DIGITAL' ? 'Produit numérique' : line.product.productType === 'RENTAL' ? 'Location' : 'Produit physique'} · {money(line.product.price, store.currency)}</p></div>{line.product.fulfillmentType === 'DIGITAL' ? <div className="flex items-center gap-2"><span className="text-sm font-bold">× 1</span><button type="button" onClick={() => onChange(line.product.slug, -1)} aria-label="Retirer le produit numérique du panier" className="rounded-lg border p-1.5"><X size={13} /></button></div> : <div className="flex items-center gap-2 rounded-lg border px-2 py-1"><button type="button" onClick={() => onChange(line.product.slug, -1)} aria-label="Retirer une unité"><Minus size={14} /></button><span className="w-5 text-center text-sm font-bold">{line.quantity}</span><button type="button" onClick={() => onChange(line.product.slug, 1)} aria-label="Ajouter une unité"><Plus size={14} /></button></div>}<p className="w-24 text-right text-sm font-bold">{money(line.product.price * line.quantity, store.currency)}</p></div>)}</div>
         {requiresZone && <div className="mt-5 rounded-2xl border border-[var(--shop-primary)]/20 bg-[var(--shop-primary)]/5 p-4"><div className="flex items-start gap-3"><Truck size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--shop-accent)' }} /><div><p className="text-sm font-bold">Choisissez votre zone de livraison</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Les frais sont ajoutés au total selon la zone sélectionnée.</p></div></div><select required aria-label="Zone de livraison" className="mt-3 w-full rounded-xl border bg-[hsl(var(--card))] px-3 py-3 text-sm" value={deliveryZoneId} onChange={event => setDeliveryZoneId(event.target.value)}><option value="">Sélectionner une zone</option>{zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name} · {zone.fee > 0 ? money(zone.fee, store.currency) : 'Gratuit'}</option>)}</select></div>}
         <div className="mt-5 flex items-center justify-between text-lg font-bold"><span>Total</span><span>{money(total, store.currency)}</span></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet" value={form.customerName} onChange={event => setForm({ ...form, customerName: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Email" type="email" value={form.customerEmail} onChange={event => setForm({ ...form, customerEmail: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.customerPhone} onChange={event => setForm({ ...form, customerPhone: event.target.value })} />{requiresShipping ? <textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={3} placeholder="Adresse de livraison" value={form.shippingAddress} onChange={event => setForm({ ...form, shippingAddress: event.target.value })} /> : <p className="rounded-xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] px-3 py-3 text-xs text-[hsl(var(--primary))] sm:col-span-2">Cette commande contient uniquement des produits numériques. Aucun envoi physique n’est nécessaire.</p>}<textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={2} placeholder="Note pour la boutique (facultatif)" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /></div>
        <fieldset className="mt-5 rounded-2xl border p-4"><legend className="px-1 text-sm font-bold">Moyen de paiement</legend><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Choisissez votre moyen préféré. Le paiement sera sécurisé par DiamanoPay.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{([['WAVE', 'Wave'], ['ORANGE_MONEY', 'Orange Money']] as const).map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${paymentProvider === value ? 'border-[var(--shop-primary)] bg-[var(--shop-primary)]/10' : 'hover:bg-[hsl(var(--muted))]'}`}><input type="radio" name="payment-provider" value={value} checked={paymentProvider === value} onChange={() => setPaymentProvider(value)} />{label}</label>)}</div></fieldset>
        {customer && <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">Cette commande sera rattachée à votre compte client.</p>}
        <button type="button" onClick={onSubmit} disabled={!canSubmit} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--shop-accent)' }}>{submitting && <RefreshCw size={15} className="animate-spin" />}{submitting ? 'Préparation du paiement…' : `Payer avec ${paymentProvider === 'WAVE' ? 'Wave' : 'Orange Money'}`}</button>
      </>}
    </div>
  </section>;
}

function AccountPanel(props: { store: PublicShopBootstrap['store']; section: AccountSection; customer: EcommerceCustomer; products: PublicProduct[]; customerData: EcommerceCustomerBootstrap | null; customerLoading: boolean; customerActionPending: boolean; selectedOrder?: EcommerceCustomerBootstrap['orders'][number]; profileForm: { name: string; phone: string }; setProfileForm: (form: { name: string; phone: string }) => void; passwordForm: { currentPassword: string; newPassword: string }; setPasswordForm: (form: { currentPassword: string; newPassword: string }) => void; addressForm: Omit<EcommerceCustomerAddress, 'id'>; setAddressForm: (form: Omit<EcommerceCustomerAddress, 'id'>) => void; editingAddressId: string | null; setEditingAddressId: (id: string | null) => void; onProfile: () => void; onPassword: () => void; onAddress: () => void; onDeleteAddress: (id: string) => void; onFavorite: (product: PublicProduct) => void; onDownload: (orderId: string, itemId: string) => void; onOrder: (id: string) => void; onLogout: () => void; onNavigate: (path: string) => void }) {
  const { section, customer, customerData, customerLoading, onDownload } = props;
  const orders = customerData?.orders ?? [];
  const addresses = customerData?.addresses ?? [];
  const favoriteCount = customerData?.favoriteProductSlugs.length ?? 0;
  const deliveryRequests = customerData?.deliveryRequests ?? [];
   const tabs = [['dashboard', 'Vue d’ensemble', '/compte'], ['orders', 'Commandes', '/compte/commandes'], ['favorites', `Favoris (${favoriteCount})`, '/compte/favoris'], ['addresses', 'Adresses', '/compte/adresses'], ['profile', 'Profil & sécurité', '/compte/profil']] as const;
    return <section className="grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6" aria-busy={props.customerActionPending}>{props.customerActionPending && <div className="fixed inset-x-4 top-4 z-[90] mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl border border-[var(--shop-primary)]/25 bg-white/95 px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur" role="status"><RefreshCw size={15} className="animate-spin" aria-hidden="true" />Action en cours…</div>}<aside className="min-w-0 rounded-2xl border bg-[hsl(var(--card))] p-3 shadow-sm"><div className="flex min-w-0 items-center gap-3 border-b px-2 pb-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--muted))]">{props.store.logoUrl ? <img src={props.store.logoUrl} alt={`Logo de ${props.store.name}`} className="h-full w-full object-contain p-1" /> : <UserRound size={18} />}</span><div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Mon espace client</p><p className="truncate text-sm font-bold">{customer.name}</p><p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{customer.email}</p></div></div><nav className="mt-3 grid grid-cols-2 gap-1 lg:grid-cols-1">{tabs.map(([key, label, path]) => <button type="button" key={key} onClick={() => props.onNavigate(path)} className={`min-w-0 rounded-lg px-2.5 py-2.5 text-left text-xs font-semibold leading-4 sm:px-3 sm:text-sm ${section === key ? 'bg-[var(--shop-accent)] text-white' : 'hover:bg-[hsl(var(--muted))]'}`}>{label}</button>)}<button type="button" onClick={props.onLogout} disabled={props.customerActionPending} className="col-span-2 min-w-0 rounded-lg border-t px-2.5 py-2.5 text-left text-xs font-semibold text-red-700 disabled:cursor-wait disabled:opacity-50 sm:px-3 sm:text-sm lg:col-span-1 lg:mt-3">Se déconnecter</button></nav></aside><div className="min-w-0">{customerLoading ? <div className="rounded-2xl border bg-[hsl(var(--card))] p-8 text-sm text-[hsl(var(--muted-foreground))]">Chargement de votre espace…</div> : section === 'dashboard' ? <CustomerDashboard customer={customer} orders={orders} addresses={addresses} favoriteCount={favoriteCount} deliveryRequests={deliveryRequests} store={props.store} onNavigate={props.onNavigate} /> : section === 'orders' ? <OrderSection orders={orders} selectedOrder={props.selectedOrder} onOrder={props.onOrder} onDownload={onDownload} /> : section === 'profile' ? <ProfileSection customer={customer} profileForm={props.profileForm} setProfileForm={props.setProfileForm} passwordForm={props.passwordForm} setPasswordForm={props.setPasswordForm} onProfile={props.onProfile} onPassword={props.onPassword} /> : section === 'addresses' ? <AddressSection addresses={addresses} form={props.addressForm} setForm={props.setAddressForm} editingId={props.editingAddressId} setEditingId={props.setEditingAddressId} customer={customer} onSave={props.onAddress} onDelete={props.onDeleteAddress} /> : <FavoriteSection products={props.products} favoriteSlugs={customerData?.favoriteProductSlugs ?? []} onToggle={props.onFavorite} onNavigate={props.onNavigate} />}</div></section>;
}

function CustomerDashboard({ customer, orders, addresses, favoriteCount, deliveryRequests, store, onNavigate }: { customer: EcommerceCustomer; orders: EcommerceCustomerBootstrap['orders']; addresses: EcommerceCustomerAddress[]; favoriteCount: number; deliveryRequests: EcommerceDeliveryRequest[]; store: PublicShopBootstrap['store']; onNavigate: (path: string) => void }) {
  const firstName = customer.name.split(' ')[0];
  const activeOrders = orders.filter(order => !['LIVRÉE', 'ANNULÉE'].includes(order.status));
  const paidTotal = orders.filter(order => order.paymentStatus === 'PAID').reduce((sum, order) => sum + order.total, 0);
  const latest = orders[0];
  const initials = customer.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const progress = latest ? ({ 'NOUVELLE': 15, 'CONFIRMÉE': 35, 'EN PRÉPARATION': 58, 'EXPÉDIÉE': 82, 'LIVRÉE': 100, 'ANNULÉE': 0 }[latest.status] ?? 0) : 0;

  return <div className="space-y-5 fade-up">
    <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl sm:p-8" style={{ background: `linear-gradient(120deg, ${store.accentColor}, ${store.primaryColor})` }}>
      <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full border-[20px] border-white/10" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
         <div className="flex min-w-0 items-center gap-3 sm:gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold sm:h-14 sm:w-14">{initials}</span><div className="min-w-0"><p className="text-xs font-semibold text-white/65">Votre espace personnel</p><h1 className="mt-1 break-words text-xl font-bold tracking-[-.04em] sm:text-2xl">Bonjour {firstName}.</h1><p className="mt-1 text-sm leading-5 text-white/70">Tout ce qui compte pour vos commandes, au même endroit.</p></div></div>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/12 px-3 py-2 text-xs font-bold"><span className="h-2 w-2 rounded-full bg-emerald-300" />Compte actif</span>
      </div>
      <div className="relative mt-7 flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/70"><span>{orders.length} commande{orders.length > 1 ? 's' : ''}</span><span>{addresses.length} adresse{addresses.length > 1 ? 's' : ''} enregistrée{addresses.length > 1 ? 's' : ''}</span><span>{money(paidTotal, store.currency)} dépensés</span></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStat icon={Package} label="Commandes" value={orders.length} detail={activeOrders.length ? `${activeOrders.length} en cours` : 'Aucune en cours'} onClick={() => onNavigate('/compte/commandes')} />
      <DashboardStat icon={Truck} label="Demandes livraison" value={deliveryRequests.length} detail={deliveryRequests[0]?.status ?? 'Aucune demande'} onClick={() => onNavigate('/livraison')} />
      <DashboardStat icon={Heart} label="Favoris" value={favoriteCount} detail="Produits enregistrés" onClick={() => onNavigate('/compte/favoris')} />
      <DashboardStat icon={MapPin} label="Adresses" value={addresses.length} detail="Pour commander plus vite" onClick={() => onNavigate('/compte/adresses')} />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-6"><div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Dernier mouvement</p><h2 className="mt-2 break-words text-lg font-bold sm:text-xl">Votre commande récente</h2></div><button type="button" onClick={() => onNavigate('/compte/commandes')} className="shrink-0 text-xs font-bold" style={{ color: store.accentColor }}>Tout voir <ArrowRight className="inline" size={14} /></button></div>{latest ? <div className="mt-5 rounded-2xl border bg-[hsl(var(--muted)/.28)] p-3 sm:mt-6 sm:p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-bold">{latest.reference}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{readableDate(latest.createdAt)} · {latest.items.length} article{latest.items.length > 1 ? 's' : ''}</p></div><span className="shrink-0 rounded-full bg-[hsl(var(--primary)/.14)] px-3 py-1 text-[11px] font-bold" style={{ color: store.accentColor }}>{latest.status}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[hsl(var(--border))]"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: store.primaryColor }} /></div><div className="mt-2 flex justify-between gap-2 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]"><span>Préparation</span><span>Expédition</span><span>Livraison</span></div><div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-[hsl(var(--muted-foreground))]">{latest.paymentStatus === 'PAID' ? 'Paiement confirmé' : 'Paiement en attente'}</span><strong>{money(latest.total, store.currency)}</strong></div></div> : <div className="mt-6 rounded-2xl border border-dashed p-8 text-center"><Sparkles className="mx-auto" size={22} style={{ color: store.primaryColor }} /><p className="mt-3 text-sm font-semibold">Votre prochaine commande apparaîtra ici.</p><button type="button" onClick={() => onNavigate('')} className="mt-4 rounded-xl px-4 py-2.5 text-xs font-bold text-white" style={{ backgroundColor: store.accentColor }}>Découvrir la boutique</button></div>}</section>
      <section className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Accès rapides</p><h2 className="mt-2 text-xl font-bold">Gagnez du temps</h2><div className="mt-5 grid gap-2">{[['/compte/favoris', Heart, 'Mes favoris', 'Retrouvez vos sélections'], ['/compte/adresses', MapPin, 'Mes adresses', 'Préparez vos livraisons'], ['/compte/profil', UserRound, 'Mon profil', 'Gardez vos infos à jour']].map(([path, Icon, label, text]) => <button type="button" key={path as string} onClick={() => onNavigate(path as string)} className="flex items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--shop-primary)]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--muted))]" style={{ color: store.accentColor }}><Icon size={17} /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{label as string}</strong><span className="mt-0.5 block text-xs text-[hsl(var(--muted-foreground))]">{text as string}</span></span><ArrowRight size={14} className="text-[hsl(var(--muted-foreground))]" /></button>)}</div></section>
    </div>
  </div>;
}

function DashboardStat({ icon: Icon, label, value, detail, onClick }: { icon: typeof Package; label: string; value: number; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-2xl border bg-[hsl(var(--card))] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--shop-primary)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--muted))]"><Icon size={17} /></span><p className="mt-4 text-xs font-bold text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{detail}</p></button>;
}

function FavoriteSection({ products, favoriteSlugs, onToggle, onNavigate }: { products: PublicProduct[]; favoriteSlugs: string[]; onToggle: (product: PublicProduct) => void; onNavigate: (path: string) => void }) {
  const favorites = products.filter(product => favoriteSlugs.includes(product.slug));

  return <div className="min-w-0"><h1 className="break-words text-2xl font-bold">Vos favoris</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Les produits enregistrés dans votre compte sur cette boutique.</p>{favorites.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))] sm:p-10">Aucun produit favori disponible actuellement.</div> : <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">{favorites.map(product => <div key={product.slug} className="flex min-w-0 items-center gap-3 rounded-2xl border bg-[hsl(var(--card))] p-3 shadow-sm sm:gap-4 sm:p-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--muted))] sm:h-16 sm:w-16">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package size={20} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{product.price}</p></div><button type="button" onClick={() => onToggle(product)} className="shrink-0 rounded-lg border p-2 text-red-600" aria-label="Retirer des favoris"><Heart size={17} fill="currentColor" /></button></div>)}</div>}<button type="button" onClick={() => onNavigate('')} className="mt-6 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Voir la boutique</button></div>;
}

function OrderSection({ orders, selectedOrder, onOrder, onDownload }: { orders: EcommerceCustomerBootstrap['orders']; selectedOrder?: EcommerceCustomerBootstrap['orders'][number]; onOrder: (id: string) => void; onDownload: (orderId: string, itemId: string) => void }) {
  const selectedOrderIsDigital = Boolean(selectedOrder?.items.length) && selectedOrder?.items.every(item => item.fulfillmentType === 'DIGITAL');
  const paymentFailed = selectedOrder ? ['FAILED', 'REFUNDED'].includes(selectedOrder.paymentStatus) : false;
  return <div className="min-w-0">
    <div className="flex min-w-0 items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold">Vos commandes</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{selectedOrderIsDigital ? 'Votre produit numérique est livré automatiquement après confirmation du paiement.' : 'Le statut du paiement, de la préparation et de la livraison communiqué par la boutique.'}</p>
      </div>
    </div>
    {selectedOrder ? <div className="mt-6 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-5">
      <button type="button" onClick={() => onOrder('')} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={15} />Toutes les commandes</button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-xs text-[hsl(var(--muted-foreground))]">{readableDate(selectedOrder.createdAt)}</p><h2 className="mt-1 break-words text-xl font-bold">{selectedOrder.reference}</h2></div>
        <div className="shrink-0 text-left sm:text-right"><p className="text-sm font-bold">{selectedOrder.status}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Paiement : {selectedOrder.paymentStatus}</p></div>
      </div>
       {paymentFailed && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
         <strong className="block">Paiement échoué</strong>
         <span className="mt-1 block">{selectedOrder.paymentFailureReason || 'Le paiement Wave n’a pas été confirmé. Votre commande n’a pas été débitée.'}</span>
         <span className="mt-2 block text-xs">Vous pouvez retourner au panier et réessayer le paiement.</span>
       </div>}
       {selectedOrderIsDigital && selectedOrder.paymentStatus === 'PAID' && <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
         <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100"><Download size={18} /></span><div><strong className="block">Votre téléchargement est prêt</strong><p className="mt-1 text-sm leading-5">Cliquez sur le bouton pour télécharger votre produit numérique.</p></div></div>
         <div className="mt-4 flex flex-wrap gap-2">{selectedOrder.items.filter(item => item.fulfillmentType === 'DIGITAL').map(item => <button type="button" key={`download-${item.id}`} onClick={() => onDownload(selectedOrder.id, item.id)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"><Download size={15} />Télécharger{selectedOrder.items.filter(candidate => candidate.fulfillmentType === 'DIGITAL').length > 1 ? ` · ${item.productName}` : ''}</button>)}</div>
       </div>}
      <div className="mt-6 divide-y border-y">
        {selectedOrder.items.map(item => {
          const isDigital = item.fulfillmentType === 'DIGITAL';
          const canDownload = isDigital && selectedOrder.paymentStatus === 'PAID';
          return <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 py-4 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--muted))] sm:h-12 sm:w-12">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : item.productType === 'RENTAL' ? <Home size={18} /> : isDigital ? <ArrowDownToLine size={18} /> : <Package size={18} />}</span>
              <span className="min-w-0"><strong className="block truncate">{item.productName}</strong><small className="text-xs text-[hsl(var(--muted-foreground))]">{isDigital ? 'Produit numérique' : item.productType === 'RENTAL' ? 'Location' : 'Produit physique'} · × {item.quantity}</small></span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <strong className="text-right">{item.lineTotal}</strong>
              {canDownload && <button type="button" onClick={() => onDownload(selectedOrder.id, item.id)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold text-[hsl(var(--primary))]"><Download size={14} />Télécharger</button>}
            </div>
          </div>;
        })}
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-2 font-bold"><span>Total</span><span>{money(selectedOrder.total, 'XOF')}</span></div>
      {selectedOrder.shippingAddress && <p className="mt-5 break-words rounded-xl bg-[hsl(var(--muted)/.5)] p-4 text-sm">{selectedOrder.shippingAddress}</p>}
    </div> : orders.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))] sm:p-10">Aucune commande liée à ce compte.</div> : <div className="mt-6 grid gap-3">{orders.map(order => <button type="button" key={order.id} onClick={() => onOrder(order.id)} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border bg-[hsl(var(--card))] p-4 text-left shadow-sm hover:border-[var(--shop-primary)] sm:gap-4 sm:p-5"><div className="min-w-0"><p className="truncate text-sm font-bold">{order.reference}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{readableDate(order.createdAt)} · {order.items.length} article(s)</p></div><div className="shrink-0 text-left sm:text-right"><p className="text-sm font-bold">{order.total}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{order.status} · Paiement {order.paymentStatus}</p></div></button>)}</div>}
  </div>;
}

function ProfileSection({ customer, profileForm, setProfileForm, passwordForm, setPasswordForm, onProfile, onPassword }: { customer: EcommerceCustomer; profileForm: { name: string; phone: string }; setProfileForm: (form: { name: string; phone: string }) => void; passwordForm: { currentPassword: string; newPassword: string }; setPasswordForm: (form: { currentPassword: string; newPassword: string }) => void; onProfile: () => void; onPassword: () => void }) {
  return <div className="grid min-w-0 gap-5 xl:grid-cols-2"><section className="min-w-0 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-5"><h1 className="text-xl font-bold">Profil</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Vos informations servent uniquement à cette boutique.</p><div className="mt-5 grid min-w-0 gap-3"><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" value={profileForm.name} onChange={event => setProfileForm({ ...profileForm, name: event.target.value })} /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" value={customer.email} disabled /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={profileForm.phone} onChange={event => setProfileForm({ ...profileForm, phone: event.target.value })} /></div><button type="button" onClick={onProfile} className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white sm:w-auto" style={{ backgroundColor: 'var(--shop-accent)' }}>Enregistrer</button></section><section className="min-w-0 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-5"><h2 className="text-xl font-bold">Sécurité</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Changez votre mot de passe. Les sessions existantes seront révoquées.</p><div className="mt-5 grid min-w-0 gap-3"><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Mot de passe actuel" type="password" value={passwordForm.currentPassword} onChange={event => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Nouveau mot de passe" type="password" value={passwordForm.newPassword} onChange={event => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></div><button type="button" onClick={onPassword} className="mt-5 w-full rounded-xl border px-4 py-2.5 text-sm font-bold sm:w-auto">Changer le mot de passe</button></section></div>;
}

function AddressSection({ addresses, form, setForm, editingId, setEditingId, customer, onSave, onDelete }: { addresses: EcommerceCustomerAddress[]; form: Omit<EcommerceCustomerAddress, 'id'>; setForm: (form: Omit<EcommerceCustomerAddress, 'id'>) => void; editingId: string | null; setEditingId: (id: string | null) => void; customer: EcommerceCustomer; onSave: () => void; onDelete: (id: string) => void }) {
  const reset = () => { setEditingId(null); setForm({ label: 'Domicile', recipientName: customer.name, phone: customer.phone, line1: '', line2: '', city: '', region: '', postalCode: '', country: 'Sénégal', isDefault: false }); };
  return <div className="min-w-0"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><h1 className="break-words text-2xl font-bold">Adresses</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Gérez vos adresses de livraison enregistrées.</p></div><button type="button" onClick={reset} className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white sm:w-auto" style={{ backgroundColor: 'var(--shop-accent)' }}>Nouvelle adresse</button></div><div className="mt-6 grid gap-3">{addresses.map(address => <div key={address.id} className="min-w-0 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-5"><div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="break-words font-bold">{address.label}</h2>{address.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">Par défaut</span>}</div><p className="mt-2 break-words text-sm">{address.recipientName} · {address.phone}</p><p className="mt-1 break-words text-sm text-[hsl(var(--muted-foreground))]">{addressText(address)}</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><button type="button" onClick={() => { setEditingId(address.id); setForm(address); }} className="w-full rounded-lg border px-3 py-2 text-xs font-bold sm:w-auto">Modifier</button><button type="button" onClick={() => onDelete(address.id)} className="w-full rounded-lg border px-3 py-2 text-xs font-bold text-red-700 sm:w-auto">Supprimer</button></div></div></div>)}</div>{(editingId || addresses.length === 0) && <div className="mt-6 min-w-0 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-5"><div className="flex min-w-0 items-start justify-between gap-3"><h2 className="break-words text-lg font-bold">{editingId ? 'Modifier l’adresse' : 'Ajouter une adresse'}</h2><button type="button" onClick={reset} aria-label="Annuler" className="shrink-0"><X size={18} /></button></div><div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">{(['label', 'recipientName', 'phone', 'line1', 'line2', 'city', 'region', 'postalCode', 'country'] as const).map(field => <input key={field} className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder={{ label: 'Libellé', recipientName: 'Nom du destinataire', phone: 'Téléphone', line1: 'Adresse', line2: 'Complément', city: 'Ville', region: 'Région', postalCode: 'Code postal', country: 'Pays' }[field]} value={form[field]} onChange={event => setForm({ ...form, [field]: event.target.value })} />)}</div><label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={event => setForm({ ...form, isDefault: event.target.checked })} /> <span>Utiliser comme adresse par défaut</span></label><button type="button" onClick={onSave} className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white sm:w-auto" style={{ backgroundColor: 'var(--shop-accent)' }}>Enregistrer l’adresse</button></div>}</div>;
}