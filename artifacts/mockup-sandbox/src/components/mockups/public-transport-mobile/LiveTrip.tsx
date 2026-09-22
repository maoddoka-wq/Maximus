import './_group.css';
import { useState } from 'react';
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
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

type TripState = 'assigned' | 'searching' | 'cancelled';

const driver = {
  name: 'Mamadou Ndiaye',
  vehicle: 'Toyota Corolla blanche',
  plate: 'DK 3487 AE',
  phone: '+221770421884',
};

function RouteLine({ active = false }: { active?: boolean }) {
  return (
    <div className="relative flex w-8 shrink-0 flex-col items-center" aria-hidden="true">
      <span className={`mt-1.5 h-3 w-3 rounded-full border-[3px] ${active ? 'border-[#f5b719] bg-[#172235]' : 'border-[#172235] bg-[#f6f0e2]'}`} />
      <span className="my-1 h-9 w-px bg-[#c8c3b7]" />
      <span className="mb-1 h-3 w-3 rotate-45 rounded-[2px] bg-[#f5b719] ring-2 ring-[#f6f0e2]" />
    </div>
  );
}

function StatusPill({ state }: { state: TripState }) {
  const copy = state === 'assigned' ? 'Chauffeur trouvé' : state === 'searching' ? 'Recherche en cours' : 'Course annulée';
  const dot = state === 'assigned' ? 'bg-[#2c8a68]' : state === 'searching' ? 'bg-[#f5b719]' : 'bg-[#8a4b42]';

  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#526070]">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {copy}
    </span>
  );
}

function TripRoute({ onEdit }: { onEdit: () => void }) {
  return (
    <section className="border-y border-[#ddd7ca] py-4" aria-labelledby="route-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="route-title" className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#667282]">
          Itinéraire confirmé
        </h2>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-[12px] font-bold text-[#172235] underline decoration-[#f5b719] decoration-2 underline-offset-4"
        >
          Modifier
          <ChevronDown size={13} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <RouteLine active />
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b9198]">Départ</p>
            <p className="mt-0.5 truncate text-[14px] font-bold text-[#172235]">Position actuelle</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#2c8a68]">
              <Check size={12} strokeWidth={3} aria-hidden="true" /> GPS précis · 12 m
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b9198]">Destination</p>
            <p className="mt-0.5 truncate text-[14px] font-bold text-[#172235]">Corniche Ouest, Dakar</p>
            <p className="mt-0.5 text-[11px] text-[#667282]">Par la VDN · 7,4 km environ</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AssignedDriver() {
  return (
    <section className="border-b border-[#ddd7ca] py-4" aria-labelledby="driver-title">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#172235] text-[13px] font-bold text-[#f5b719]" aria-hidden="true">
          MN
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p id="driver-title" className="text-[15px] font-extrabold text-[#172235]">{driver.name}</p>
              <p className="mt-0.5 text-[12px] text-[#667282]">{driver.vehicle}</p>
            </div>
            <span className="rounded-sm bg-[#e8f2ec] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#287254]">Attribué</span>
          </div>
          <p className="mt-2 font-mono text-[12px] font-bold tracking-[0.08em] text-[#526070]">{driver.plate}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={`tel:${driver.phone}`}
          aria-label={`Appeler ${driver.name}`}
          className="inline-flex h-10 items-center justify-center gap-2 border border-[#c9c4b8] bg-[#fbf8f0] text-[12px] font-bold text-[#172235] transition-colors hover:bg-[#f2ecdf]"
        >
          <Phone size={15} aria-hidden="true" /> Appeler
        </a>
        <a
          href={`https://wa.me/${driver.phone.replace('+', '')}`}
          aria-label={`Écrire à ${driver.name} sur WhatsApp`}
          className="inline-flex h-10 items-center justify-center gap-2 border border-[#b7d5c3] bg-[#eef7f1] text-[12px] font-bold text-[#287254] transition-colors hover:bg-[#e3f2e9]"
        >
          <MessageCircle size={15} aria-hidden="true" /> Message
        </a>
      </div>
    </section>
  );
}

function SearchingDriver() {
  return (
    <section className="border-b border-[#ddd7ca] py-5" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e6bd38] bg-[#fff4cc] text-[#172235]">
          <Navigation size={19} aria-hidden="true" />
          <span className="absolute inset-0 animate-ping rounded-full border border-[#f5b719] opacity-30" />
        </div>
        <div>
          <p className="text-[15px] font-extrabold text-[#172235]">Nous cherchons un chauffeur</p>
          <p className="mt-1 text-[12px] leading-4 text-[#667282]">Les véhicules disponibles près de vous sont contactés.</p>
        </div>
      </div>
      <div className="mt-4 h-1 overflow-hidden bg-[#e8e2d6]">
        <div className="h-full w-2/3 animate-pulse bg-[#f5b719]" />
      </div>
      <p className="mt-2 text-[11px] text-[#667282]">Temps d’attente habituel à Dakar : 2 à 6 min</p>
    </section>
  );
}

function CancelledState({ onRepeat }: { onRepeat: () => void }) {
  return (
    <section className="border-b border-[#ddd7ca] py-5" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5e8e4] text-[#8a4b42]">
          <X size={19} aria-hidden="true" />
        </div>
        <div>
          <p className="text-[15px] font-extrabold text-[#172235]">Course annulée</p>
          <p className="mt-1 text-[12px] leading-4 text-[#667282]">Aucun chauffeur n’a été contacté pour cette demande.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRepeat}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 border border-[#c9c4b8] bg-[#fbf8f0] text-[12px] font-bold text-[#172235]"
      >
        <RefreshCw size={14} aria-hidden="true" /> Refaire cette demande
      </button>
    </section>
  );
}

export function LiveTrip() {
  const [tripState, setTripState] = useState<TripState>('assigned');
  const [showDestination, setShowDestination] = useState(false);

  const isAssigned = tripState === 'assigned';
  const isCancelled = tripState === 'cancelled';

  return (
    <main className="transport-scroll min-h-[100dvh] bg-[#f6f0e2] px-4 pb-24 text-[#172235]">
      <div className="mx-auto max-w-[390px]">
        <header className="flex h-[58px] items-center justify-between border-b border-[#ddd7ca]" aria-label="Navigation principale">
          <button type="button" aria-label="Retour" className="flex h-9 w-9 items-center justify-center text-[#172235]">
            <ArrowLeft size={19} aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center bg-[#f5b719] text-[11px] font-black text-[#172235]">M</span>
            <span className="text-[13px] font-black tracking-[0.12em]">MAXIMUS</span>
          </div>
          <button
            type="button"
            onClick={() => setTripState('searching')}
            aria-label="Actualiser le statut de la course"
            className="flex h-9 w-9 items-center justify-center text-[#526070]"
          >
            <RefreshCw size={17} aria-hidden="true" />
          </button>
        </header>

        <div className="pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#667282]">Transport · Dakar</p>
              <h1 className="mt-1 text-[26px] font-black leading-none tracking-[-0.05em]">
                {isCancelled ? 'Course terminée' : isAssigned ? 'Votre course est en route' : 'Votre demande est envoyée'}
              </h1>
            </div>
            <CarFront size={23} strokeWidth={1.8} className="mt-1 text-[#526070]" aria-hidden="true" />
          </div>

          <div className="mt-4 flex items-center justify-between border-l-2 border-[#f5b719] pl-3" aria-live="polite">
            <div>
              <StatusPill state={tripState} />
              <p className="mt-1 text-[13px] font-semibold text-[#172235]">
                {isCancelled ? 'Votre itinéraire reste enregistré' : isAssigned ? 'Arrivée estimée dans 4 min' : 'Attribution en cours'}
              </p>
            </div>
            {!isCancelled && (
              <div className="flex items-center gap-1.5 text-right">
                <Clock3 size={15} className="text-[#667282]" aria-hidden="true" />
                <span className="font-mono text-[16px] font-bold text-[#172235]">{isAssigned ? '04:00' : '—:——'}</span>
              </div>
            )}
          </div>

          <div className="mt-5 border border-[#d8d1c3] bg-[#fbf8f0] px-4">
            <TripRoute onEdit={() => setShowDestination((value) => !value)} />

            {showDestination && (
              <div className="border-b border-[#ddd7ca] py-3" aria-label="Modifier la destination">
                <label htmlFor="new-destination" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#667282]">Nouvelle destination</label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="new-destination"
                    defaultValue="Corniche Ouest, Dakar"
                    className="min-w-0 flex-1 border border-[#c9c4b8] bg-[#f6f0e2] px-3 py-2 text-[12px] font-semibold outline-none focus:border-[#172235] focus:ring-1 focus:ring-[#172235]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDestination(false)}
                    className="border border-[#172235] bg-[#172235] px-3 text-[11px] font-bold text-[#fbf8f0]"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}

            {isAssigned && <AssignedDriver />}
            {tripState === 'searching' && <SearchingDriver />}
            {isCancelled && <CancelledState onRepeat={() => setTripState('searching')} />}

            <div className="flex items-start gap-2 py-3 text-[11px] leading-4 text-[#667282]">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#2c8a68]" aria-hidden="true" />
              <p>Votre position et votre numéro sont partagés uniquement avec le chauffeur de cette course.</p>
            </div>
          </div>

          {!isCancelled && (
            <div className="mt-4 flex items-center gap-2 text-[11px] text-[#667282]">
              <MapPin size={14} className="text-[#2c8a68]" aria-hidden="true" />
              <span>Départ confirmé avec une précision de 12 m</span>
            </div>
          )}
        </div>
      </div>

      {!isCancelled && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#d8d1c3] bg-[#f6f0e2]/95 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[390px] items-center gap-3">
            <button
              type="button"
              onClick={() => setTripState('cancelled')}
              className="h-12 shrink-0 border border-[#c9c4b8] bg-transparent px-4 text-[12px] font-bold text-[#8a4b42]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => setTripState(isAssigned ? 'searching' : 'assigned')}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 bg-[#f5b719] px-4 text-[13px] font-black text-[#172235] transition-colors hover:bg-[#e8aa08]"
            >
              {isAssigned ? 'Actualiser le suivi' : 'Continuer la recherche'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}