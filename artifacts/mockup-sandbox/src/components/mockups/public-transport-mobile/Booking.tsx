import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import './_group.css';

type TripState = 'ready' | 'searching' | 'assigned' | 'in-progress' | 'cancelled';

const places = [
  { name: 'Plateau', detail: 'Centre-ville · 4,8 km' },
  { name: 'Almadies', detail: 'Ouest de Dakar · 10,6 km' },
  { name: 'Fann Résidence', detail: 'Fann · 3,1 km' },
];

function Stepper({ active }: { active: number }) {
  return (
    <nav aria-label="Progression de la réservation" className="flex items-center gap-2">
      {['Départ', 'Destination', 'Confirmation'].map((label, index) => {
        const step = index + 1;
        const complete = step < active;
        const current = step === active;
        return (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center border text-[10px] font-bold ${
                complete
                  ? 'border-[#172235] bg-[#172235] text-white'
                  : current
                    ? 'border-[#e2a900] bg-[#f5b719] text-[#172235]'
                    : 'border-[#cfd2cd] bg-transparent text-[#737b7d]'
              }`}
              aria-current={current ? 'step' : undefined}
            >
              {complete ? <Check size={13} strokeWidth={3} /> : step}
            </div>
            <span className={`truncate text-[10px] font-bold ${current ? 'text-[#172235]' : 'text-[#747b7d]'}`}>{label}</span>
            {index < 2 && <span className="ml-auto h-px w-3 bg-[#d5d7d2]" aria-hidden="true" />}
          </div>
        );
      })}
    </nav>
  );
}

function LocationRow({ icon, label, value, tone = 'dark' }: { icon: ReactNode; label: string; value: string; tone?: 'dark' | 'muted' }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center ${tone === 'dark' ? 'bg-[#172235] text-[#f5b719]' : 'bg-[#e8ebe5] text-[#657074]'}`}>
        {icon}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#7b8182]">{label}</p>
        <p className="mt-1 truncate text-[13px] font-bold text-[#172235]">{value}</p>
      </div>
    </div>
  );
}

function TripStatus({ tripState, onCancel, onProgress }: { tripState: TripState; onCancel: () => void; onProgress: () => void }) {
  if (tripState === 'cancelled') {
    return (
      <section className="border border-[#d9dcd6] bg-[#f7f8f4] p-4" aria-live="polite">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-[#e7e9e2] text-[#5d666a]"><X size={16} /></div>
          <div>
            <p className="text-sm font-bold text-[#172235]">Demande annulée</p>
            <p className="mt-1 text-xs leading-5 text-[#657074]">Vous pouvez lancer une nouvelle recherche quand vous êtes prêt.</p>
          </div>
        </div>
      </section>
    );
  }

  if (tripState === 'ready') return null;

  const assigned = tripState === 'assigned' || tripState === 'in-progress';
  return (
    <section className="border border-[#172235] bg-[#172235] p-4 text-white" aria-live="polite">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#f5b719]">
          {tripState === 'searching' ? 'Recherche en cours' : tripState === 'in-progress' ? 'Trajet en cours' : 'Chauffeur trouvé'}
        </p>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-white/65">
          <span className={`h-1.5 w-1.5 rounded-full ${tripState === 'searching' ? 'animate-pulse bg-[#f5b719]' : 'bg-[#80c59a]'}`} />
          {tripState === 'searching' ? 'Dakar' : tripState === 'in-progress' ? 'En route' : 'Arrivée dans 5 min'}
        </span>
      </div>
      {tripState === 'searching' ? (
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-white/15 bg-white/10"><Navigation size={18} className="text-[#f5b719]" /></div>
          <div>
            <p className="text-[13px] font-bold">Nous trouvons le chauffeur le plus proche</p>
            <p className="mt-1 text-[11px] text-white/60">Cela prend généralement moins d’une minute.</p>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-[#f5b719] text-[#172235]"><CarFront size={20} /></div>
              <div>
                <p className="text-[14px] font-bold">Mamadou Ndiaye</p>
                <p className="mt-1 text-[11px] text-white/60">Toyota Corolla · DK-4821-AB</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[17px] font-black text-[#f5b719]">5 min</p>
              <p className="mt-1 text-[10px] text-white/55">1,2 km</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href="tel:+221770000000" className="inline-flex items-center justify-center gap-2 border border-white/20 px-3 py-2.5 text-[11px] font-bold text-white"><Phone size={14} /> Appeler</a>
            <a href="https://wa.me/221770000000" className="inline-flex items-center justify-center gap-2 border border-[#f5b719]/45 bg-[#f5b719]/10 px-3 py-2.5 text-[11px] font-bold text-white"><MessageCircle size={14} /> WhatsApp</a>
          </div>
          {tripState === 'assigned' && (
            <button type="button" onClick={onProgress} className="mt-3 flex w-full items-center justify-center gap-2 border border-white/15 py-2 text-[10px] font-bold text-white/70">
              Simuler l’arrivée du chauffeur <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}
      {tripState !== 'in-progress' && (
        <button type="button" onClick={onCancel} className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-white/55 underline decoration-white/25 underline-offset-4">Annuler la demande</button>
      )}
    </section>
  );
}

export function Booking() {
  const [destination, setDestination] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [tripState, setTripState] = useState<TripState>('ready');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const canRequest = destination.trim().length > 1 && tripState === 'ready';
  const activeStep = tripState === 'ready' ? (destination ? 3 : 2) : 3;
  const selectPlace = (place: string) => {
    setDestination(place);
    setShowSuggestions(false);
  };

  return (
    <main className="transport-scroll min-h-[100dvh] bg-[#f2f3ef] text-[#172235]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col">
        <header className="flex items-center justify-between border-b border-[#d9dcd6] bg-[#f2f3ef] px-4 py-3.5">
          <button type="button" aria-label="Retour à la boutique" className="inline-flex items-center gap-2 text-[12px] font-bold text-[#172235]">
            <ArrowLeft size={16} /> Transport
          </button>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#697173]">
            <span className="h-2 w-2 bg-[#f5b719]" /> Dakar
          </div>
        </header>

        <div className="flex-1 px-4 pb-28 pt-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#777f80]">Nouvelle course</p>
              <h1 className="mt-1 text-[25px] font-black tracking-[-.05em] text-[#172235]">Réservation</h1>
            </div>
            <div className="border border-[#d4d7d1] bg-[#f8f9f5] px-2.5 py-2 text-right">
              <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#818789]">Aujourd’hui</p>
              <p className="mt-0.5 font-mono text-[11px] font-bold text-[#172235]">14:32</p>
            </div>
          </div>

          <div className="mt-5">
            <Stepper active={activeStep} />
          </div>

          <section className="mt-5 border border-[#d9dcd6] bg-[#f8f9f5] p-4" aria-label="Détails du trajet">
            <div className="flex items-center justify-between border-b border-[#e1e3de] pb-3">
              <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#697173]">Votre trajet</p>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#3e805e]"><ShieldCheck size={13} /> GPS précis</span>
            </div>
            <div className="space-y-4 pt-4">
              <LocationRow icon={<Navigation size={15} />} label="Départ" value="Position actuelle · Dakar" />
              <div className="ml-4 h-3 border-l border-dashed border-[#b8beb9]" aria-hidden="true" />
              <div className="relative">
                <label htmlFor="destination" className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-[#f5b719] text-[#172235]"><MapPin size={15} /></div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#7b8182]">Destination</span>
                    <input
                      id="destination"
                      value={destination}
                      onChange={(event) => { setDestination(event.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      aria-label="Destination à Dakar"
                      placeholder="Quartier, lieu ou adresse"
                      className="mt-1 w-full border-b border-[#aeb4b0] bg-transparent pb-1 text-[13px] font-bold text-[#172235] outline-none placeholder:font-medium placeholder:text-[#9a9f9e] focus:border-[#172235]"
                    />
                  </div>
                </label>
                {showSuggestions && tripState === 'ready' && (
                  <div className="absolute left-11 right-0 top-[57px] z-10 border border-[#cdd1cb] bg-[#fffefa] shadow-[0_8px_18px_rgba(23,34,53,.08)]">
                    {places.filter((place) => place.name.toLowerCase().includes(destination.toLowerCase())).map((place) => (
                      <button key={place.name} type="button" onClick={() => selectPlace(place.name)} className="flex w-full items-center justify-between border-b border-[#eceee9] px-3 py-3 text-left last:border-0">
                        <span><span className="block text-[12px] font-bold text-[#172235]">{place.name}</span><span className="mt-0.5 block text-[10px] text-[#7b8182]">{place.detail}</span></span>
                        <ArrowRight size={14} className="text-[#8b9292]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mt-3 border border-[#d9dcd6] bg-[#f8f9f5]">
            <button type="button" onClick={() => setShowContact((value) => !value)} className="flex w-full items-center justify-between px-4 py-3.5 text-left" aria-expanded={showContact}>
              <span><span className="block text-[12px] font-bold">Coordonnées passager</span><span className="mt-1 block text-[10px] text-[#7b8182]">{showContact ? 'Pour que le chauffeur puisse vous joindre' : 'Facultatif'}</span></span>
              <ChevronDown size={16} className={`text-[#687173] transition-transform ${showContact ? 'rotate-180' : ''}`} />
            </button>
            {showContact && (
              <div className="grid gap-3 border-t border-[#e1e3de] px-4 pb-4 pt-3">
                <label className="text-[10px] font-bold uppercase tracking-[.1em] text-[#7b8182]">Téléphone
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Téléphone du passager" placeholder="+221 77 000 00 00" className="mt-1.5 w-full border border-[#cfd3cd] bg-[#fffefa] px-3 py-2.5 text-[12px] font-medium normal-case tracking-normal text-[#172235] outline-none focus:border-[#172235]" />
                </label>
                <label className="text-[10px] font-bold uppercase tracking-[.1em] text-[#7b8182]">Prénom
                  <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Prénom du passager" placeholder="Ex. Awa" className="mt-1.5 w-full border border-[#cfd3cd] bg-[#fffefa] px-3 py-2.5 text-[12px] font-medium normal-case tracking-normal text-[#172235] outline-none focus:border-[#172235]" />
                </label>
              </div>
            )}
          </section>

          <section className="mt-3 border border-[#d9dcd6] bg-[#f8f9f5] p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#697173]">Estimation</p><p className="mt-1 text-[10px] text-[#7b8182]">Position actuelle → {destination || 'destination'}</p></div>
              <p className="text-[20px] font-black tracking-[-.04em] text-[#172235]">{destination ? '2 800' : '—'} <span className="text-[11px] font-bold">FCFA</span></p>
            </div>
            <div className="mt-3 flex gap-4 border-t border-[#e1e3de] pt-3 text-[10px] font-semibold text-[#687173]">
              <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> 18–24 min</span>
              <span className="inline-flex items-center gap-1.5"><CarFront size={13} /> Taxi standard</span>
            </div>
          </section>

          <TripStatus tripState={tripState} onCancel={() => setTripState('cancelled')} onProgress={() => setTripState('in-progress')} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-[420px] border-t border-[#d3d6d0] bg-[#f2f3ef]/95 px-4 py-3 backdrop-blur-sm">
          {tripState === 'ready' ? (
            <button type="button" disabled={!canRequest} onClick={() => { setShowSuggestions(false); setTripState('searching'); }} className="flex w-full items-center justify-center gap-2 bg-[#f5b719] px-4 py-3.5 text-[13px] font-black text-[#172235] transition-opacity disabled:cursor-not-allowed disabled:opacity-45">
              Confirmer la demande <ArrowRight size={16} />
            </button>
          ) : tripState === 'cancelled' ? (
            <button type="button" onClick={() => setTripState('ready')} className="flex w-full items-center justify-center gap-2 bg-[#172235] px-4 py-3.5 text-[13px] font-black text-white">
              Nouvelle réservation <ArrowRight size={16} />
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-1 text-[11px] font-bold text-[#697173]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f5b719]" /> Demande active · vous pouvez suivre votre trajet ci-dessus</div>
          )}
        </div>
      </div>
    </main>
  );
}