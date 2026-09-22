import './_group.css';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock3,
  Crosshair,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Route,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

const suggestions = [
  { title: 'Plateau', detail: 'Plateau, Dakar' },
  { title: 'Almadies', detail: 'Almadies, Dakar' },
  { title: 'Fann Résidence', detail: 'Fann, Dakar' },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[var(--shop-primary)] text-[var(--shop-ink)] shadow-[0_5px_0_rgba(18,32,51,.18)]">
        <CarFront size={19} strokeWidth={2.4} />
      </div>
      <div>
        <p className="font-['Space_Mono'] text-[12px] font-bold tracking-[-.04em] text-[var(--shop-ink)]">MAXIMUS</p>
        <p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">Transport Dakar</p>
      </div>
    </div>
  );
}

function GpsReadyCard() {
  return (
    <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-3.5 py-3.5">
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Crosshair size={16} />
          <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-emerald-50 bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-black text-emerald-950">Position détectée</p>
            <span className="font-['Space_Mono'] text-[10px] font-bold text-emerald-700">± 12 m</span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-emerald-800">Départ : votre position actuelle</p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
            <Check size={12} strokeWidth={3} /> GPS précis et prêt
          </p>
        </div>
      </div>
    </div>
  );
}

function DestinationField({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
}) {
  const showSuggestions = value.length > 0 && !suggestions.some((item) => item.title === value);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="destination" className="text-[11px] font-black uppercase tracking-[.13em] text-slate-500">
          Destination
        </label>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
          <Route size={12} /> Dakar
        </span>
      </div>
      <div className="relative">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--shop-primary)]" size={18} fill="currentColor" />
        <input
          id="destination"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-[54px] w-full rounded-[15px] border border-slate-200 bg-[#fffdfa] pl-11 pr-4 text-[14px] font-bold text-[var(--shop-ink)] outline-none transition focus:border-[var(--shop-primary)] focus:ring-4 focus:ring-amber-100"
          placeholder="Ex. Plateau, Almadies…"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            aria-label="Effacer la destination"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={15} />
          </button>
        )}
        {showSuggestions && (
          <div className="absolute inset-x-0 top-[60px] z-20 overflow-hidden rounded-[15px] border border-slate-200 bg-white shadow-[0_16px_35px_rgba(18,32,51,.14)]">
            {suggestions
              .filter((item) => item.title.toLowerCase().includes(value.toLowerCase()) || value.length < 2)
              .map((item) => (
                <button
                  type="button"
                  key={item.title}
                  onClick={() => onSelect(item.title)}
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-3 text-left last:border-0 hover:bg-amber-50"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-[var(--shop-primary)]">
                    <MapPin size={14} />
                  </div>
                  <span>
                    <span className="block text-[12px] font-black text-[var(--shop-ink)]">{item.title}</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">{item.detail}</span>
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-[10px] leading-4 text-slate-500">Un repère ou une adresse suffit.</p>
    </div>
  );
}

function AssignedState({ destination, onReset }: { destination: string; onReset: () => void }) {
  return (
    <main className="transport-scroll min-h-[100dvh] bg-[#f5f2eb] px-3 pb-5 text-[var(--shop-ink)]">
      <div className="mx-auto max-w-[390px]">
        <header className="flex items-center justify-between py-4">
          <BrandMark />
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <ArrowLeft size={14} /> Nouvelle demande
          </button>
        </header>

        <section className="overflow-hidden rounded-[24px] bg-[var(--shop-ink)] text-white shadow-[0_18px_40px_rgba(18,32,51,.18)]">
          <div className="relative overflow-hidden px-5 pb-5 pt-5">
            <div className="absolute -right-9 -top-10 h-32 w-32 rounded-full border-[18px] border-white/[.04]" />
            <div className="absolute -right-2 top-7 h-16 w-16 rounded-full border border-[var(--shop-primary)]/30" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Chauffeur trouvé
              </span>
              <h1 className="mt-4 max-w-[280px] text-[1.8rem] font-black leading-[1.03] tracking-[-.06em]">Votre taxi arrive.</h1>
              <p className="mt-2 max-w-[275px] text-[12px] leading-5 text-white/65">Nous avons trouvé le chauffeur disponible le plus proche de votre position.</p>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[.06] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--shop-primary)] text-[var(--shop-ink)]">
                <UserRound size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-black">Moussa Ndiaye</p>
                <p className="mt-0.5 text-[11px] text-white/55">Taxi jaune et noir · DK-4821-AB</p>
              </div>
              <div className="text-right">
                <p className="font-['Space_Mono'] text-[20px] font-bold text-[var(--shop-primary)]">4 min</p>
                <p className="text-[9px] font-bold uppercase tracking-[.1em] text-white/45">arrivée estimée</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <a href="tel:+221770000000" className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 text-[11px] font-bold text-white">
                <Phone size={14} /> Appeler
              </a>
              <a href="https://wa.me/221770000000" className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-[11px] font-bold text-emerald-200">
                <MessageCircle size={14} /> WhatsApp
              </a>
            </div>
          </div>
        </section>

        <section className="relative mt-3 overflow-hidden rounded-[20px] border border-slate-200 bg-[#e8e5db] px-4 py-4 shadow-sm">
          <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute left-[15%] top-[18%] h-px w-[70%] rotate-[20deg] bg-slate-400/40" />
          <div className="absolute left-[28%] top-[60%] h-px w-[74%] -rotate-[18deg] bg-slate-400/40" />
          <div className="relative">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>TRAJET EN COURS DE PRÉPARATION</span>
              <Navigation size={15} className="text-[var(--shop-accent)]" />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <CircleDot size={15} className="text-emerald-600" />
                <div className="h-7 border-l border-dashed border-slate-400" />
                <MapPin size={17} className="text-[var(--shop-accent)]" fill="currentColor" />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500">DÉPART</p>
                  <p className="text-[12px] font-black">Votre position GPS</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500">DESTINATION</p>
                  <p className="text-[12px] font-black">{destination}, Dakar</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-3 flex items-center gap-3 rounded-[16px] border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[11px] text-emerald-900">
          <ShieldCheck size={17} className="shrink-0 text-emerald-700" />
          <p><span className="font-black">Votre demande est confirmée.</span> Gardez votre téléphone disponible.</p>
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 pb-2 text-[10px] text-slate-400"><Clock3 size={12} /> Mise à jour automatique · données simulées</p>
      </div>
    </main>
  );
}

export function Express() {
  const [destination, setDestination] = useState('');
  const [phone, setPhone] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [requested, setRequested] = useState(false);

  if (requested) {
    return <AssignedState destination={destination || 'Plateau'} onReset={() => setRequested(false)} />;
  }

  const canRequest = destination.trim().length > 1;

  return (
    <main className="transport-scroll min-h-[100dvh] bg-[#f5f2eb] px-3 pb-4 text-[var(--shop-ink)]">
      <div className="mx-auto max-w-[390px]">
        <header className="flex items-center justify-between py-4">
          <button type="button" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <ArrowLeft size={14} /> Boutique
          </button>
          <BrandMark />
          <span className="w-[58px] text-right font-['Space_Mono'] text-[9px] font-bold text-slate-400">01 / 01</span>
        </header>

        <div className="mb-4 h-1 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-[74%] rounded-full bg-[var(--shop-primary)]" />
        </div>

        <section className="mb-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[var(--shop-accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--shop-primary)]" /> Demande express
          </div>
          <h1 className="mt-2 max-w-[315px] text-[2.1rem] font-black leading-[.98] tracking-[-.07em]">Où allez-vous<br />aujourd’hui&nbsp;?</h1>
          <p className="mt-3 max-w-[300px] text-[12px] leading-5 text-slate-500">Votre position est déjà prête. Il ne reste qu’à indiquer votre destination.</p>
        </section>

        <GpsReadyCard />

        <section className="mt-3 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(18,32,51,.05)]">
          <DestinationField value={destination} onChange={setDestination} onSelect={setDestination} />

          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="mt-3 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-left"
          >
            <span className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-600">
              <UserRound size={15} className="text-slate-400" /> Ajouter mes coordonnées <span className="font-normal text-slate-400">(facultatif)</span>
            </span>
            {detailsOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
          </button>
          {detailsOpen && (
            <div className="mt-3 rounded-[13px] bg-slate-50 p-3">
              <label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Téléphone pour le chauffeur</label>
              <input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold outline-none focus:border-[var(--shop-primary)] focus:ring-4 focus:ring-amber-100"
                placeholder="+221 77 000 00 00"
                inputMode="tel"
              />
              <p className="mt-2 text-[10px] leading-4 text-slate-500">Utilisé uniquement pour vous mettre en relation avec le chauffeur.</p>
            </div>
          )}
        </section>

        <button
          type="button"
          disabled={!canRequest}
          onClick={() => setRequested(true)}
          className="mt-3 flex h-[56px] w-full items-center justify-between rounded-[16px] bg-[var(--shop-accent)] px-4 text-[13px] font-black text-white shadow-[0_10px_22px_rgba(18,32,51,.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          <span className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--shop-primary)] text-[var(--shop-ink)]"><CarFront size={16} /></span>
            Demander un chauffeur
          </span>
          <ArrowRight size={18} />
        </button>
        <p className="mt-2.5 text-center text-[10px] font-semibold text-slate-400">
          {canRequest ? 'Chauffeur le plus proche · réponse en quelques secondes' : 'Saisissez une destination pour continuer'}
        </p>

        <div className="mt-5 flex items-start gap-3 rounded-[16px] border border-amber-200/80 bg-amber-50/80 px-3.5 py-3">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--shop-accent)]" />
          <p className="text-[10px] leading-4 text-slate-600"><span className="font-black text-[var(--shop-ink)]">Simple et direct.</span> Nous vous mettons en relation avec un chauffeur disponible à proximité, sans détour.</p>
        </div>

        <p className="mt-4 flex items-center justify-center gap-2 pb-1 text-[10px] text-slate-400"><Navigation size={12} /> GPS actif · Dakar</p>
      </div>
    </main>
  );
}