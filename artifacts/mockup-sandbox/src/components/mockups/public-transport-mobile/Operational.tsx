import './_group.css';
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
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';

type TripState = 'ready' | 'searching' | 'assigned' | 'progress';

const destinations = [
  { name: 'Plateau', detail: 'Centre-ville · Dakar', distance: '4,8 km' },
  { name: 'Almadies', detail: 'Route de la Corniche Ouest · Dakar', distance: '9,6 km' },
];

const stateCopy: Record<Exclude<TripState, 'ready'>, { label: string; title: string }> = {
  searching: { label: 'Recherche en cours', title: 'Nous cherchons un chauffeur' },
  assigned: { label: 'Chauffeur trouvé', title: 'Votre chauffeur arrive' },
  progress: { label: 'Trajet en cours', title: 'Bonne route vers Plateau' },
};

function TopBar({ tripState }: { tripState: TripState }) {
  return (
    <header className="flex items-center justify-between border-b border-[#dce0dc] bg-[#f7f8f4] px-4 py-3">
      <button
        type="button"
        aria-label="Retour à la boutique"
        className="flex h-8 w-8 items-center justify-center text-[#172235] transition-opacity hover:opacity-60"
      >
        <ArrowLeft size={18} strokeWidth={2.2} />
      </button>
      <div className="text-center leading-none">
        <p className="font-['Space_Mono'] text-[15px] font-bold tracking-[-.08em] text-[#172235]">
          MAXIMUS
        </p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[.2em] text-[#68726f]">
          Transport · Dakar
        </p>
      </div>
      <span
        className={`h-2 w-2 rounded-full ${tripState === 'ready' ? 'bg-[#258a61]' : 'bg-[#e3a70c]'}`}
        aria-label={tripState === 'ready' ? 'Service disponible' : 'Service actif'}
      />
    </header>
  );
}

function LocationReadiness() {
  return (
    <div className="flex items-center justify-between border-y border-[#dce0dc] py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#b9d9c8] bg-[#e8f4ed] text-[#237852]">
          <Crosshair size={16} strokeWidth={2.1} />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#172235]">Position actuelle</p>
          <p className="truncate text-[10px] text-[#68726f]">Avenue Cheikh Anta Diop, Dakar</p>
        </div>
      </div>
      <div className="pl-3 text-right">
        <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#237852]">Précise</p>
        <p className="mt-0.5 font-['Space_Mono'] text-[9px] text-[#68726f]">À l’instant</p>
      </div>
    </div>
  );
}

function DestinationField({
  destination,
  onDestinationChange,
  onChoose,
}: {
  destination: string;
  onDestinationChange: (value: string) => void;
  onChoose: (name: string) => void;
}) {
  const visibleDestinations = destinations.filter((item) =>
    item.name.toLowerCase().includes(destination.toLowerCase()),
  );

  return (
    <div>
      <label htmlFor="destination" className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-[#68726f]">
        Destination
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#172235]" size={17} />
        <input
          id="destination"
          value={destination}
          onChange={(event) => onDestinationChange(event.target.value)}
          placeholder="Quartier, lieu ou adresse"
          autoComplete="off"
          className="h-[50px] w-full border border-[#aab4af] bg-[#fbfcf9] pl-10 pr-10 text-[14px] font-semibold text-[#172235] outline-none transition-colors placeholder:text-[#8a9490] focus:border-[#172235] focus:ring-2 focus:ring-[#f5b719]/40"
        />
        {destination ? (
          <button
            type="button"
            aria-label="Effacer la destination"
            onClick={() => onDestinationChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#68726f] hover:text-[#172235]"
          >
            <X size={16} />
          </button>
        ) : (
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9490]" size={16} />
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#68726f]">
        <Navigation size={12} />
        <span>Suggestions dans Dakar</span>
      </div>
      {visibleDestinations.length > 0 && (
        <div className="mt-2 divide-y divide-[#e5e8e4] border border-[#d7ddd8] bg-[#fbfcf9]">
          {visibleDestinations.map((item, index) => (
            <button
              type="button"
              key={item.name}
              onClick={() => onChoose(item.name)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-[#f2f5ee]"
            >
              <span className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center bg-[#eef0eb] text-[#56615c]">
                  <MapPin size={13} />
                </span>
                <span>
                  <span className="block text-[12px] font-bold text-[#172235]">{item.name}</span>
                  <span className="mt-0.5 block text-[10px] text-[#68726f]">{item.detail}</span>
                </span>
              </span>
              <span className="font-['Space_Mono'] text-[9px] text-[#68726f]">{index === 0 ? item.distance : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Estimate({ destination }: { destination: string }) {
  const isAlmadies = destination === 'Almadies';
  return (
    <div className="border border-[#dce0dc] bg-[#f1f4ed]">
      <div className="flex items-center justify-between border-b border-[#dce0dc] px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#68726f]">Estimation</p>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#237852]">
          <Check size={12} /> Tarif indicatif
        </span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-[#dce0dc]">
        <div className="px-3 py-2.5">
          <p className="text-[10px] text-[#68726f]">Distance</p>
          <p className="mt-1 font-['Space_Mono'] text-[12px] font-bold text-[#172235]">{isAlmadies ? '9,6 km' : '4,8 km'}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[10px] text-[#68726f]">Durée</p>
          <p className="mt-1 font-['Space_Mono'] text-[12px] font-bold text-[#172235]">{isAlmadies ? '26 min' : '15 min'}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[10px] text-[#68726f]">À partir de</p>
          <p className="mt-1 font-['Space_Mono'] text-[12px] font-bold text-[#172235]">{isAlmadies ? '2 900' : '1 800'} F</p>
        </div>
      </div>
    </div>
  );
}

function TripStatus({
  tripState,
  onCancel,
  onAdvance,
}: {
  tripState: Exclude<TripState, 'ready'>;
  onCancel: () => void;
  onAdvance: () => void;
}) {
  const assigned = tripState !== 'searching';
  const progress = tripState === 'progress';
  return (
    <div className="space-y-3">
      <div className="border border-[#dce0dc] bg-[#fbfcf9]">
        <div className="flex items-center justify-between border-b border-[#dce0dc] px-3 py-3">
          <span className="flex items-center gap-2 text-[11px] font-bold text-[#172235]">
            <span className={`h-2 w-2 rounded-full ${progress ? 'bg-[#258a61]' : 'bg-[#e3a70c]'}`} />
            {stateCopy[tripState].label}
          </span>
          <span className="font-['Space_Mono'] text-[10px] text-[#68726f]">{progress ? 'En route' : 'MAINTENANT'}</span>
        </div>
        <div className="px-3 py-4">
          <div className="flex items-start gap-3">
            <div className="relative flex flex-col items-center">
              <span className="mt-1 h-2.5 w-2.5 border-2 border-[#237852] bg-[#fbfcf9]" />
              <span className="h-10 w-px bg-[#c8d0ca]" />
              <MapPin size={15} className="text-[#e3a70c]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[#68726f]">Départ · Position actuelle</p>
              <p className="mt-7 text-[11px] font-bold text-[#172235]">Plateau, Dakar</p>
            </div>
          </div>
          {!assigned && (
            <div className="mt-4 flex items-center gap-2 border-t border-[#e6e9e5] pt-3 text-[11px] text-[#68726f]">
              <Clock3 size={14} className="text-[#e3a70c]" />
              <span>Temps d’attente estimé : moins de 5 min</span>
            </div>
          )}
        </div>
      </div>
      {assigned && (
        <div className="border border-[#172235] bg-[#172235] p-3 text-[#f7f8f4]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center bg-[#f5b719] text-[#172235]">
                <CarFront size={18} />
              </div>
              <div>
                <p className="text-[12px] font-bold">Mamadou Sarr</p>
                <p className="mt-0.5 text-[10px] text-[#cbd2cd]">Toyota Corolla · DK 4381 AB</p>
              </div>
            </div>
            <span className="font-['Space_Mono'] text-[11px] font-bold text-[#f5b719]">{progress ? 'À bord' : '3 min'}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <a
              href="tel:+221770000000"
              className="flex h-9 flex-1 items-center justify-center gap-1.5 border border-white/20 text-[10px] font-bold text-white"
            >
              <Phone size={13} /> Appeler
            </a>
            <a
              href="https://wa.me/221770000000"
              className="flex h-9 flex-1 items-center justify-center gap-1.5 border border-white/20 text-[10px] font-bold text-white"
            >
              <MessageCircle size={13} /> Message
            </a>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-[10px] text-[#68726f]">
          <ShieldCheck size={13} className="text-[#237852]" /> Course suivie par MAXIMUS
        </p>
        <button type="button" onClick={onCancel} className="text-[10px] font-bold text-[#a33e31] underline underline-offset-2">
          Annuler la course
        </button>
      </div>
      {assigned && !progress && (
        <button type="button" onClick={onAdvance} className="w-full border border-[#aab4af] bg-[#f7f8f4] py-3 text-[11px] font-bold text-[#172235]">
          Simuler l’arrivée du chauffeur
        </button>
      )}
    </div>
  );
}

export function Operational() {
  const [destination, setDestination] = useState('Plateau');
  const [passengerName, setPassengerName] = useState('');
  const [phone, setPhone] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tripState, setTripState] = useState<TripState>('ready');

  const requestRide = () => {
    if (destination) setTripState('searching');
  };

  const resetRide = () => {
    setTripState('ready');
    setDestination('');
  };

  return (
    <main className="min-h-[100dvh] bg-[#f7f8f4] font-['DM_Sans'] text-[#172235]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col">
        <TopBar tripState={tripState} />
        <div className="flex-1 overflow-y-auto px-4 pb-5">
          {tripState === 'ready' ? (
            <div className="space-y-5 pt-5">
              <div>
                <p className="font-['Space_Mono'] text-[10px] font-bold uppercase tracking-[.18em] text-[#68726f]">Nouvelle course</p>
                <h1 className="mt-1.5 text-[25px] font-bold leading-[1.05] tracking-[-.045em]">Où allez-vous ?</h1>
              </div>
              <LocationReadiness />
              <section aria-label="Formulaire de demande de course" className="space-y-4">
                <DestinationField
                  destination={destination}
                  onDestinationChange={setDestination}
                  onChoose={(name) => setDestination(name)}
                />
                {destination && <Estimate destination={destination} />}
                <div className="border-y border-[#dce0dc]">
                  <button
                    type="button"
                    aria-expanded={detailsOpen}
                    onClick={() => setDetailsOpen((open) => !open)}
                    className="flex w-full items-center justify-between py-3 text-left"
                  >
                    <span className="flex items-center gap-2 text-[12px] font-bold text-[#172235]">
                      <span className="flex h-5 w-5 items-center justify-center border border-[#aab4af] text-[10px]">+</span>
                      Ajouter vos coordonnées <span className="font-normal text-[#68726f]">(facultatif)</span>
                    </span>
                    <ChevronDown size={16} className={`text-[#68726f] transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {detailsOpen && (
                    <div className="grid gap-3 pb-4">
                      <label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#68726f]">
                        Nom
                        <input
                          value={passengerName}
                          onChange={(event) => setPassengerName(event.target.value)}
                          placeholder="Votre nom"
                          className="mt-1.5 h-10 w-full border border-[#aab4af] bg-[#fbfcf9] px-3 text-[12px] font-normal normal-case tracking-normal outline-none focus:border-[#172235]"
                        />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#68726f]">
                        Téléphone
                        <input
                          type="tel"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="+221 77 000 00 00"
                          className="mt-1.5 h-10 w-full border border-[#aab4af] bg-[#fbfcf9] px-3 text-[12px] font-normal normal-case tracking-normal outline-none focus:border-[#172235]"
                        />
                      </label>
                      <p className="text-[10px] leading-4 text-[#68726f]">Ces informations servent uniquement à vous joindre pour cette course.</p>
                    </div>
                  )}
                </div>
              </section>
              <div className="flex items-start gap-2 text-[10px] leading-4 text-[#68726f]">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#237852]" />
                <p>Votre position est partagée uniquement avec le chauffeur affecté.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 pt-5">
              <div>
                <p className="font-['Space_Mono'] text-[10px] font-bold uppercase tracking-[.18em] text-[#68726f]">{stateCopy[tripState].label}</p>
                <h1 className="mt-1.5 text-[23px] font-bold leading-[1.05] tracking-[-.045em]">{stateCopy[tripState].title}</h1>
              </div>
              <TripStatus
                tripState={tripState}
                onCancel={resetRide}
                onAdvance={() => setTripState('progress')}
              />
            </div>
          )}
        </div>
        <footer className="sticky bottom-0 border-t border-[#dce0dc] bg-[#f7f8f4]/95 px-4 py-3 backdrop-blur-sm">
          {tripState === 'ready' ? (
            <button
              type="button"
              disabled={!destination}
              onClick={requestRide}
              className="flex h-[50px] w-full items-center justify-between bg-[#f5b719] px-4 text-[13px] font-bold text-[#172235] transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="flex items-center gap-2">
                <CarFront size={17} />
                Demander un chauffeur
              </span>
              <ArrowRight size={17} />
            </button>
          ) : (
            <button
              type="button"
              onClick={tripState === 'searching' ? resetRide : () => setTripState('progress')}
              className="flex h-[50px] w-full items-center justify-center gap-2 border border-[#aab4af] bg-[#fbfcf9] text-[12px] font-bold text-[#172235]"
            >
              {tripState === 'searching' ? (
                <>
                  <X size={16} /> Annuler la recherche
                </>
              ) : (
                <>
                  <Navigation size={16} /> Voir le suivi du trajet
                </>
              )}
            </button>
          )}
          <p className="pt-2 text-center font-['Space_Mono'] text-[8px] uppercase tracking-[.12em] text-[#8a9490]">Service disponible à Dakar</p>
        </footer>
      </div>
    </main>
  );
}