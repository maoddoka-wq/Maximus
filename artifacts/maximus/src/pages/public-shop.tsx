import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, ShoppingBag, Store, X } from 'lucide-react';
import { publicEcommerceApi, type EcommerceProduct, type PublicShopBootstrap } from '@/lib/ecommerce-api';

type CartLine = { product: EcommerceProduct; quantity: number };

const money = (value: number, currency: PublicShopBootstrap['store']['currency']) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: currency === 'XOF' ? 0 : 2 }).format(value) + ` ${currency}`;

export default function PublicShopPage({ slug }: { slug: string }) {
  const [data, setData] = useState<PublicShopBootstrap | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitted, setSubmitted] = useState<{ reference: string; total: number } | null>(null);
  const [form, setForm] = useState({ customerName: '', customerEmail: '', customerPhone: '', shippingAddress: '', note: '' });

  useEffect(() => {
    let cancelled = false;
    void publicEcommerceApi.bootstrap(slug)
      .then(result => { if (!cancelled) setData(result); })
      .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Boutique indisponible.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const total = useMemo(() => cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0), [cart]);
  const add = (product: EcommerceProduct) => setCart(current => {
    const existing = current.find(line => line.product.id === product.id);
    if (existing) return current.map(line => line.product.id === product.id ? { ...line, quantity: Math.min(product.stock, line.quantity + 1) } : line);
    return [...current, { product, quantity: 1 }];
  });
  const change = (productId: string, delta: number) => setCart(current => current.flatMap(line => {
    if (line.product.id !== productId) return [line];
    const quantity = line.quantity + delta;
    return quantity <= 0 ? [] : [{ ...line, quantity: Math.min(line.product.stock, quantity) }];
  }));
  const submit = async () => {
    if (!data || !form.customerName.trim() || !form.customerEmail.trim() || !form.shippingAddress.trim() || cart.length === 0) return;
    try {
      const order = await publicEcommerceApi.createOrder(slug, {
        ...form,
        items: cart.map(line => ({ productId: line.product.id, quantity: line.quantity })),
      });
      setSubmitted(order);
      setCart([]);
      setCheckoutOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La commande n’a pas pu être envoyée.');
    }
  };

  if (loading) return <div className="min-h-screen bg-[hsl(var(--background))] p-6"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-10 w-56 rounded bg-[hsl(var(--muted))]" /><div className="mt-8 h-56 rounded-3xl bg-[hsl(var(--muted))]" /></div></div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-6"><section className="card-surface max-w-md rounded-2xl p-8 text-center"><Store className="mx-auto text-[hsl(var(--primary))]" size={30} /><h1 className="mt-4 text-xl font-bold">Boutique indisponible</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{error}</p></section></div>;

  const { store, products } = data;
  return <div className="min-h-screen bg-[hsl(var(--background))]" style={{ '--shop-primary': store.primaryColor, '--shop-accent': store.accentColor } as React.CSSProperties}>
    <header className="border-b bg-[var(--shop-accent)] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--shop-primary)] text-[var(--shop-accent)]"><ShoppingBag size={21} /></span><div className="min-w-0"><p className="truncate text-lg font-bold">{store.name}</p><p className="truncate text-xs text-white/65">{store.description}</p></div></div>
        <button type="button" onClick={() => setCheckoutOpen(true)} className="relative rounded-xl bg-white/10 px-3 py-2.5 text-sm font-bold transition hover:bg-white/20"><ShoppingBag className="inline mr-2" size={16} />Panier{cart.length > 0 && <span className="ml-2 rounded-full bg-[var(--shop-primary)] px-2 py-0.5 text-xs text-[var(--shop-accent)]">{cart.reduce((sum, line) => sum + line.quantity, 0)}</span>}</button>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      {error && <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => setError('')}><X size={16} /></button></div>}
      {submitted ? <section className="mx-auto max-w-xl rounded-3xl border bg-[hsl(var(--card))] p-10 text-center shadow-sm"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={26} /></span><h1 className="mt-5 text-2xl font-bold">Commande confirmée</h1><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Merci pour votre commande. Votre référence est <strong className="text-[hsl(var(--foreground))]">{submitted.reference}</strong>.</p><p className="mt-4 text-lg font-bold" style={{ color: 'var(--shop-primary)' }}>{money(submitted.total, store.currency)}</p><button type="button" onClick={() => setSubmitted(null)} className="mt-7 rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Continuer mes achats</button></section> : <>
        <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.18em]" style={{ color: 'var(--shop-primary)' }}>Sélection de la boutique</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Trouvez ce qu’il vous faut.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Une sélection disponible en ligne, avec une commande simple et un suivi clair.</p></div>
        {products.length === 0 ? <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">La boutique prépare actuellement son catalogue.</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map(product => <article key={product.id} className="overflow-hidden rounded-2xl border bg-[hsl(var(--card))] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex aspect-[4/3] items-center justify-center bg-[hsl(var(--muted)/.35)]">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <ShoppingBag size={40} className="text-[hsl(var(--primary)/.55)]" />}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">{product.category}</p><h2 className="mt-1 font-bold">{product.name}</h2></div>{product.featured && <span className="rounded-full bg-[var(--shop-primary)]/15 px-2 py-1 text-[10px] font-bold" style={{ color: 'var(--shop-accent)' }}>À la une</span>}</div><p className="mt-3 min-h-10 text-sm leading-5 text-[hsl(var(--muted-foreground))]">{product.description || 'Une référence sélectionnée par votre boutique.'}</p><div className="mt-5 flex items-center justify-between gap-3"><div><p className="text-lg font-bold" style={{ color: 'var(--shop-accent)' }}>{money(product.price, store.currency)}</p>{product.compareAtPrice && product.compareAtPrice > product.price && <p className="text-xs text-[hsl(var(--muted-foreground))] line-through">{money(product.compareAtPrice, store.currency)}</p>}</div><button type="button" onClick={() => add(product)} className="rounded-xl px-3.5 py-2.5 text-xs font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Ajouter</button></div></div></article>)}</div>}
      </>}
    </main>
    {checkoutOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"><section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-[hsl(var(--card))] p-5 sm:rounded-3xl sm:p-7"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Votre panier</h2><button type="button" onClick={() => setCheckoutOpen(false)}><X size={19} /></button></div>{cart.length === 0 ? <p className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">Votre panier est vide.</p> : <><div className="mt-5 divide-y border-y">{cart.map(line => <div key={line.product.id} className="flex items-center gap-3 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{line.product.name}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{money(line.product.price, store.currency)}</p></div><div className="flex items-center gap-2 rounded-lg border px-2 py-1"><button type="button" onClick={() => change(line.product.id, -1)}><Minus size={14} /></button><span className="w-5 text-center text-sm font-bold">{line.quantity}</span><button type="button" onClick={() => change(line.product.id, 1)}><Plus size={14} /></button></div><p className="w-24 text-right text-sm font-bold">{money(line.product.price * line.quantity, store.currency)}</p></div>)}</div><div className="mt-5 flex items-center justify-between text-lg font-bold"><span>Total</span><span>{money(total, store.currency)}</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet *" value={form.customerName} onChange={event => setForm({ ...form, customerName: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Email *" type="email" value={form.customerEmail} onChange={event => setForm({ ...form, customerEmail: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.customerPhone} onChange={event => setForm({ ...form, customerPhone: event.target.value })} /><textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={3} placeholder="Adresse de livraison *" value={form.shippingAddress} onChange={event => setForm({ ...form, shippingAddress: event.target.value })} /><textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={2} placeholder="Note pour la boutique (facultatif)" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /></div><button type="button" onClick={() => void submit()} disabled={!form.customerName.trim() || !form.customerEmail.trim() || !form.shippingAddress.trim()} className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--shop-accent)' }}>Envoyer la commande</button></>}</section></div>}
  </div>;
}