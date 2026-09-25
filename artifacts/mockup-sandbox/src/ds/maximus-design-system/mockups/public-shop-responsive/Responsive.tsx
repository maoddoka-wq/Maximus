import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Building2, CarFront, Check, Home, MoreHorizontal, Package, ShoppingBag, Store, Truck, UserRound } from 'lucide-react';
import { Badge } from '@workspace/maximus-design-system/components/ui/badge';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Card, CardContent } from '@workspace/maximus-design-system/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/maximus-design-system/components/ui/dropdown-menu';

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

const money = (value: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} XOF`;

function colorLuminance(hex: string): number {
  const channels = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function readableOn(hex: string): string {
  return colorLuminance(hex) > 0.36 ? '#172033' : '#ffffff';
}

const store = {
  name: 'La Boutique MAXIMUS',
  description: 'Retrouvez les produits et services publiés par votre boutique.',
  primary: '#2563eb',
  accent: '#2563eb',
};

const navigation = [
  { label: 'Accueil', path: '/', icon: Store },
  { label: 'Boutique', path: '/boutique', icon: Package },
  { label: 'Location', path: '/location', icon: Home },
  { label: 'Transport', path: '/transport', icon: CarFront },
  { label: 'Immobilier', path: '/immobilier', icon: Building2 },
  { label: 'Livraison', path: '/livraison', icon: Truck },
  { label: 'Panier', path: '/panier', icon: ShoppingBag },
  { label: 'Se connecter', path: '/connexion', icon: UserRound },
];

function OfferCard({
  product,
  onOpen,
  onAdd,
}: {
  product: Product;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : null;

  return (
    <Card className="group w-64 shrink-0 snap-start overflow-hidden">
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          aria-label={`Découvrir ${product.name}`}
          onClick={onOpen}
          className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden p-1.5"
        >
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
            : <Package size={32} className="text-muted-foreground" />}
        </Button>
        {discount !== null && (
          <Badge variant="destructive" className="absolute left-3 top-3">
            -{discount} %
          </Badge>
        )}
        <Badge variant="secondary" className="absolute bottom-3 left-3">
          {product.stock} en stock
        </Badge>
      </div>
      <CardContent className="flex flex-col p-4">
        <Badge variant="outline" className="mb-2 w-fit">
          {product.category}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          onClick={onOpen}
          className="h-auto min-h-0 justify-start whitespace-normal p-0 text-left"
        >
          <span className="text-base font-semibold">{product.name}</span>
        </Button>
        <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">{product.description}</p>
        <div className="mt-3 flex min-h-6 items-baseline gap-2">
          <p className="text-base font-bold">{money(product.price)}</p>
          {product.compareAtPrice && (
            <p className="text-sm text-muted-foreground line-through">{money(product.compareAtPrice)}</p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onAdd}
          className="mt-3 w-full"
          style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-accent-foreground)' }}
        >
          <ShoppingBag /> Ajouter
        </Button>
      </CardContent>
    </Card>
  );
}

function Rail({
  title,
  onOpen,
  onAdd,
  onSeeAll,
}: {
  title: string;
  onOpen: (product: Product) => void;
  onAdd: (product: Product) => void;
  onSeeAll: () => void;
}) {
  return (
    <section aria-label={title}>
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        <Button type="button" variant="link" size="sm" onClick={onSeeAll} className="shrink-0 px-1 text-[var(--shop-primary)]">
          Voir tout <ArrowRight />
        </Button>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 pb-5 pt-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-4">
          {products.map(product => (
            <OfferCard
              key={product.slug}
              product={product}
              onOpen={() => onOpen(product)}
              onAdd={() => onAdd(product)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Responsive() {
  const [path, setPath] = useState('/');
  const [cartCount, setCartCount] = useState(0);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const noticeTimer = useRef<number | null>(null);
  const storeTheme = {
    '--shop-primary': store.primary,
    '--shop-accent': store.accent,
    '--shop-primary-foreground': readableOn(store.primary),
    '--shop-accent-foreground': readableOn(store.accent),
  } as CSSProperties;

  useEffect(() => {
    const timer = window.setInterval(() => setHeroIndex(value => (value + 1) % 2), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
  }, []);

  const nav = useMemo(
    () => navigation.map(item => ({
      ...item,
      label: item.path === '/panier' && cartCount > 0 ? `Panier (${cartCount})` : item.label,
    })),
    [cartCount],
  );
  const primaryNav = nav.filter(item => ['/', '/boutique', '/panier'].includes(item.path));
  const additionalNav = nav.filter(item => !['/', '/boutique', '/panier'].includes(item.path));

  const add = (product: Product) => {
    setCartCount(value => value + 1);
    setNotice(`${product.name} a été ajouté au panier.`);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3200);
  };

  const go = (next: string) => {
    setPath(next);
    setSelected(null);
  };

  return (
    <div
      className="public-shop-shell min-h-[100dvh] w-full min-w-0 overflow-x-hidden bg-muted/25 text-foreground"
      style={storeTheme}
    >
      <header className="relative border-b border-border/60 bg-background/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
          <Button
            type="button"
            variant="ghost"
            onClick={() => go('/')}
            aria-label="Retour à l’accueil de la boutique"
            className="flex min-w-0 justify-start gap-3 p-0 text-left"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-accent-foreground)' }}>
              <ShoppingBag size={20} />
            </span>
            <span className="line-clamp-2 text-base font-bold leading-tight sm:text-lg">{store.name}</span>
          </Button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
            {nav.map(item => (
              <Button
                key={item.path}
                type="button"
                size="sm"
                variant={path === item.path ? 'default' : 'ghost'}
                onClick={() => go(item.path)}
                aria-current={path === item.path ? 'page' : undefined}
                className="px-3"
                style={path === item.path ? { backgroundColor: 'var(--shop-accent)', color: 'var(--shop-accent-foreground)', borderColor: 'var(--shop-accent)' } : undefined}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 pb-36 pt-5 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">
        {selected ? (
          <section>
            <Button type="button" variant="link" onClick={() => setSelected(null)} className="mb-5 px-0 text-muted-foreground">
              ← Retour à la boutique
            </Button>
            <Card className="grid overflow-hidden md:grid-cols-2">
              <img src={selected.imageUrl || hero} alt={selected.name} className="aspect-square h-full w-full object-cover" />
              <CardContent className="flex flex-col justify-center p-6 sm:p-10">
                <Badge variant="outline" className="w-fit text-[var(--shop-primary)]">{selected.category}</Badge>
                <h1 className="mt-3 text-3xl font-bold">{selected.name}</h1>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{selected.description}</p>
                <p className="mt-6 text-2xl font-bold">{money(selected.price)}</p>
                <Button
                  type="button"
                  onClick={() => add(selected)}
                  className="mt-6 w-full"
                  style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-accent-foreground)' }}
                >
                  Ajouter au panier
                </Button>
              </CardContent>
            </Card>
          </section>
        ) : (
          <section className="space-y-8 sm:space-y-10">
            <div className="relative min-h-80 overflow-hidden rounded-3xl p-5 text-white shadow-xl sm:p-9">
              <div
                className="absolute inset-0 flex transition-transform duration-1000"
                style={{ transform: `translateX(-${heroIndex * 100}%)` }}
                aria-label="Images de présentation de la boutique"
              >
                <div className="relative min-w-full">
                  <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover object-[68%_center]" />
                </div>
                <div className="relative min-w-full">
                  <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,27,43,.58)_0%,rgba(11,27,43,.24)_38%,rgba(11,27,43,.04)_70%,transparent_100%)]" />
              <div className="relative max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-white/85">Bienvenue chez {store.name}</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Découvrez nos offres</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/90">{store.description}</p>
                <Button
                  type="button"
                  onClick={() => go('/boutique')}
                  className="mt-6 bg-white text-[var(--shop-accent)] hover:bg-white/90"
                >
                  Voir la boutique <ArrowRight />
                </Button>
              </div>
            </div>

            <Rail
              title="Tous les produits"
              onOpen={setSelected}
              onAdd={add}
              onSeeAll={() => go('/boutique')}
            />
          </section>
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pt-2 shadow-lg backdrop-blur lg:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        aria-label="Navigation mobile"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {primaryNav.map(item => {
            const Icon = item.icon;
            const isCurrent = path === item.path;
            return (
              <Button
                key={item.path}
                type="button"
                variant="ghost"
                onClick={() => go(item.path)}
                aria-label={item.label}
                aria-current={isCurrent ? 'page' : undefined}
                className="relative min-w-0 flex-1 flex-col gap-1 px-1 py-2"
                style={isCurrent ? { color: 'var(--shop-accent)' } : undefined}
              >
                <Icon size={19} />
                <span className="max-w-full truncate">{item.path === '/panier' ? 'Panier' : item.label}</span>
                {item.path === '/panier' && cartCount > 0 && (
                  <Badge
                    className="absolute right-1 top-0 flex min-h-5 min-w-5 items-center justify-center rounded-full px-1"
                    style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-accent-foreground)' }}
                    aria-label={`${cartCount} article${cartCount > 1 ? 's' : ''} dans le panier`}
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>
            );
          })}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" aria-label="Autres fonctionnalités" className="min-w-0 flex-1 flex-col gap-1 px-1 py-2">
                <MoreHorizontal size={19} />
                <span>Plus</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" sideOffset={10} className="mb-2 w-60">
              {additionalNav.map(item => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.path} onSelect={() => go(item.path)} className="min-h-11">
                    <Icon />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3 shadow-xl lg:bottom-4 lg:left-auto lg:right-6 lg:w-96"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Check size={16} />
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold">{notice}</p>
          <Button
            type="button"
            size="sm"
            onClick={() => go('/panier')}
            className="shrink-0"
            style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-accent-foreground)' }}
          >
            Voir le panier
          </Button>
        </div>
      )}
    </div>
  );
}