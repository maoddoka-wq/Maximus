import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CarFront, Check, ChevronDown, Clock3, Copy, MapPin, MessageCircle, Phone, RefreshCw, Share2 } from 'lucide-react';
import { Button as TransportButton } from '@workspace/maximus-transport-public/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/maximus-transport-public/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@workspace/maximus-design-system/components/ui/collapsible';
import { Input } from '@workspace/maximus-transport-public/components/ui/input';
import { Label } from '@workspace/maximus-transport-public/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/maximus-design-system/components/ui/tabs';
import { tokens } from '@workspace/maximus-transport-public/tokens';

type Screen = 'home' | 'booking' | 'trip';
type Step = 'route' | 'passenger';

const hexToHsl = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (delta) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h * 10) / 10} ${Math.round(s * 1000) / 10}% ${Math.round(l * 1000) / 10}%`;
};

function RoutePreview({ destination }: { destination: string }) {
  return <div role="img" aria-label={`Aperçu indicatif du trajet vers ${destination}`} className="relative h-40 overflow-hidden rounded-lg border border-border bg-muted">
    <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'linear-gradient(28deg, transparent 47%, hsl(var(--border)) 48%, hsl(var(--border)) 49%, transparent 50%), linear-gradient(110deg, transparent 48%, hsl(var(--border)) 49%, hsl(var(--border)) 50%, transparent 51%)', backgroundSize: '90px 70px, 120px 85px' }} />
    <span className="absolute left-[22%] top-[58%] h-3 w-3 rounded-full bg-destructive ring-4 ring-background" />
    <span className="absolute left-[26%] top-[53%] h-1 w-[45%] -rotate-[25deg] rounded-full bg-primary" />
    <span className="absolute right-[22%] top-[24%] flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"><MapPin size={14} /></span>
    <div className="absolute inset-x-2 bottom-2 flex flex-wrap gap-x-3 rounded-md border border-border bg-card/95 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground">
      <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-destructive" />Départ GPS</span>
      <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-primary" />Destination</span>
      <span className="ml-auto">Aperçu indicatif</span>
    </div>
  </div>;
}

/** Current baseline extracted from public-shop.tsx TransportPublicPage.
 * API, router, persisted session, and browser GPS are represented by local state
 * so the source composition remains usable in the isolated design-system entry.
 */
export function Current({
  initialScreen = 'home',
  initialDestination = 'Plateau, Dakar',
}: {
  initialScreen?: Screen;
  initialDestination?: string;
} = {}) {
  const palette = tokens.color.light;
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [step, setStep] = useState<Step>('route');
  const [pickup, setPickup] = useState('Entrée principale');
  const [destination, setDestination] = useState(initialDestination);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const routeComplete = pickup.trim().length >= 3 && destination.trim().length > 0;
  const themeStyle = {
    '--primary': hexToHsl(palette.accent),
    '--primary-foreground': hexToHsl(palette.accentForeground),
    '--primary-border': palette.accent,
    '--accent': hexToHsl(palette.primary),
    '--accent-foreground': hexToHsl(palette.primaryForeground),
    '--accent-border': palette.primary,
    '--ring': hexToHsl(palette.accent),
    '--transport-primary': palette.primary,
    '--transport-accent': palette.accent,
  } as CSSProperties;

  const estimate = useMemo(() => destination ? { fare: '2 850 XOF', duration: '18 min', distance: '6,2 km' } : null, [destination]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step === 'route') { if (routeComplete) setStep('passenger'); return; }
    if (phone.trim()) { setSubmitted(true); setScreen('trip'); }
  };

  return <section style={themeStyle} className="mx-auto min-h-screen w-full max-w-6xl overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
      <TransportButton type="button" variant="ghost" size="sm" onClick={() => setScreen('home')}><ArrowLeft size={16} /> MAXIMUS Transport</TransportButton>
      <div className="flex items-center gap-2 text-xs font-semibold text-primary"><span className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[var(--transport-accent)]" />Dakar · Mobilité locale</span><MapPin size={13} /> GPS actif · 18 m</div>
    </header>

    {screen === 'home' && <>
      <div className="relative aspect-[16/7] overflow-hidden border-b border-border bg-sidebar sm:aspect-[16/5]">
        <img src="/__mockup/images/taxi-transport-hero.jpg" alt="Taxi Urbain à Dakar" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar/90 via-sidebar/45 to-transparent" />
        <div className="absolute inset-x-4 bottom-4 max-w-xl text-sidebar-foreground sm:inset-x-8 sm:bottom-6"><p className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/75">MAXIMUS Transport · Dakar</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-4xl">Votre trajet, simplement.</h1><p className="mt-1 text-sm text-sidebar-foreground/80 sm:text-base">Un départ précis, une destination claire, un taxi qui vient à vous.</p></div>
      </div>
      <main className="p-4 sm:p-8"><Card className="transport-entry-card overflow-hidden"><CardContent className="grid gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div className="relative h-36 overflow-hidden rounded-lg border border-border bg-muted sm:h-52"><RoutePreview destination="Dakar" /><span className="absolute left-2 top-2 rounded-md border border-border bg-card/95 px-2.5 py-1.5 text-[10px] font-semibold">Position GPS prête · 18 m</span></div>
        <div><p className="text-sm font-semibold sm:text-base">Un taxi fiable pour vos trajets quotidiens.</p><p className="mt-2 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">Votre GPS situe le départ ; ajoutez un repère visible pour faciliter la rencontre avec le chauffeur.</p><div className="mt-3 flex gap-4 text-xs text-muted-foreground"><span><MapPin size={13} className="mr-1 inline text-primary" />GPS précis</span><span><Clock3 size={13} className="mr-1 inline text-primary" />Devis avant départ</span></div><TransportButton type="button" onClick={() => { setStep('route'); setScreen('booking'); }} className="mt-4 w-full"><CarFront size={17} /> Commander un taxi <ArrowRight size={16} /></TransportButton></div>
      </CardContent></Card></main>
    </>}

    {screen === 'booking' && <main className="px-4 pb-24 pt-5 sm:px-8 sm:pb-28 sm:pt-7">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">Dakar · Taxi urbain</p><h1 className="mt-1 text-xl font-bold tracking-tight sm:text-3xl">Réserver un taxi</h1><p className="mt-1 text-sm leading-5 text-muted-foreground">{step === 'route' ? 'Indiquez votre repère de départ et votre destination.' : 'Ajoutez le numéro qui permettra au chauffeur de vous joindre.'}</p>
      <form onSubmit={submit} className="mt-4"><Tabs value={step} onValueChange={v => setStep(v as Step)}><TabsList className="grid h-auto w-full grid-cols-2"><TabsTrigger value="route" className="gap-2 py-2.5 text-xs"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">{step === 'passenger' && routeComplete ? <Check size={12} /> : '1'}</span>Trajet</TabsTrigger><TabsTrigger value="passenger" disabled={!routeComplete} className="gap-2 py-2.5 text-xs"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">2</span>Contact</TabsTrigger></TabsList>
        <TabsContent value="route" className="mt-3"><div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]"><Card><CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border p-4"><CardTitle className="text-sm">Votre trajet</CardTitle><span className="text-xs font-semibold text-primary">GPS · 18 m</span></CardHeader><CardContent className="space-y-3 p-4"><Label htmlFor="current-pickup" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Repère de prise en charge<Input id="current-pickup" required minLength={3} value={pickup} onChange={e => setPickup(e.target.value)} className="mt-1 normal-case tracking-normal" /></Label><div className="ml-4 h-3 border-l border-dashed border-border" /><Label htmlFor="current-destination" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination<Input id="current-destination" required value={destination} onChange={e => setDestination(e.target.value)} className="mt-1 normal-case tracking-normal" placeholder="Quartier, lieu ou adresse" /></Label></CardContent></Card>
          <Card className="h-fit"><CardHeader className="border-b border-border p-4"><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-sm">Estimation</CardTitle><p className="mt-1 truncate text-xs text-muted-foreground">{pickup || 'Point GPS'} → {destination || 'destination'}</p></div><p className="text-lg font-bold">{estimate?.fare ?? '—'}</p></div></CardHeader><CardContent className="space-y-2 p-4">{estimate && <><div className="flex gap-4 border-b border-border pb-2 text-xs text-muted-foreground"><span><Clock3 size={14} className="mr-1 inline" />{estimate.duration}</span><span><CarFront size={14} className="mr-1 inline" />{estimate.distance}</span></div><Collapsible open={mapOpen} onOpenChange={setMapOpen}><CollapsibleTrigger asChild><TransportButton type="button" variant="ghost" size="sm" className="w-full justify-between px-1">{mapOpen ? 'Masquer la carte' : 'Afficher la carte du trajet'}<ChevronDown size={16} className={mapOpen ? 'rotate-180' : ''} /></TransportButton></CollapsibleTrigger><CollapsibleContent className="pt-2"><RoutePreview destination={destination} /></CollapsibleContent></Collapsible></>}</CardContent></Card>
        </div></TabsContent>
        <TabsContent value="passenger" className="mt-3"><div className="grid gap-3 lg:grid-cols-[1fr_.85fr]"><Card><CardHeader className="flex flex-row items-start justify-between gap-3 p-4"><div><CardTitle className="text-sm">Coordonnées passager</CardTitle><p className="mt-1 text-xs text-muted-foreground">Le téléphone est requis pour vous joindre.</p></div><span className="text-xs font-bold uppercase tracking-wider text-primary">Requis</span></CardHeader><CardContent className="grid gap-3 border-t border-border p-4 sm:grid-cols-2"><Label htmlFor="current-phone" className="text-xs text-muted-foreground">Téléphone<Input id="current-phone" required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1.5" placeholder="+221 77 000 00 00" /></Label><Label htmlFor="current-name" className="text-xs text-muted-foreground">Prénom<Input id="current-name" value={name} onChange={e => setName(e.target.value)} className="mt-1.5" placeholder="Ex. Awa" /></Label></CardContent></Card><Card className="h-fit"><CardHeader className="border-b border-border p-4"><CardTitle className="text-sm">Récapitulatif</CardTitle></CardHeader><CardContent className="space-y-2 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Départ</p><p className="text-sm font-medium">{pickup}</p><p className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination</p><p className="text-sm font-medium">{destination}</p><div className="flex justify-between border-t border-border pt-2 text-sm"><span className="text-xs text-muted-foreground">18 min · 6,2 km</span><b>2 850 XOF</b></div><TransportButton type="button" variant="link" onClick={() => setStep('route')} className="h-auto px-0 text-xs">Modifier le trajet</TransportButton></CardContent></Card></div><p className="mt-3 text-center text-xs text-muted-foreground">Vos coordonnées sont partagées uniquement avec le chauffeur affecté par MAXIMUS.</p></TabsContent>
      </Tabs></form>
      <div className="sticky bottom-0 z-20 mt-3 border-t border-border bg-background/95 px-3 py-2.5 backdrop-blur-sm">{step === 'route' ? <TransportButton type="button" size="lg" onClick={() => routeComplete && setStep('passenger')} className="w-full">Continuer <ArrowRight size={16} /></TransportButton> : <TransportButton type="button" size="lg" disabled={!phone.trim()} onClick={() => phone.trim() && setScreen('trip')} className="w-full"><CarFront size={17} /> Commander un taxi <ArrowRight size={16} /></TransportButton>}</div>
    </main>}

    {screen === 'trip' && <main className="p-4 sm:p-8"><Card><CardHeader className="border-b border-border p-4"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Demande enregistrée</p><CardTitle className="mt-1 text-lg">Attribution en cours</CardTitle></CardHeader><CardContent className="space-y-4 p-4"><p className="text-sm leading-6 text-muted-foreground">Votre demande est transmise aux chauffeurs disponibles à proximité.</p><div className="flex items-center gap-2 text-xs font-semibold text-primary"><RefreshCw size={14} className="animate-spin" />Actualisé toutes les 5 s</div><Collapsible open={shareOpen} onOpenChange={setShareOpen}><CollapsibleTrigger asChild><TransportButton type="button" variant="ghost" className="w-full justify-between px-0"><span className="inline-flex items-center gap-2"><Share2 size={16} />Partager le suivi</span><ChevronDown size={16} /></TransportButton></CollapsibleTrigger><CollapsibleContent className="space-y-3 text-xs leading-5 text-muted-foreground">Lien de suivi en lecture seule : statut, départ, arrivée et position du taxi.<TransportButton type="button" variant="outline" onClick={() => setShareCopied(true)} className="w-full">{shareCopied ? <Check /> : <Copy />} {shareCopied ? 'Lien copié' : 'Copier le lien'}</TransportButton></CollapsibleContent></Collapsible><TransportButton type="button" variant="outline" onClick={() => { setSubmitted(false); setScreen('home'); }} className="w-full">Demander une autre course</TransportButton></CardContent></Card><div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><span className="mr-auto">Besoin d’aide avec MAXIMUS ?</span><TransportButton asChild variant="outline"><a href="tel:+221770000000"><Phone /> Appeler</a></TransportButton><TransportButton asChild variant="secondary"><a href="https://wa.me/221770000000" target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></TransportButton></div></main>}
  </section>;
}