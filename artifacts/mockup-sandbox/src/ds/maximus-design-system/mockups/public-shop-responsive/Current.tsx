import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight, Check, Building2, CarFront, Home, Package, ShoppingBag, Store, Truck, UserRound } from 'lucide-react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Card, CardContent } from '@workspace/maximus-design-system/components/ui/card';

const hero = '/__mockup/images/family-lunch-hero.jpg';

type Product = {
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  imageUrl: string;
};

const products: Product[] = [
  { slug: 'coffret-degustation', name: 'Coffret dégustation', category: 'Épicerie', description: 'Une sélection généreuse à partager.', price: 18500, compareAtPrice: 22000, stock: 12, imageUrl: hero },
  { slug: 'sac-artisanal', name: 'Sac artisanal', category: 'Accessoires', description: 'Création locale, pratique au quotidien.', price: 12500, stock: 8, imageUrl: hero },
  { slug: 'panier-gourmand', name: 'Panier gourmand', category: 'Épicerie', description: 'Les saveurs préférées de la maison.', price: 25000, stock: 5, imageUrl: hero },
  { slug: 'carte-cadeau', name: 'Carte cadeau', category: 'Services', description: 'Faites plaisir avec une attention personnalisée.', price: 10000, stock: 99, imageUrl: '' },
];

const money = (value: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} XOF`;

function OfferCard({ product, onOpen, onAdd }: { product: Product; onOpen: () => void; onAdd: () => void }) {
  const discount = product.compareAtPrice ? Math.round((1 - product.price / product.compareAtPrice) * 100) : null;
  return (
    <Card className="group w-[180px] shrink-0 overflow-hidden rounded-xl border-black/5 bg-white shadow-[0_3px_12px_rgba(15,23,42,.06)] sm:w-[240px]">
      <button type="button" onClick={onOpen} className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted/35 p-1.5 sm:aspect-square sm:p-2">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <Package size={28} className="text-muted-foreground" />}
        {discount && <span className="absolute left-2 top-2 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">-{discount}%</span>}
        <span className="absolute bottom-2 left-2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">{product.stock} en stock</span>
      </button>
      <CardContent className="p-2.5 sm:p-3">
        <p className="truncate text-[8px] font-bold uppercase tracking-[.1em] text-muted-foreground">{product.category}</p>
        <button type="button" onClick={onOpen} className="mt-1 line-clamp-2 min-h-8 w-full text-left text-xs font-semibold leading-4 sm:text-sm">{product.name}</button>
        <p className="mt-1.5 text-sm font-bold sm:text-base">{money(product.price)}</p>
        {product.compareAtPrice && <p className="text-[10px] text-muted-foreground line-through">{money(product.compareAtPrice)}</p>}
        <Button type="button" size="sm" onClick={onAdd} className="mt-2 w-full bg-[var(--shop-accent)] text-white hover:bg-[var(--shop-accent)]/90">
          <ShoppingBag /> Ajouter
        </Button>
      </CardContent>
    </Card>
  );
}

function Rail({ title, onOpen, onAdd }: { title: string; onOpen: (product: Product) => void; onAdd: (product: Product) => void }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between px-1">
        <h2 className="text-xl font-bold tracking-[-.02em] sm:text-2xl">{title}</h2>
        <button type="button" className="flex items-center gap-1 text-sm font-semibold text-[var(--shop-primary)]"><span className="hidden sm:inline">Voir tout</span><ArrowRight size={14} /></button>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 pb-6 pt-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-4">{products.map(product => <OfferCard key={product.slug} product={product} onOpen={() => onOpen(product)} onAdd={() => onAdd(product)} />)}</div>
      </div>
    </section>
  );
}

export default function Current() {
  const [path, setPath] = useState('/');
  const [cartCount, setCartCount] = useState(0);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const store = { name: 'La Boutique MAXIMUS', description: 'Retrouvez les produits et services publiés par votre boutique.', primary: '#2563eb', accent: '#2563eb' };

  useEffect(() => { const timer = window.setInterval(() => setHeroIndex(value => (value + 1) % 2), 5000); return () => window.clearInterval(timer); }, []);
  const nav = useMemo(() => [
    { label: 'Accueil', path: '/', icon: Store },
    { label: 'Boutique', path: '/boutique', icon: Package },
    { label: 'Location', path: '/location', icon: Home },
    { label: 'Transport', path: '/transport', icon: CarFront },
    { label: 'Immobilier', path: '/immobilier', icon: Building2 },
    { label: 'Livraison', path: '/livraison', icon: Truck },
    { label: `Panier${cartCount ? ` (${cartCount})` : ''}`, path: '/panier', icon: ShoppingBag },
    { label: 'Se connecter', path: '/connexion', icon: UserRound },
  ], [cartCount]);
  const add = (product: Product) => { setCartCount(value => value + 1); setNotice(`${product.name} a été ajouté au panier.`); window.setTimeout(() => setNotice(''), 3200); };
  const go = (next: string) => { setPath(next); setSelected(null); };

  return (
    <div className="public-shop-shell min-h-screen w-full min-w-0 overflow-x-hidden bg-muted/25" style={{ '--shop-primary': store.primary, '--shop-accent': store.accent } as CSSProperties}>
      <header className="relative border-b border-black/5 bg-white/95 text-foreground shadow-[0_1px_0_rgba(15,23,42,.03)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <button type="button" onClick={() => go('/')} className="flex min-w-0 items-center gap-3 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--shop-accent)] p-1.5"><ShoppingBag size={19} className="text-white" /></span>
            <span className="line-clamp-2 text-base font-bold leading-tight sm:text-lg">{store.name}</span>
          </button>
          <nav className="hidden absolute right-4 top-full z-30 mt-2 w-72 flex-col gap-1 rounded-2xl border bg-white p-2 shadow-2xl sm:static sm:flex sm:w-auto sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            {nav.map(item => <button type="button" key={item.path} onClick={() => go(item.path)} className={`rounded-xl px-4 py-2.5 text-left text-sm font-semibold sm:py-2 ${path === item.path ? 'bg-[var(--shop-accent)] text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>{item.label}</button>)}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 pb-24 pt-6 sm:px-6 sm:py-9 lg:px-8">
        {selected ? <section><button type="button" onClick={() => setSelected(null)} className="mb-5 text-sm font-semibold text-muted-foreground">← Retour à la boutique</button><Card className="grid overflow-hidden rounded-3xl md:grid-cols-2"><img src={selected.imageUrl || hero} alt={selected.name} className="aspect-square h-full w-full object-cover" /><CardContent className="flex flex-col justify-center p-6 sm:p-10"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--shop-primary)]">{selected.category}</p><h1 className="mt-3 text-3xl font-bold">{selected.name}</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">{selected.description}</p><p className="mt-6 text-2xl font-bold">{money(selected.price)}</p><Button onClick={() => add(selected)} className="mt-6 w-full bg-[var(--shop-accent)] text-white">Ajouter au panier</Button></CardContent></Card></section>
          : <section className="space-y-10">
            <div className="relative min-h-[300px] overflow-hidden rounded-3xl p-6 text-white shadow-xl sm:min-h-[340px] sm:p-9">
              <div className="absolute inset-0 flex transition-transform duration-1000" style={{ transform: `translateX(-${heroIndex * 100}%)` }} aria-label="Images de présentation de la boutique"><div className="relative min-w-full"><img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover object-[68%_center]" /></div><div className="relative min-w-full"><img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover object-center" /></div></div>
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,27,43,.58)_0%,rgba(11,27,43,.24)_38%,rgba(11,27,43,.04)_70%,transparent_100%)]" />
              <div className="relative max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-white/70">Bienvenue chez {store.name}</p><h1 className="mt-3 text-3xl font-bold tracking-[-.05em] sm:text-4xl">Découvrez nos offres</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/75">{store.description}</p><Button onClick={() => go('/boutique')} className="mt-6 bg-white text-[var(--shop-accent)] hover:bg-white/90">Voir la boutique <ArrowRight /></Button></div>
            </div>
            <Rail title="Tous les produits" onOpen={setSelected} onAdd={add} />
          </section>}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-2 pb-2 pt-2 shadow-[0_-8px_24px_rgba(15,23,42,.08)] backdrop-blur sm:hidden" aria-label="Navigation mobile"><div className="mx-auto grid max-w-md grid-cols-8 gap-1">{nav.map(item => { const Icon = item.icon; return <button type="button" key={item.path} onClick={() => go(item.path)} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold ${path === item.path ? 'text-[var(--shop-accent)]' : 'text-muted-foreground'}`}><Icon size={18} /><span className="max-w-full truncate">{item.label}</span>{item.path === '/panier' && cartCount > 0 && <span className="absolute right-1/4 top-0 flex h-4 min-w-4 translate-x-1/2 items-center justify-center rounded-full bg-[var(--shop-accent)] px-1 text-[9px] font-bold text-white">{cartCount}</span>}</button>; })}</div></nav>
      {notice && <div role="status" className="fixed bottom-20 left-3 right-3 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-3 py-3 shadow-xl sm:bottom-4 sm:left-auto sm:right-6 sm:w-96"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={16} /></span><p className="flex-1 text-sm font-semibold">{notice}</p><button type="button" onClick={() => go('/panier')} className="rounded-lg bg-[var(--shop-accent)] px-2.5 py-2 text-xs font-bold text-white">Voir le panier</button></div>}
    </div>
  );
}