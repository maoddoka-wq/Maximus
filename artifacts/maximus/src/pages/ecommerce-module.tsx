L' ? null : (modal !== 'new' && modal ? modal.rentalPeriod : null);
    const requestedStatus = form.status;
    const existingDigitalFile = modal !== null && modal !== 'new' && form.fulfillmentType === 'DIGITAL' && Boolean(modal.digitalFile?.name);
    const mustUploadBeforePublishing = form.fulfillmentType === 'DIGITAL' && requestedStatus === 'PUBLISHED' && !existingDigitalFile;
    const savingDigitalDraft = form.fulfillmentType === 'DIGITAL' && requestedStatus === 'PUBLISHED' && !form.digitalFile && !existingDigitalFile;
    const bodyStatus = mustUploadBeforePublishing ? 'DRAFT' : requestedStatus;
    const body = { name: form.name.trim(), ...(form.slug.trim() ? { slug: slugify(form.slug) } : {}), sku: form.sku.trim(), description: form.description.trim(), category: form.category.trim() || 'Divers', categoryId: form.categoryId || null, price, compareAtPrice, stock, productType, rentalPeriod, fulfillmentType: form.fulfillmentType, imageUrl: form.imageUrl.trim(), featured: form.featured, status: bodyStatus };
    const api = createEcommerceApi(data.store.companyId);
    const saved = modal === 'new'
      ? await run(() => api.createProduct(body), savingDigitalDraft ? 'Produit numérique enregistré en brouillon. Ajoutez le fichier pour le publier.' : 'Produit ajouté au catalogue.')
      : modal
        ? await run(() => api.updateProduct(modal.id, body), 'Produit mis à jour.')
        : undefined;
    if (!saved) return;
    const savedProduct = saved as EcommerceProduct;
    if (form.imageFile) {
      await run(() => api.uploadProductImage(savedProduct.id, form.imageFile as File), 'Produit et photo enregistrés.');
    }
    if (form.galleryFiles.length > 0) {
      await run(() => api.uploadProductGallery(savedProduct.id, form.galleryFiles), 'Galerie du produit enregistrée.');
    }
    if (form.digitalFile) {
      const uploaded = await run(() => api.uploadDigitalFile(savedProduct.id, form.digitalFile as File), 'Produit numérique et fichier enregistrés.');
      if (!uploaded) return;
      if (requestedStatus === 'PUBLISHED' && bodyStatus !== 'PUBLISHED') {
        const published = await run(() => api.updateProduct(savedProduct.id, { status: 'PUBLISHED' }), 'Produit numérique publié.');
        if (!published) return;
      }
    }
    setModal(null);
  };
  const archive = async (product: EcommerceProduct) => {
    if (!await confirm({ title: 'Archiver ce produit ?', description: `« ${product.name} » ne sera plus proposé dans le catalogue actif.`, confirmLabel: 'Archiver', tone: 'danger' })) return;
    await run(() => createEcommerceApi(data.store.companyId).archiveProduct(product.id), 'Produit archivé.');
  };
  return <div className="space-y-5 fade-up">
    <Panel title="Catalogue en ligne" description="Organisez les références qui alimentent directement votre vitrine." action={canCreateProduct ? <button type="button" onClick={openNewProduct} className="btn inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} />Ajouter un produit</button> : undefined}>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher par nom, référence ou catégorie" className="w-full rounded-lg border bg-transparent py-2.5 pl-9 pr-3 text-sm" /></label><select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm"><option value="ALL">Tous les statuts</option><option value="PUBLISHED">Publié</option><option value="DRAFT">Brouillon</option><option value="ARCHIVED">Archivé</option></select></div>
         {filtered.length === 0 ? <Empty icon={Package} title={query || status !== 'ALL' ? 'Aucun produit trouvé' : 'Votre catalogue est vide'} text={query || status !== 'ALL' ? 'Modifiez vos filtres pour retrouver une référence.' : 'Ajoutez votre première référence pour commencer à vendre en ligne.'} action={canCreateProduct && !query ? <button type="button" onClick={openNewProduct} className="text-xs font-bold text-[hsl(var(--primary))]">Ajouter un produit</button> : undefined} /> : <div className="table-scroll"><table className="w-full text-left text-sm"><thead><tr><th className="px-4">Produit</th><th className="px-4">Référence</th><th className="px-4">Prix</th><th className="px-4">Stock</th><th className="px-4">Statut</th><th className="px-4">Actions</th></tr></thead><tbody className="divide-y">{filtered.map(product => <tr key={product.id}><td className="px-4 py-3"><div className="flex items-center gap-3">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Package size={17} /></span>}<span className="min-w-0"><strong className="block truncate">{product.name}</strong><small className="text-xs text-[hsl(var(--muted-foreground))]">{product.category}{product.featured ? ' · Vedette' : ''}</small></span></div></td><td className="mono px-4 py-3 text-xs">{product.sku}</td><td className="px-4 py-3 font-bold">{money(product.price, data.store.currency)}</td><td className={`px-4 py-3 font-bold ${product.stock <= 5 ? 'text-[hsl(var(--destructive))]' : ''}`}>{product.stock}</td><td className="px-4 py-3"><StatusPill value={product.status} /></td><td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-1.5">{canModify && product.status !== 'ARCHIVED' && <button type="button" title="Modifier" aria-label={`Modifier ${product.name}`} onClick={() => open(product)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold hover:bg-[hsl(var(--muted))]"><Pencil size={13} />Modifier</button>}{canModify && product.status !== 'ARCHIVED' && <button type="button" title="Archiver" aria-label={`Archiver ${product.name}`} onClick={() => void archive(product)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))]"><Archive size={13} />Archiver</button>}</div></td></tr>)}</tbody></table></div>}
    </Panel>
     {chooserOpen && <Modal title="Choisir le type de produit" onClose={() => setChooserOpen(false)}><div className={`grid gap-3 ${canSellPhysical && canSellDigital ? 'sm:grid-cols-2' : ''}`}>{canSellPhysical && <button type="button" onClick={() => open(undefined, 'PHYSICAL')} className="rounded-2xl border p-5 text-left transition hover:border-[hsl(var(--primary))]"><Package size={25} className="text-[hsl(var(--primary))]" /><strong className="mt-3 block">Produit physique</strong><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">Gérez le stock, la livraison et la vente d’un article matériel.</span></button>}{canSellDigital && <button type="button" onClick={() => open(undefined, 'DIGITAL')} className="rounded-2xl border p-5 text-left transition hover:border-[hsl(var(--primary))]"><ArrowDownToLine size={25} className="text-[hsl(var(--primary))]" /><strong className="mt-3 block">Produit numérique</strong><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">Joignez un fichier privé, délivré uniquement après paiement confirmé.</span></button>}</div></Modal>}
      {modal && <ProductModal modal={modal} form={form} categories={data.categories} setForm={setForm} onClose={() => setModal(null)} onSave={save} onRemoveGallery={async url => {
        const imageId = url.split('/').pop();
        if (!imageId || !url.includes('/api/gallery-images/') || modal === 'new') return;
        const result = await run(() => createEcommerceApi(data.store.companyId).deleteProductGalleryImage(modal.id, imageId), 'Image supprimée de la galerie.');
        if (result) setForm(current => ({ ...current, galleryUrls: current.galleryUrls.filter(item => item !== url) }));
      }} />}
  </div>;
}

 function ProductModal({ modal, form, categories, setForm, onClose, onSave, onRemoveGallery }: { modal: EcommerceProduct | 'new'; form: ProductForm; categories: EcommerceCategory[]; setForm: (value: ProductForm) => void; onClose: () => void; onSave: (event: FormEvent) => void; onRemoveGallery: (url: string) => void }) {
  const patch = (updates: Partial<ProductForm>) => setForm({ ...form, ...updates });
  const [, setSlugManuallyEdited] = useState(modal !== 'new');
  const changeName = (value: string) => patch({ name: value, ...(modal === 'new' ? { slug: slugify(value) } : {}) });
  return <Modal large title={modal === 'new' ? (form.fulfillmentType === 'DIGITAL' ? 'Nouveau produit numérique' : 'Nouveau produit physique') : `Modifier ${modal.name}`} onClose={onClose}>
    <form onSubmit={onSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du produit" required value={form.name} onChange={changeName} placeholder="Ex. Sacoche Atlas" />
        <Field label="Référence SKU" required value={form.sku} onChange={value => patch({ sku: value })} placeholder="ATLAS-001" />
        <label className="block text-xs font-bold">Catégorie
          <select value={form.categoryId} onChange={event => { const categoryId = event.target.value; const category = categories.find(item => item.id === categoryId); patch({ categoryId, category: category?.name ?? form.category }); }} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="">Sans catégorie</option>{categories.filter(category => category.isActive).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        </label>
        <Field label="Slug public (optionnel)" value={form.slug} onChange={value => { setSlugManuallyEdited(true); patch({ slug: value }); }} placeholder="généré automatiquement si vide" />
        <Field label="Prix de vente" required type="number" value={form.price} onChange={value => patch({ price: value })} placeholder="0" />
        <Field label="Prix barré" type="number" value={form.compareAtPrice} onChange={value => patch({ compareAtPrice: value })} placeholder="Optionnel" />
         {form.fulfillmentType === 'PHYSICAL' ? <Field label="Stock disponible" required type="number" value={form.stock} onChange={value => patch({ stock: value })} placeholder="0" /> : <div className="rounded-lg border border-[hsl(var(--primary)/.24)] bg-[hsl(var(--primary)/.06)] px-3 py-2.5 text-xs"><strong className="block">Vente numérique</strong><span className="mt-1 block text-[hsl(var(--muted-foreground))]">Le stock physique n’est pas décrémenté. Une unité est réservée par commande.</span></div>}
         {form.fulfillmentType === 'DIGITAL' ? <label className="block text-xs font-bold">Fichier numérique<input type="file" accept={digitalFileAccept} onChange={event => { const file = event.target.files?.[0] ?? null; patch({ digitalFile: file, digitalFileName: file?.name ?? form.digitalFileName }); }} className="mt-1.5 block w-full rounded-lg border px-3 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(var(--muted))] file:px-2.5 file:py-1.5 file:text-xs file:font-bold" /><span className="mt-1 block text-[11px] font-normal leading-5 text-[hsl(var(--muted-foreground))]">Vidéo, musique, PDF, Word ou PowerPoint · 1 Go maximum · requis pour publier. Un brouillon peut être enregistré avant l’ajout du fichier.</span>{form.digitalFileName && <span className="mt-1 block truncate text-[11px] font-semibold text-[hsl(var(--primary))]">{form.digitalFileName}</span>}</label> : null}
         <label className="block text-xs font-bold sm:col-span-2">Images du produit<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => { const files = Array.from(event.target.files ?? []); patch({ imageFile: files[0] ?? null, galleryFiles: files.slice(1) }); }} className="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(var(--muted))] file:px-2.5 file:py-1.5 file:text-xs file:font-bold" /><span className="mt-1 block text-[11px] font-normal text-[hsl(var(--muted-foreground))]">Le premier fichier devient l’image principale ; les suivants sont ajoutés à la galerie. Les images déjà enregistrées sont conservées.</span>{form.imageFile && <span className="mt-1 block truncate text-[11px] font-semibold text-[hsl(var(--primary))]">Image principale : {form.imageFile.name}{form.galleryFiles.length > 0 ? ` · ${form.galleryFiles.length} autre(s) ajoutée(s)` : ''}</span>}{form.imageUrl && !form.imageFile && <img src={form.imageUrl} alt="" className="mt-2 h-16 w-16 rounded-lg object-cover" />}</label>
      </div>
        <label className="block text-xs font-bold">Galerie déjà enregistrée
         {form.galleryUrls.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{form.galleryUrls.map(url => <span key={url} className="relative"><img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" /><button type="button" onClick={() => onRemoveGallery(url)} className="absolute -right-1 -top-1 rounded-full bg-[hsl(var(--destructive))] px-1.5 py-0.5 text-[10px] font-bold text-white" aria-label="Supprimer cette image">×</button></span>)}</div>}
       </label>
       <label className="block text-xs font-bold">Description<textarea value={form.description} onChange={event => patch({ description: event.target.value })} rows={3} placeholder="Quelques mots utiles pour l’acheteur ou le locataire..." className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold">Statut<select value={form.status} onChange={event => patch({ status: event.target.value as ProductForm['status'] })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option></select></label><label className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-xs font-bold"><input type="checkbox" checked={form.featured} onChange={event => patch({ featured: event.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />Mettre en avant dans la boutique</label></div>
      <div className="modal-footer flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler</button><button type="submit" className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Check className="mr-1 inline" size={14} />Enregistrer</button></div>
    </form>
  </Modal>;
}

function CategoryManager({ data, canCreate, canModify, run }: { data: EcommerceBootstrap; canCreate: boolean; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const { confirm } = useAppDialog();
  const [editing, setEditing] = useState<EcommerceCategory | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', isActive: true, sortOrder: 0 });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const open = (category?: EcommerceCategory) => {
    setEditing(category ?? 'new');
    setSlugManuallyEdited(Boolean(category));
    setForm(category
      ? { name: category.name, slug: category.slug, description: category.description, isActive: category.isActive, sortOrder: category.sortOrder }
      : { name: '', slug: '', description: '', isActive: true, sortOrder: data.categories.length });
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const body = { ...form, name: form.name.trim(), slug: slugify(form.slug || form.name), description: form.description.trim() };
    const result = editing === 'new'
      ? await run(() => createEcommerceApi(data.store.companyId).createCategory(body), 'Catégorie créée.')
      : editing ? await run(() => createEcommerceApi(data.store.companyId).updateCategory(editing.id, body), 'Catégorie mise à jour.') : undefined;
    if (result) setEditing(null);
  };
  const remove = async (category: EcommerceCategory) => {
    if (!await confirm({ title: 'Supprimer cette catégorie ?', description: `Les produits seront conservés sans catégorie : « ${category.name} ».`, confirmLabel: 'Supprimer', tone: 'danger' })) return;
    await run(() => createEcommerceApi(data.store.companyId).deleteCategory(category.id), 'Catégorie supprimée.');
  };
     return <div className="space-y-5 fade-up">
    <Panel title="Catégories" description="Structurez le catalogue avec des catégories réutilisables et persistantes." action={canCreate ? <button type="button" onClick={() => open()} className="btn inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} />Ajouter une catégorie</button> : undefined}>
      {data.categories.length === 0 ? <Empty icon={Tags} title="Aucune catégorie" text="Créez une catégorie pour mieux organiser vos produits." /> : <div className="table-scroll"><table className="w-full text-left text-sm"><thead><tr><th className="px-4">Nom</th><th className="px-4">Slug</th><th className="px-4">Ordre</th><th className="px-4">Statut</th><th className="px-4">Actions</th></tr></thead><tbody className="divide-y">{data.categories.map(category => <tr key={category.id}><td className="px-4 py-3 font-bold">{category.name}</td><td className="mono px-4 py-3 text-xs">{category.slug}</td><td className="px-4 py-3">{category.sortOrder}</td><td className="px-4 py-3">{category.isActive ? 'Active' : 'Inactive'}</td><td className="px-4 py-3"><div className="flex gap-2">{canModify && <button type="button" onClick={() => open(category)} className="rounded-lg border px-2.5 py-2 text-xs font-bold"><Pencil size={13} className="mr-1 inline" />Modifier</button>}{canModify && <button type="button" onClick={() => void remove(category)} className="rounded-lg border px-2.5 py-2 text-xs font-bold text-[hsl(var(--destructive))]">Supprimer</button>}</div></td></tr>)}</tbody></table></div>}
    </Panel>
     {editing && <Modal title={editing === 'new' ? 'Nouvelle catégorie' : 'Modifier la catégorie'} onClose={() => setEditing(null)}><form onSubmit={save} className="space-y-4"><Field label="Nom" required value={form.name} onChange={value => setForm({ ...form, name: value, ...(!slugManuallyEdited ? { slug: slugify(value) } : {}) })} placeholder="Ex. Accessoires" /><Field label="Slug" value={form.slug} onChange={value => { setSlugManuallyEdited(true); setForm({ ...form, slug: value }); }} placeholder="généré automatiquement" /><label className="block text-xs font-bold">Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} rows={3} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><div className="grid gap-3 sm:grid-cols-2"><Field label="Ordre" type="number" value={String(form.sortOrder)} onChange={value => setForm({ ...form, sortOrder: Math.max(0, Number(value) || 0) })} /><label className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold"><input type="checkbox" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} />Catégorie active</label></div><div className="modal-footer flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler</button><button type="submit" className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">Enregistrer</button></div></form></Modal>}
  </div>;
}

function Orders({ data, canModify, run }: { data: EcommerceBootstrap; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | EcommerceOrderStatus>('ALL');
  const allOrders = Array.isArray(data.orders) ? data.orders : [];
  const orders = allOrders.filter(order => (filter === 'ALL' || order.status === filter) && `${order.reference ?? ''} ${order.customerName ?? ''} ${order.customerEmail ?? ''}`.toLocaleLowerCase('fr-FR').includes(query.toLocaleLowerCase('fr-FR')));
  const changeStatus = (order: EcommerceOrder, status: EcommerceOrderStatus) => run(() => createEcommerceApi(data.store.companyId).updateOrderStatus(order.id, status), 'Statut de commande mis à jour.');
  return <div className="space-y-5 fade-up"><Panel title="Commandes" description="Suivez chaque vente, du premier clic à la livraison."><div className="mb-5 flex flex-col gap-3 lg:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher par référence, nom ou e-mail" className="w-full rounded-lg border bg-transparent py-2.5 pl-9 pr-3 text-sm" /></label><select value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm"><option value="ALL">Tous les statuts</option>{orderStatuses.map(item => <option key={item} value={item}>{item}</option>)}</select></div>{orders.length === 0 ? <Empty icon={ClipboardList} title={allOrders.length ? 'Aucune commande trouvée' : 'Aucune commande pour le moment'} text={allOrders.length ? 'Modifiez votre recherche ou le filtre de statut.' : 'Les ventes de votre boutique apparaîtront ici dès la première vente.'} /> : <div className="table-scroll"><table className="w-full text-left text-sm"><thead><tr><th className="px-4">Commande</th><th className="px-4">Client</th><th className="px-4">Articles</th><th className="px-4">Total</th><th className="px-4">Statut</th><th className="px-4">Mise à jour</th></tr></thead><tbody className="divide-y">{orders.map(order => { const items = Array.isArray(order.items) ? order.items : []; return <tr key={order.id}><td className="px-4 py-4"><strong className="block">{order.reference}</strong><small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{dateLabel(order.createdAt)}</small></td><td className="px-4 py-4"><strong className="block">{order.customerName}</strong><small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{order.customerEmail}</small></td><td className="px-4 py-4 text-xs">{items.reduce((sum, item) => sum + item.quantity, 0)} article{items.length > 1 ? 's' : ''}</td><td className="px-4 py-4 font-bold">{money(order.total, data.store.currency)}</td><td className="px-4 py-4"><StatusPill value={order.status} /></td><td className="px-4 py-4">{canModify ? <select aria-label={`Changer le statut de ${order.reference}`} value={order.status} onChange={event => void changeStatus(order, event.target.value as EcommerceOrderStatus)} className="rounded-lg border bg-[hsl(var(--card))] px-2 py-2 text-xs font-bold">{allowedNextStatuses(order.status).map(item => <option key={item} value={item}>{item}</option>)}</select> : <span className="text-xs text-[hsl(var(--muted-foreground))]">Lecture seule</span>}</td></tr>; })}</tbody></table></div>}</Panel></div>;
}

function Clients({ data }: { data: EcommerceBootstrap }) {
  const clients = useMemo(() => {
    const map = new Map<string, { name: string; email: string; phone: string; orders: number; total: number; lastOrder: string }>();
    data.orders.forEach(order => {
      const key = order.customerEmail || order.customerName;
      const previous = map.get(key);
      map.set(key, { name: order.customerName, email: order.customerEmail, phone: order.customerPhone, orders: (previous?.orders ?? 0) + 1, total: (previous?.total ?? 0) + order.total, lastOrder: previous?.lastOrder && new Date(previous.lastOrder) > new Date(order.createdAt) ? previous.lastOrder : order.createdAt });
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [data.orders]);
  return <div className="space-y-5 fade-up"><Panel title="Clients" description="Une vue consolidée des acheteurs issus de votre boutique.">{clients.length === 0 ? <Empty icon={Users} title="Votre fichier client est vide" text="Les coordonnées apparaîtront automatiquement après les premières commandes." /> : <div className="table-scroll"><table className="w-full text-left text-sm"><thead><tr><th className="px-4">Client</th><th className="px-4">Contact</th><th className="px-4">Commandes</th><th className="px-4">Valeur cumulée</th><th className="px-4">Dernière commande</th></tr></thead><tbody className="divide-y">{clients.map(client => <tr key={client.email || client.name}><td className="px-4 py-4 font-bold">{client.name}</td><td className="px-4 py-4"><span className="block text-xs">{client.email || 'E-mail non renseigné'}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{client.phone || 'Téléphone non renseigné'}</span></td><td className="px-4 py-4">{client.orders}</td><td className="px-4 py-4 font-bold">{money(client.total, data.store.currency)}</td><td className="px-4 py-4 text-xs text-[hsl(var(--muted-foreground))]">{dateLabel(client.lastOrder)}</td></tr>)}</tbody></table></div>}</Panel></div>;
}

function Promotions() {
  return <div className="fade-up"><Panel title="Promotions" description="Préparez vos temps forts commerciaux sans perdre de vue la cohérence de votre catalogue."><div className="mx-auto max-w-2xl py-8 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Megaphone size={24} /></span><h2 className="mt-5 text-xl font-bold">Les promotions arrivent dans votre cockpit</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">Cette vue est prête pour vos futures campagnes. En attendant, gérez vos prix et vos prix barrés directement depuis le catalogue.</p></div></Panel></div>;
}

function Deliveries({ data, canCreate, canModify, run }: { data: EcommerceBootstrap; canCreate: boolean; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const shipments = data.orders.filter(order => !['NOUVELLE', 'CONFIRMÉE', 'ANNULÉE'].includes(order.status));
  const change = (order: EcommerceOrder, status: EcommerceOrderStatus) => run(() => createEcommerceApi(data.store.companyId).updateOrderStatus(order.id, status), 'Flux de livraison mis à jour.');
  const changeRequest = (request: EcommerceDeliveryRequest, status: EcommerceDeliveryRequestStatus) => run(() => createEcommerceApi(data.store.companyId).updateDeliveryRequestStatus(request.id, status), 'Demande de livraison mise à jour.');
  return <div className="space-y-5 fade-up">
     <DeliveryZoneManager data={data} canCreate={canCreate} canModify={canModify} run={run} />
    <Panel title="Demandes de services" description="Les clients peuvent demander une livraison même sans panier.">
       {data.deliveryRequests.length === 0 ? <Empty icon={Truck} title="Aucune demande de livraison" text="Les demandes déposées depuis la vitrine apparaîtront ici." /> : <div className="grid gap-3 md:grid-cols-2">{data.deliveryRequests.map(request => <div key={request.id} className="rounded-xl border p-4 transition hover:border-[hsl(var(--primary)/.3)] hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="mono text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{request.reference}</p><h3 className="mt-1 font-bold">{request.requesterName}</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{request.requesterEmail} · {request.requesterPhone || 'Téléphone non renseigné'}</p></div><StatusPill value={request.status} /></div><p className="mt-3 text-sm">{request.address}</p>{request.deliveryZoneName && <p className="mt-2 text-xs font-bold text-[hsl(var(--primary))]">Zone : {request.deliveryZoneName}{request.deliveryZoneFee ? ` · ${money(request.deliveryZoneFee, data.store.currency)}` : ''}</p>}<p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{request.serviceType === 'URGENT' ? 'Demande urgente' : 'Livraison standard'}{request.desiredDate ? ` · souhaitée le ${dateLabel(request.desiredDate)}` : ''}</p>{request.note && <p className="mt-2 rounded-lg bg-[hsl(var(--muted)/.45)] p-2 text-xs">{request.note}</p>}<div className="mt-4 flex items-center justify-between gap-3 border-t pt-3"><span className="text-xs text-[hsl(var(--muted-foreground))]">{dateLabel(request.createdAt)}</span>{canModify && <select aria-label={`Changer le statut de ${request.reference}`} value={request.status} onChange={event => void changeRequest(request, event.target.value as EcommerceDeliveryRequestStatus)} className="rounded-lg border bg-[hsl(var(--card))] px-2 py-2 text-xs font-bold">{(['DEMANDEE', 'CONFIRMEE', 'EN_COURS', 'LIVREE', 'ANNULEE'] as EcommerceDeliveryRequestStatus[]).map(item => <option key={item} value={item}>{item}</option>)}</select>}</div></div>)}</div>}
    </Panel>
    <Panel title="Livraisons de commandes" description="Le flux des commandes qui ont quitté le bureau pour rejoindre vos clients.">
      {shipments.length === 0 ? <Empty icon={Truck} title="Aucune livraison de commande en cours" text="Les commandes en préparation et expédiées seront suivies ici." /> : <div className="grid gap-3 md:grid-cols-2">{shipments.map(order => <div key={order.id} className="rounded-xl border p-4 transition hover:border-[hsl(var(--primary)/.3)] hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="mono text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{order.reference}</p><h3 className="mt-1 font-bold">{order.customerName}</h3></div><StatusPill value={order.status} /></div><p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{order.shippingAddress || 'Adresse de livraison non renseignée'}</p><div className="mt-4 flex items-center justify-between gap-3 border-t pt-3"><span className="text-xs font-bold">{money(order.total, data.store.currency)}</span>{canModify && <select aria-label={`Avancer la livraison ${order.reference}`} value={order.status} onChange={event => void change(order, event.target.value as EcommerceOrderStatus)} className="rounded-lg border bg-[hsl(var(--card))] px-2 py-2 text-xs font-bold">{orderStatuses.filter(item => !['NOUVELLE', 'ANNULÉE'].includes(item)).map(item => <option key={item} value={item}>{item}</option>)}</select>}</div></div>)}</div>}
    </Panel>
  </div>;
}

type DeliveryZoneForm = {
  name: string;
  description: string;
  fee: number;
  estimatedMinutes: number;
  isActive: boolean;
  sortOrder: number;
};

function DeliveryZoneManager({ data, canCreate, canModify, run }: { data: EcommerceBootstrap; canCreate: boolean; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const { confirm } = useAppDialog();
  const [editing, setEditing] = useState<EcommerceDeliveryZone | 'new' | null>(null);
  const [form, setForm] = useState<DeliveryZoneForm>({ name: '', description: '', fee: 0, estimatedMinutes: 0, isActive: true, sortOrder: data.deliveryZones.length });
  const open = (zone?: EcommerceDeliveryZone) => {
    setEditing(zone ?? 'new');
    setForm(zone
      ? { name: zone.name, description: zone.description, fee: zone.fee, estimatedMinutes: zone.estimatedMinutes, isActive: zone.isActive, sortOrder: zone.sortOrder }
      : { name: '', description: '', fee: 0, estimatedMinutes: 0, isActive: true, sortOrder: data.deliveryZones.length });
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const body = { ...form, name: form.name.trim(), description: form.description.trim() };
    const result = editing === 'new'
      ? await run(() => createEcommerceApi(data.store.companyId).createDeliveryZone(body), 'Zone de livraison créée.')
      : editing ? await run(() => createEcommerceApi(data.store.companyId).updateDeliveryZone(editing.id, body), 'Zone de livraison mise à jour.') : undefined;
    if (result) setEditing(null);
  };
  const remove = async (zone: EcommerceDeliveryZone) => {
    if (!await confirm({ title: 'Supprimer cette zone ?', description: `Les anciennes demandes conserveront leur historique : « ${zone.name} ».`, confirmLabel: 'Supprimer', tone: 'danger' })) return;
    await run(() => createEcommerceApi(data.store.companyId).deleteDeliveryZone(zone.id), 'Zone de livraison supprimée.');
  };
  const duration = (minutes: number) => minutes <= 0 ? 'À confirmer' : minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;

  return <Panel title="Zones de livraison" description="Définissez les secteurs desservis et les frais affichés aux clients." action={canCreate ? <button type="button" onClick={() => open()} className="btn inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} />Ajouter une zone</button> : undefined}>
    {data.deliveryZones.length === 0 ? <Empty icon={Truck} title="Aucune zone configurée" text="Créez une zone pour permettre aux clients de choisir leur secteur de livraison." action={canCreate ? <button type="button" onClick={() => open()} className="text-xs font-bold text-[hsl(var(--primary))]">Créer la première zone</button> : undefined} /> : <div className="grid gap-3 md:grid-cols-2">{data.deliveryZones.map(zone => <article key={zone.id} className={`rounded-xl border p-4 ${zone.isActive ? '' : 'opacity-60'}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{zone.name}</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{zone.description || 'Aucune précision'}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${zone.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{zone.isActive ? 'Active' : 'Inactive'}</span></div><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-lg bg-[hsl(var(--muted)/.55)] px-2.5 py-1.5">{zone.fee > 0 ? money(zone.fee, data.store.currency) : 'Gratuit'}</span><span className="rounded-lg bg-[hsl(var(--muted)/.55)] px-2.5 py-1.5">{duration(zone.estimatedMinutes)}</span></div>{canModify && <div className="mt-4 flex gap-2 border-t pt-3"><button type="button" onClick={() => open(zone)} className="rounded-lg border px-2.5 py-2 text-xs font-bold"><Pencil size={13} className="mr-1 inline" />Modifier</button><button type="button" onClick={() => void remove(zone)} className="rounded-lg border px-2.5 py-2 text-xs font-bold text-[hsl(var(--destructive))]"><Archive size={13} className="mr-1 inline" />Supprimer</button></div>}</article>)}</div>}
    {editing && <Modal title={editing === 'new' ? 'Nouvelle zone de livraison' : `Modifier ${editing.name}`} onClose={() => setEditing(null)}><form onSubmit={save} className="space-y-4"><Field label="Nom de la zone" required value={form.name} onChange={value => setForm({ ...form, name: value })} placeholder="Ex. Dakar centre" /><label className="block text-xs font-bold">Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} rows={2} placeholder="Quartiers, communes ou repères desservis" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><div className="grid gap-4 sm:grid-cols-2"><Field label={`Frais (${data.store.currency})`} type="number" value={String(form.fee)} onChange={value => setForm({ ...form, fee: Math.max(0, Number(value) || 0) })} /><Field label="Délai indicatif (minutes)" type="number" value={String(form.estimatedMinutes)} onChange={value => setForm({ ...form, estimatedMinutes: Math.max(0, Number(value) || 0) })} /><Field label="Ordre d’affichage" type="number" value={String(form.sortOrder)} onChange={value => setForm({ ...form, sortOrder: Math.max(0, Number(value) || 0) })} /><label className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold"><input type="checkbox" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} />Zone active</label></div><div className="modal-footer flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler</button><button type="submit" className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">Enregistrer</button></div></form></Modal>}
  </Panel>;
}

function HomePanel({ store, canModify, run }: { store: EcommerceStore; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const [heroFiles, setHeroFiles] = useState<File[]>([]);
  const api = createEcommerceApi(store.companyId);
  const remainingSlots = Math.max(0, 12 - store.heroImages.length);

  const upload = async () => {
    if (heroFiles.length === 0 || !canModify) return;
    const result = await run(() => api.uploadStoreHeroImages(heroFiles), 'Images de l’accueil ajoutées.');
    if (result) setHeroFiles([]);
  };

  const remove = (url: string) => {
    const imageId = url.split('/').pop();
    if (imageId) void run(() => api.deleteStoreHeroImage(imageId), 'Image supprimée de l’accueil.');
  };

  return <div className="space-y-5 fade-up">
    <Panel title="Accueil de la boutique" description="Ajoutez les images qui s’affichent dans la bannière de votre accueil public.">
      <div className="max-w-4xl space-y-5">
        <div className="rounded-2xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.05)] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold"><ImagePlus size={17} className="text-[hsl(var(--primary))]" />Images de la bannière</div>
              <p className="mt-1.5 max-w-xl text-xs leading-5 text-[hsl(var(--muted-foreground))]">Sélectionnez une ou plusieurs images. Elles seront ajoutées à celles déjà présentes et défileront horizontalement sur l’accueil public.</p>
            </div>
            <span className="shrink-0 rounded-full bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold">{store.heroImages.length}/12 images</span>
          </div>
          <label className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition ${!canModify || remainingSlots === 0 ? 'cursor-not-allowed opacity-50' : 'border-[hsl(var(--primary)/.35)] hover:bg-[hsl(var(--primary)/.06)]'}`}>
            <ImagePlus size={24} className="text-[hsl(var(--primary))]" />
            <span className="mt-2 text-sm font-bold">{remainingSlots === 0 ? 'Limite de 12 images atteinte' : 'Ajouter des images à l’accueil'}</span>
            <span className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{remainingSlots > 0 ? `Jusqu’à ${remainingSlots} image(s) supplémentaire(s) · JPG, PNG ou WebP` : 'Supprimez une image pour en ajouter une nouvelle.'}</span>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={!canModify || remainingSlots === 0} onChange={event => setHeroFiles(Array.from(event.target.files ?? []).slice(0, remainingSlots))} className="sr-only" />
          </label>
          {heroFiles.length > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5"><p className="text-xs font-semibold text-[hsl(var(--primary))]">{heroFiles.length} nouvelle(s) image(s) sélectionnée(s)</p><button type="button" onClick={() => void upload()} disabled={!canModify} className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50"><Check size={14} />Enregistrer les images</button></div>}
        </div>
        {store.heroImages.length > 0
          ? <div><p className="text-xs font-bold">Images actuellement affichées</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{store.heroImages.map((url, index) => <div key={url} className="group relative overflow-hidden rounded-xl border bg-[hsl(var(--muted)/.25)]"><img src={url} alt={`Image d’accueil ${index + 1}`} className="aspect-[4/3] w-full object-cover" /><button type="button" disabled={!canModify} onClick={() => remove(url)} className="absolute right-2 top-2 rounded-full bg-[hsl(var(--destructive))] px-2 py-1 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Supprimer l’image d’accueil ${index + 1}`}>×</button></div>)}</div></div>
          : <div className="rounded-xl border border-dashed px-5 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune image personnalisée. L’accueil public utilise actuellement son visuel par défaut.</div>}
      </div>
    </Panel>
  </div>;
}

function SettingsPanel({ store, domains, canModify, run }: { store: EcommerceStore; domains: EcommerceDomain[]; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const [form, setForm] = useState({
    name: store.name,
    slug: store.slug,
    description: store.description,
    status: store.status,
    currency: store.currency,
    primaryColor: store.primaryColor,
    accentColor: store.accentColor,
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFiles, setHeroFiles] = useState<File[]>([]);
  const api = createEcommerceApi(store.companyId);
  useEffect(() => {
    setForm({
      name: store.name,
      slug: store.slug,
      description: store.description,
      status: store.status,
      currency: store.currency,
      primaryColor: store.primaryColor,
       accentColor: store.accentColor,
    });
    setSlugManuallyEdited(false);
    setLogoFile(null);
    setHeroFiles([]);
  }, [store]);
  const patch = (updates: Partial<typeof form>) => setForm(current => ({ ...current, ...updates }));
  const publicBasePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const publicUrl = `${window.location.origin}${publicBasePath}/shop/${encodeURIComponent(slugify(form.slug || form.name) || 'boutique')}`;
  const save = (event: FormEvent) => {
    event.preventDefault();
    const selectedLogo = logoFile;
    const selectedHeroFiles = heroFiles;
    void run(async () => {
      await api.updateStore(form);
      if (selectedLogo) await api.uploadStoreLogo(selectedLogo);
      if (selectedHeroFiles.length > 0) await api.uploadStoreHeroImages(selectedHeroFiles);
    }, selectedLogo || selectedHeroFiles.length > 0 ? 'Paramètres et images de la boutique enregistrés.' : 'Paramètres de la boutique enregistrés.');
  };
  const copyPublicUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const addDomain = (event: FormEvent) => {
    event.preventDefault();
    const domain = domainInput.trim();
    if (!domain) return;
    void run(() => createEcommerceApi(store.companyId).createDomain(domain), 'Domaine ajouté. Configurez le DNS puis lancez la vérification.');
    setDomainInput('');
  };
  const verifyDomain = (domain: EcommerceDomain) => {
    void run(() => createEcommerceApi(store.companyId).verifyDomain(domain.id), `Domaine ${domain.domain} vérifié.`);
  };
  const removeDomain = (domain: EcommerceDomain) => {
    void run(() => createEcommerceApi(store.companyId).deleteDomain(domain.id), 'Domaine retiré de la boutique.');
  };
  return <div className="space-y-5 fade-up">
    <Panel title="Paramètres de la boutique" description="Ces informations structurent votre vitrine publique et votre expérience d’achat.">
      <form onSubmit={save} className="max-w-3xl space-y-5">
         <div className="grid gap-4 sm:grid-cols-2"><Field label="Nom de la boutique" required value={form.name} onChange={value => patch({ name: value, ...(slugManuallyEdited ? {} : { slug: slugify(value) }) })} disabled={!canModify} /><Field label="Adresse publique (slug)" required value={form.slug} onChange={value => { setSlugManuallyEdited(true); patch({ slug: value }); }} disabled={!canModify} /><label className="block text-xs font-bold">Logo de la boutique<div className="mt-1.5 flex items-center gap-3 rounded-lg border px-3 py-2.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--muted))]">{store.logoUrl ? <img src={store.logoUrl} alt={`Logo de ${store.name}`} className="h-full w-full object-contain" /> : <Store size={16} className="text-[hsl(var(--muted-foreground))]" />}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={!canModify} onChange={event => setLogoFile(event.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-xs" /></div>{logoFile && <span className="mt-1 block truncate text-[11px] font-normal text-[hsl(var(--muted-foreground))]">{logoFile.name}</span>}</label><label className="block text-xs font-bold">Devise<select disabled={!canModify} value={form.currency} onChange={event => patch({ currency: event.target.value as EcommerceStore['currency'] })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="XOF">XOF — Franc CFA</option><option value="EUR">EUR — Euro</option><option value="USD">USD — Dollar américain</option></select></label><label className="block text-xs font-bold">Statut de la boutique<select disabled={!canModify} value={form.status} onChange={event => patch({ status: event.target.value as EcommerceStore['status'] })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publiée</option><option value="SUSPENDED">Suspendue</option></select></label></div>
        <div className="rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.04)] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-xs font-bold">Lien public de la boutique<input readOnly value={publicUrl} className="mt-1.5 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))]" /></label><div className="flex gap-2"><button type="button" onClick={() => void copyPublicUrl()} className="btn inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold"><Copy size={14} />{copied ? 'Copié' : 'Copier'}</button><a href={publicUrl} target="_blank" rel="noreferrer" className="btn inline-flex items-center rounded-lg border px-3 py-2.5 text-xs font-bold">Ouvrir</a></div></div><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Ce lien se met à jour avec le nom ou le slug de la boutique. La vitrine sera accessible publiquement lorsqu’elle sera publiée.</p></div>
        <label className="block text-xs font-bold">Description publique<textarea disabled={!canModify} value={form.description} onChange={event => patch({ description: event.target.value })} rows={4} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>
         <div className="rounded-xl border p-4">
           <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold">Images de la bannière d’accueil</p><p className="mt-1 text-[11px] font-normal leading-5 text-[hsl(var(--muted-foreground))]">Choisissez plusieurs images : elles défileront horizontalement dans l’accueil public.</p></div><span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">{store.heroImages.length}/12</span></div>
           <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={!canModify || store.heroImages.length >= 12} onChange={event => setHeroFiles(Array.from(event.target.files ?? []).slice(0, Math.max(0, 12 - store.heroImages.length)))} className="mt-3 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(var(--muted))] file:px-2.5 file:py-1.5 file:text-xs file:font-bold" />
           {heroFiles.length > 0 && <p className="mt-1 text-[11px] font-semibold text-[hsl(var(--primary))]">{heroFiles.length} nouvelle(s) image(s) sélectionnée(s)</p>}
           {store.heroImages.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{store.heroImages.map(url => <span key={url} className="relative"><img src={url} alt="" className="h-20 w-28 rounded-lg object-cover" /><button type="button" disabled={!canModify} onClick={() => { const imageId = url.split('/').pop(); if (imageId) void run(() => api.deleteStoreHeroImage(imageId), 'Image supprimée de la bannière.'); }} className="absolute right-1 top-1 rounded-full bg-[hsl(var(--destructive))] px-1.5 py-0.5 text-[10px] font-bold text-white disabled:opacity-50" aria-label="Supprimer cette image">×</button></span>)}</div>}
         </div>
        <div className="grid gap-4 sm:grid-cols-2"><ColorField label="Couleur principale" value={form.primaryColor} onChange={value => patch({ primaryColor: value })} disabled={!canModify} /><ColorField label="Couleur d’accent" value={form.accentColor} onChange={value => patch({ accentColor: value })} disabled={!canModify} /></div>
         <div className="flex flex-wrap justify-end gap-2 border-t pt-5"><button type="button" disabled={!canModify || !logoFile} onClick={() => { if (!logoFile) return; void run(() => createEcommerceApi(store.companyId).uploadStoreLogo(logoFile), 'Logo de la boutique enregistré.'); }} className="btn inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"><Store size={14} />Enregistrer le logo</button><button type="submit" disabled={!canModify} className="btn inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50"><Check size={14} />Enregistrer les paramètres</button></div>
      </form>
    </Panel>
     <Panel title="Domaine personnalisé" description="Connectez le domaine acheté par votre entreprise à cette boutique publique, avec HTTPS géré par Render.">
      <div className="space-y-5">
         <div className="rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.04)] p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
           <p className="font-bold text-[hsl(var(--foreground))]">Procédure de connexion</p>
           <p className="mt-1">Ajoutez d’abord le domaine dans la configuration Custom Domains de Render pour que le certificat HTTPS soit provisionné, puis renseignez ici le domaine et appliquez l’enregistrement DNS indiqué ci-dessous.</p>
           <p className="mt-1">Après propagation DNS et activation du certificat, cliquez sur « Vérifier ». La boutique doit rester publiée pour répondre sur ce domaine.</p>
         </div>
        <form onSubmit={addDomain} className="flex flex-col gap-3 sm:flex-row">
          <Field label="Nom de domaine" value={domainInput} onChange={setDomainInput} placeholder="boutique.exemple.sn" disabled={!canModify} />
          <button type="submit" disabled={!canModify || !domainInput.trim()} className="self-end rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50">Ajouter le domaine</button>
        </form>
         {domains.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-[hsl(var(--muted-foreground))]">Aucun domaine personnalisé n’est encore connecté.</p> : <div className="space-y-3">{domains.map(domain => <div key={domain.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong>{domain.domain}</strong><StatusPill value={domain.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING'} /></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{domain.status === 'ACTIVE' ? 'La boutique répond sur ce domaine après configuration de l’hébergement.' : 'En attente de la configuration DNS.'}</p></div><div className="flex gap-2"><button type="button" disabled={!canModify} onClick={() => verifyDomain(domain)} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50">Vérifier</button><button type="button" disabled={!canModify} onClick={() => removeDomain(domain)} className="rounded-lg border border-[hsl(var(--destructive)/.35)] px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))] disabled:opacity-50">Retirer</button></div></div><div className="mt-4 grid gap-3 rounded-lg bg-[hsl(var(--muted)/.35)] p-3 text-xs sm:grid-cols-2"><div><p className="font-bold">Enregistrement TXT de vérification</p><p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Nom : {domain.verificationName}</p><p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Valeur : {domain.verificationValue}</p></div><div><p className="font-bold">Cible DNS Render</p><p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Cible : {domain.targetHost}</p><p className="mt-1 text-[hsl(var(--muted-foreground))]">Pour un sous-domaine, configurez le CNAME demandé par Render vers cette cible. Pour un domaine racine, utilisez les enregistrements A/ANAME indiqués par Render. Ajoutez aussi le TXT ci-dessus si votre registrar le permet, attendez la propagation, puis cliquez sur Vérifier.</p></div></div>{domain.lastError && <p className="mt-3 text-xs text-[hsl(var(--destructive))]">{domain.lastError}</p>}</div>)}</div>}
      </div>
    </Panel>
  </div>;
}

function ColorField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  return <label className="block text-xs font-bold">{label}<div className="mt-1.5 flex gap-2"><input type="color" value={value || '#d8a21b'} onChange={event => onChange(event.target.value)} disabled={disabled} className="h-11 w-12 rounded-lg border p-1" /><input value={value} onChange={event => onChange(event.target.value)} disabled={disabled} className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm" placeholder="#D8A21B" /></div></label>;
}

function OrderRow({ order, currency }: { order: EcommerceOrder; currency: EcommerceStore['currency'] }) {
  return <div className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><ShoppingBag size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{order.reference} <span className="font-normal text-[hsl(var(--muted-foreground))]">· {order.customerName}</span></p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{dateLabel(order.createdAt)}</p></div><div className="text-right"><p className="text-sm font-bold">{money(order.total, currency)}</p><StatusPill value={order.status} /></div></div>;
}

function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="card-surface overflow-hidden rounded-2xl"><header className="section-heading border-b px-5 py-4 sm:px-6"><div><h2 className="font-bold">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{description}</p>}</div>{action}</header><div className="p-5 sm:p-6">{children}</div></section>;
}

function Metric({ label, value, detail, icon: Icon, accent, warning }: { label: string; value: string; detail: string; icon: typeof CircleDollarSign; accent?: boolean; warning?: boolean }) {
  return <div className={`metric-card card-surface rounded-xl p-4 ${accent ? 'border-[hsl(var(--primary)/.3)]' : ''}`}><div className="flex items-start justify-between gap-2"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${warning ? 'bg-[hsl(var(--accent)/.18)] text-[hsl(var(--foreground))]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}><Icon size={17} /></span><span className="mono text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Live</span></div><p className="mt-5 text-xs text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 text-2xl font-bold tracking-[-.04em]">{value}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}

function Insight({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-xl border bg-[hsl(var(--muted)/.25)] p-4"><p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}

function Empty({ icon: Icon, title, text, action }: { icon: typeof Package; title: string; text: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed bg-[hsl(var(--muted)/.18)] px-5 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Icon size={19} /></span><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-[hsl(var(--muted-foreground))]">{text}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function StatusPill({ value }: { value: string }) {
  const positive = ['PUBLISHED', 'LIVRÉE', 'Disponible'];
  const warning = ['DRAFT', 'NOUVELLE', 'CONFIRMÉE', 'EN PRÉPARATION'];
  const danger = ['ARCHIVED', 'ANNULÉE'];
  const tone = positive.includes(value) ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : warning.includes(value) ? 'bg-[hsl(var(--accent)/.16)] text-[hsl(var(--foreground))]' : danger.includes(value) ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]';
  return <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.06em] ${tone}`}>{value}</span>;
}

function Field({ label, value, onChange, placeholder, type = 'text', required, disabled }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; disabled?: boolean }) {
  if (label === 'Slug' || label === 'Slug public (optionnel)') {
    return <div className="rounded-lg border bg-[hsl(var(--muted)/.28)] px-3 py-2.5"><span className="block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Slug généré automatiquement</span><span className="mono mt-1 block truncate text-xs">{value || 'Sera créé à partir du nom'}</span></div>;
  }
  return <label className="block text-xs font-bold">{label}{required && <span className="ml-1 text-[hsl(var(--destructive))]">*</span>}<input required={required} disabled={disabled} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60" /></label>;
}

function Modal({ title, onClose, children, large = false }: { title: string; onClose: () => void; children: ReactNode; large?: boolean }) {
  return <div className="modal-backdrop fixed inset-0 z-40 flex items-center justify-center bg-[hsl(var(--foreground)/.4)] p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" className={`modal-panel card-surface w-full rounded-2xl p-5 fade-up sm:p-6 ${large ? 'max-h-[92vh] max-w-5xl overflow-y-auto sm:p-8' : 'max-w-2xl'}`}><header className="modal-header flex items-center justify-between gap-4"><h2 className="text-lg font-bold">{title}</h2><button type="button" aria-label="Fermer" onClick={onClose} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><X size={17} /></button></header><div className="modal-body pt-5">{children}</div></section></div>;
}