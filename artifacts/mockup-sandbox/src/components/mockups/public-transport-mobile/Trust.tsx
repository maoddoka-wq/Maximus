import './_group.css';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  ChevronDown,
  Clock3,
  Crosshair,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  Signal,
  UserRound,
} from 'lucide-react';

const suggestions = [
  { title: 'Plateau', detail: 'Plateau, Dakar' },
  { title: 'Almadies', detail: 'Almadies, Dakar' },
  { title: 'Fann Résidence', detail: 'Fann Résidence, Dakar' },
];

function BrandBar() {
  return (
    <div className="flex items-center justify-between">
      <button type="button" className="inline-flex items-center gap-2 text-[12px] font-bold text-[var(--shop-accent)]">
        <ArrowLeft size={15} /> Retour à la boutique
      </button>
      <div className="flex items-center gap-1.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[var(--shop-primary)] text-[var(--shop-accent)]">
          <CarFront size={15} strokeWidth={2.5} />
        </span>
        <span className="font-['Space_Mono'] text-[10px] font-bold tracking-[-.06em] text-[var(--shop-accent)]">MAXIMUS</span>
      </div>
    </div>
  );
}

function GpsConfidence() {
  return (
    <div className="rounded-[18px] border border-[#d9e7d9] bg-[#f5fbf2] p-3.5">
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dff1dc] text-[#397048]">
          <Crosshair size={18} />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#f5fbf2] bg-[#65a862]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-bold text-[#21462a]">Position actuelle confirmée</p>
            <span className="font-['Space_Mono'] text-[10px] font-bold text-[#397048]">98%</span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-[#54735a]">Yoff, Dakar · précision de 12 m</p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#d8ead5]">
            <div className="h-full w-[98%] rounded-full bg-[#66a764]" />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-[#67826a]">
            <Signal size={11} /> GPS actif, départ partagé au chauffeur
          </p>
        </div>
      </div>
    </div>
  );
}

function RoutePreview({ destination }: { destination: string }) {
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-[#d9e0e3] bg-[#eef2f1] p-3.5">
      <div className="absolute inset-0 opacity-60" aria-hidden="true">
        <div className="absolute -left-3 top-8 h-px w-[125%] rotate-[16deg] bg-[#d4dcdb]" />
        <div className="absolute left-[-18%] top-20 h-px w-[135%] -rotate-[27deg] bg-[#d4dcdb]" />
        <div className="absolute left-[45%] top-[-15%] h-[160%] w-px rotate-[33deg] bg-[#d4dcdb]" />
        <div className="absolute left-[65%] top-[-10%] h-[160%] w-px -rotate-[19deg] bg-[#d4dcdb]" />
        <div className="absolute left-[28%] top-[-10%] h-16 w-16 rounded-full border border-[#d4dcdb]" />
      </div>
      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 text-[10px] font-bold text-[#496064] shadow-sm">
          <Navigation size={11} className="text-[var(--shop-accent)]" /> Itinéraire estimé
        </span>
        <span className="rounded-full bg-[#172235] px-2.5 py-1.5 font-['Space_Mono'] text-[9px] font-bold text-white">DAKAR</span>
      </div>
      <div className="relative mt-5 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[#67a665] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <div className="h-[3px] flex-1 rounded-full bg-[#77ad76]" />
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[var(--shop-primary)] text-[var(--shop-accent)] shadow-sm">
            <MapPin size={12} strokeWidth={3} />
          </span>
        </div>
      </div>
      <div className="relative mt-2 flex items-start justify-between gap-6 text-[10px]">
        <span className="font-bold text-[#38565a]">Votre position</span>
        <span className="text-right font-bold text-[#38565a]">{destination || 'Votre destination'}</span>
      </div>
    </div>
  );
}

function DriverState() {
  return (
    <div className="rounded-[20px] border border-[#d9e0e3] bg-[#172235] p-4 text-white shadow-[0_12px_26px_rgba(23,34,53,.14)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#f8c83c]">
          <span className="h-2 w-2 rounded-full bg-[#f8c83c]" /> Chauffeur trouvé
        </div>
        <span className="font-['Space_Mono'] text-[10px] text-white/55">À L’APPROCHE</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f8c83c] text-[var(--shop-accent)]">
          <UserRound size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold">Moussa Ndiaye</p>
          <p className="mt-0.5 text-[11px] text-white/60">Toyota Corolla · DK-4821-AB</p>
        </div>
        <div className="text-right">
          <p className="font-['Space_Mono'] text-[18px] font-bold text-[#f8c83c]">4 min</p>
          <p className="text-[10px] text-white/55">arrivée estimée</p>
        </div>
      </div>
      <div className="mt-4 rounded-[12px] border border-white/10 bg-white/[.06] px-3 py-2.5 text-[11px] leading-4 text-white/75">
        Votre chauffeur vous appellera à son arrivée. Vérifiez la plaque avant de monter.
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href="tel:+221770000000" className="inline-flex items-center justify-center gap-1.5 rounded-[11px] border border-white/15 bg-white/10 py-2.5 text-[11px] font-bold text-white">
          <Phone size={13} /> Appeler
        </a>
        <a href="https://wa.me/221770000000" className="inline-flex items-center justify-center gap-1.5 rounded-[11px] border border-[#56c271]/35 bg-[#56c271]/15 py-2.5 text-[11px] font-bold text-white">
          <MessageCircle size={13} /> WhatsApp
        </a>
      </div>
    </div>
  );
}

export function Trust() {
  const [destination, setDestination] = useState('');
  const [phone, setPhone] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [requested, setRequested] = useState(false);

  const canRequest = destination.trim().length > 0 && phone.trim().length > 0;

  return (
    <main className="transport-scroll min-h-screen bg-[hsl(var(--background))] px-3 pb-6 pt-3 text-[hsl(var(--foreground))]">
      <section className="mx-auto max-w-[390px] space-y-4">
        <BrandBar />

        <header className="pt-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--shop-accent)]/55">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--shop-primary)]" /> Service transport Dakar
          </div>
          <h1 className="mt-2 max-w-[320px] text-[29px] font-black leading-[1.02] tracking-[-.065em] text-[var(--shop-accent)]">
            Votre trajet,<br /><span className="text-[#69827d]">en confiance.</span>
          </h1>
          <p className="mt-2 max-w-[340px] text-[12px] leading-5 text-[hsl(var(--muted-foreground))]">
            Nous vérifions votre départ, trouvons le chauffeur le plus proche et vous gardons informé jusqu’à l’arrivée.
          </p>
        </header>

        <GpsConfidence />
        <RoutePreview destination={destination} />

        {!requested ? (
          <div className="rounded-[20px] border border-[#e0ddd5] bg-[#fffdfa] p-4 shadow-[0_8px_22px_rgba(63,55,39,.06)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Étape suivante</p>
                <h2 className="mt-1 text-[20px] font-black tracking-[-.045em] text-[var(--shop-accent)]">Où allez-vous ?</h2>
              </div>
              <span className="font-['Space_Mono'] text-[10px] font-bold text-[var(--shop-primary)]">01 / 01</span>
            </div>

            <label className="mt-4 block text-[12px] font-bold text-[var(--shop-accent)]">
              Destination
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--shop-accent)]">
                  <MapPin size={16} />
                </div>
                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  className="w-full rounded-[12px] border border-[#d9d6cc] bg-white py-3.5 pl-10 pr-3 text-[13px] outline-none transition focus:border-[var(--shop-primary)] focus:ring-2 focus:ring-[var(--shop-primary)]/20"
                  placeholder="Ex. Plateau, Almadies ou Fann"
                />
                {destination.length === 0 && (
                  <div className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-[13px] border border-[#e5e1d8] bg-white shadow-[0_12px_28px_rgba(46,42,32,.12)]">
                    {suggestions.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion.title}
                        onClick={() => setDestination(suggestion.detail)}
                        className="flex w-full items-center gap-3 border-b border-[#efede8] px-3.5 py-2.5 text-left last:border-0"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f4f0e5] text-[var(--shop-accent)]"><MapPin size={13} /></span>
                        <span>
                          <span className="block text-[12px] font-bold text-[#223243]">{suggestion.title}</span>
                          <span className="mt-0.5 block text-[10px] font-normal text-[#7c8582]">{suggestion.detail}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="mt-1.5 block text-[10px] font-normal text-[hsl(var(--muted-foreground))]">Une adresse ou un repère dans Dakar.</span>
            </label>

            <label className="mt-4 block text-[12px] font-bold text-[var(--shop-accent)]">
              Votre téléphone
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full rounded-[12px] border border-[#d9d6cc] bg-white px-3.5 py-3.5 text-[13px] outline-none transition focus:border-[var(--shop-primary)] focus:ring-2 focus:ring-[var(--shop-primary)]/20"
                placeholder="+221 77 000 00 00"
                inputMode="tel"
              />
            </label>

            <button type="button" onClick={() => setDetailsOpen((open) => !open)} className="mt-3 flex w-full items-center justify-between border-t border-[#ebe7de] pt-3 text-left text-[11px] font-bold text-[#62706e]">
              <span className="inline-flex items-center gap-2"><UserRound size={14} /> Ajouter un détail passager <span className="font-normal text-[#9ca4a0]">(optionnel)</span></span>
              <ChevronDown size={15} className={detailsOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
            {detailsOpen && (
              <input className="mt-2 w-full rounded-[12px] border border-[#d9d6cc] bg-white px-3.5 py-3 text-[12px] outline-none" placeholder="Ex. devant la pharmacie, avec une valise" />
            )}

            <button
              type="button"
              disabled={!canRequest}
              onClick={() => setRequested(true)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--shop-accent)] px-4 py-3.5 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(23,34,53,.16)] transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CarFront size={16} /> Demander un chauffeur <ArrowRight size={15} />
            </button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[10px] text-[hsl(var(--muted-foreground))]">
              <ShieldCheck size={12} className="text-[#5b8960]" /> Votre position est partagée uniquement avec le chauffeur affecté.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-[13px] border border-[#d9e7d9] bg-[#f5fbf2] px-3.5 py-3 text-[11px] font-bold text-[#315c39]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6ba867] text-white"><Check size={12} strokeWidth={3} /></span>
              Demande confirmée · suivi en direct activé
            </div>
            <DriverState />
            <div className="flex items-center justify-between rounded-[15px] border border-[#e0ddd5] bg-[#fffdfa] px-3.5 py-3 text-[11px]">
              <span className="flex items-center gap-2 font-bold text-[var(--shop-accent)]"><Clock3 size={14} className="text-[#72847f]" /> Destination</span>
              <span className="font-semibold text-[#72847f]">{destination}</span>
            </div>
            <button type="button" onClick={() => setRequested(false)} className="inline-flex w-full items-center justify-center gap-2 py-2 text-[11px] font-bold text-[var(--shop-accent)]">
              <ArrowLeft size={14} /> Modifier ou refaire une demande
            </button>
          </div>
        )}

        <p className="flex items-center justify-center gap-1.5 pb-1 text-[10px] text-[hsl(var(--muted-foreground))]">
          <ShieldCheck size={12} /> Service de mise en relation MAXIMUS · Dakar
        </p>
      </section>
    </main>
  );
}