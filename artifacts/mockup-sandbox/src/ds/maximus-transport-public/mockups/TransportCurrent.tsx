import { useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
} from "lucide-react";
import { Button } from "@workspace/maximus-transport-public/components/ui/button";
import { tokens } from "@workspace/maximus-transport-public/tokens";

type Point = { latitude: number; longitude: number };

const position: Point & { accuracy: number } = {
  latitude: 14.7167,
  longitude: -17.4677,
  accuracy: 18,
};

const places = [
  { label: "Place de l’Indépendance, Dakar", latitude: 14.6708, longitude: -17.4381 },
  { label: "Corniche Ouest, Dakar", latitude: 14.7065, longitude: -17.4868 },
];

function MapPlaceholder({ destination }: { destination?: Point }) {
  return (
    <div className="relative mt-3 h-52 overflow-hidden rounded-2xl border border-slate-200 bg-[#e9eee9]" aria-label="Carte du trajet Taxi">
      <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "linear-gradient(28deg, transparent 47%, #b7c4bb 48%, #b7c4bb 49%, transparent 50%), linear-gradient(110deg, transparent 48%, #c5d0c7 49%, #c5d0c7 50%, transparent 51%)", backgroundSize: "90px 70px, 120px 85px" }} />
      <div className="absolute left-[21%] top-[55%] h-3 w-3 rounded-full bg-red-600 ring-4 ring-red-100" />
      {destination && <div className="absolute right-[22%] top-[28%] flex h-7 w-7 items-center justify-center rounded-full bg-[#f2b705] text-[#18212b] shadow-md"><Check size={15} /></div>}
      <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-white/90 px-3 py-2 text-[10px] font-semibold text-slate-600 shadow-sm">
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />Arrêt client</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />Destination</span>
      </div>
    </div>
  );
}

export function TransportCurrent() {
  const [formOpen, setFormOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<(typeof places)[number] | null>(null);
  const [trip, setTrip] = useState(false);

  const theme = {
    primary: "#161d27",
    accent: "#f2b705",
    primaryForeground: "#f4f6f2",
    accentForeground: "#18212b",
  };
  const style = {
    "--transport-primary": theme.primary,
    "--transport-accent": theme.accent,
    "--transport-primary-foreground": theme.primaryForeground,
    "--transport-accent-foreground": theme.accentForeground,
    "--background": tokens.color.light.background,
    "--foreground": tokens.color.light.foreground,
    "--border": tokens.color.light.border,
    "--card": tokens.color.light.card,
    "--card-foreground": tokens.color.light.cardForeground,
    "--muted": tokens.color.light.muted,
    "--muted-foreground": tokens.color.light.mutedForeground,
    "--primary": "43 96% 49%",
    "--primary-foreground": "211 29% 14%",
    "--primary-border": theme.accent,
    "--ring": "43 96% 49%",
  } as CSSProperties;

  return (
    <section style={style} className="mx-auto min-h-screen w-full max-w-3xl overflow-hidden border border-[#d9dcd6] bg-[#f2f3ef] text-[var(--transport-primary)] shadow-sm sm:min-h-0 sm:max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d9dcd6] px-4 py-3.5 sm:px-6">
        <Button type="button" variant="ghost" size="sm" className="gap-2 text-[12px] font-bold" onClick={() => setFormOpen(false)}><ArrowLeft size={16} /> Taxi Urbain</Button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#697173]"><span className="h-2 w-2 bg-[var(--transport-accent)]" /> Dakar</span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700" aria-live="polite"><MapPin size={13} /> GPS actif · {position.accuracy} m</span>
        </div>
      </header>
      <div className="relative overflow-hidden border-b border-[#d9dcd6] bg-[#17202b]">
        <div className="relative aspect-[16/9] w-full bg-[linear-gradient(120deg,#17202b_0%,#345263_47%,#d39a32_100%)] sm:aspect-[16/6]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
          <p className="absolute bottom-3 left-4 text-[10px] font-black uppercase tracking-[.18em] text-white sm:bottom-5 sm:left-6">Taxi Urbain · Dakar</p>
        </div>
      </div>
      <div className="px-4 pb-24 pt-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#777f80]">Taxi Urbain · Dakar</p><h1 className="mt-1 text-[25px] font-black tracking-[-.05em] sm:text-3xl">{trip ? "Votre course" : "Commander un taxi"}</h1></div>
          <CarFront size={24} className="mt-1 text-[#697173]" aria-hidden="true" />
        </div>
        {formOpen && <nav aria-label="Progression de la commande" className="mt-5 flex items-center gap-2">
          {["Départ", "Destination", "Confirmation"].map((label, index) => <div key={label} className="flex min-w-0 flex-1 items-center gap-2"><span className={`flex h-6 w-6 shrink-0 items-center justify-center border text-[10px] font-bold ${index < 1 ? "border-[var(--transport-primary)] bg-[var(--transport-primary)] text-[var(--transport-primary-foreground)]" : index === 1 ? "border-[var(--transport-accent)] bg-[var(--transport-accent)] text-[var(--transport-accent-foreground)]" : "border-[#cfd2cd] text-[#737b7d]"}`}>{index < 1 ? <Check size={13} /> : index + 1}</span><span className={`truncate text-[10px] font-bold ${index === 1 ? "text-[var(--transport-primary)]" : "text-[#747b7d]"}`}>{label}</span>{index < 2 && <span className="ml-auto h-px w-3 bg-[#d5d7d2]" />}</div>)}
        </nav>}
        {!trip && !formOpen && <div className="mt-5 border border-[#d9dcd6] bg-[#f8f9f5] p-4 sm:p-6"><p className="text-sm font-bold">Déplacez-vous dans Dakar en toute simplicité.</p><p className="mt-2 text-xs leading-5 text-[#657074]">Activez votre GPS au moment de commander pour trouver un chauffeur proche de votre position.</p><Button type="button" onClick={() => setFormOpen(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-none bg-[var(--transport-accent)] px-4 py-3.5 text-[13px] font-black text-[var(--transport-accent-foreground)] hover:bg-[var(--transport-accent)]"><CarFront size={16} />Commander un taxi<ArrowRight size={16} /></Button></div>}
        {formOpen && !trip && <form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); if (destination) setTrip(true); }}>
          <section className="border border-[#d9dcd6] bg-[#f8f9f5] px-4 py-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[12px] font-bold">Coordonnées passager</p><p className="mt-1 text-[10px] text-[#7b8182]">Le téléphone est nécessaire pour que le chauffeur puisse vous joindre.</p></div><span className="text-[10px] font-bold uppercase tracking-[.1em]" style={{ color: theme.primary }}>Requis</span></div><div className="mt-3 grid gap-3 border-t border-[#e1e3de] pt-3"><label className="text-[10px] font-bold uppercase tracking-[.1em] text-[#7b8182]">Téléphone<input type="tel" placeholder="+221 77 000 00 00" className="mt-1.5 w-full border border-[#cfd3cd] bg-[#fffefa] px-3 py-2.5 text-[12px] font-medium normal-case tracking-normal outline-none" /></label><label className="text-[10px] font-bold uppercase tracking-[.1em] text-[#7b8182]">Prénom<input placeholder="Ex. Awa" className="mt-1.5 w-full border border-[#cfd3cd] bg-[#fffefa] px-3 py-2.5 text-[12px] font-medium normal-case tracking-normal outline-none" /></label></div></section>
          <section className="border border-[#d9dcd6] bg-[#f8f9f5] p-4"><div className="flex items-center justify-between border-b border-[#e1e3de] pb-3"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#697173]">Votre trajet</p><span className="text-[10px] font-bold text-[#3e805e]">GPS précis · {position.accuracy} m</span></div><div className="space-y-4 pt-4"><div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ backgroundColor: theme.primary, color: theme.primaryForeground }}><MapPin size={15} /></div><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#7b8182]">Départ</p><p className="mt-1 text-[13px] font-bold">Position actuelle · Dakar</p></div></div><div className="ml-4 h-3 border-l border-dashed border-[#b8beb9]" /><label className="relative flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ backgroundColor: theme.accent, color: theme.accentForeground }}><MapPin size={15} /></div><div className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#7b8182]">Destination</span><input required value={destination} onChange={(event) => { setDestination(event.target.value); setSelectedPlace(null); }} className="mt-1 w-full border-b border-[#aeb4b0] bg-transparent pb-1 text-[13px] font-bold outline-none placeholder:font-medium placeholder:text-[#9a9f9e]" placeholder="Quartier, lieu ou adresse" autoComplete="off" />{destination.length > 1 && !selectedPlace && <div className="absolute left-11 right-0 top-[57px] z-10 overflow-hidden border border-[#cdd1cb] bg-[#fffefa] shadow-lg">{places.map((place) => <button key={place.label} type="button" onClick={() => { setSelectedPlace(place); setDestination(place.label); }} className="block w-full border-b border-[#eceee9] px-3 py-3 text-left last:border-0 hover:bg-[#f2f3ef]"><span className="block text-[12px] font-bold">{place.label.split(",")[0]}</span><span className="mt-0.5 block text-[10px] text-[#7b8182]">{place.label}</span></button>)}</div>}</div></label></div></section>
          <section className="border border-[#d9dcd6] bg-[#f8f9f5] p-4"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#697173]">Estimation</p><p className="mt-1 text-[10px] text-[#7b8182]">Position actuelle → {destination || "destination"}</p></div><p className="text-[20px] font-black">{destination ? "2 850 XOF" : "—"}</p></div>{destination && <><div className="mt-3 flex gap-4 border-t border-[#e1e3de] pt-3 text-[10px] font-semibold text-[#687173]"><span><Clock3 size={13} className="mr-1 inline" />18 min</span><span><CarFront size={13} className="mr-1 inline" />6.2 km</span></div><MapPlaceholder destination={selectedPlace ?? undefined} /></>}</section>
          <p className="pb-2 text-center text-[11px] text-[#657074]">Vos coordonnées sont partagées uniquement avec le chauffeur affecté par MAXIMUS.</p>
          <Button type="submit" className="flex w-full items-center justify-center gap-2 rounded-none bg-[var(--transport-accent)] px-4 py-3.5 text-[13px] font-black text-[var(--transport-accent-foreground)] hover:bg-[var(--transport-accent)]"><CarFront size={16} />Commander un taxi<ArrowRight size={16} /></Button>
        </form>}
        {trip && <div className="mt-5 border border-[#d9dcd6] bg-[#f8f9f5] p-4"><div className="flex items-center justify-between border-b border-[#e1e3de] pb-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#3e805e]">Demande enregistrée</p><h2 className="mt-1 text-lg font-black">Attribution en cours</h2></div><Check className="text-[#3e805e]" size={22} /></div><p className="mt-3 text-sm leading-6 text-[#657074]">Votre demande est transmise aux chauffeurs disponibles à proximité.</p><div className="mt-5 flex items-center gap-2 text-[10px] font-bold text-emerald-700"><RefreshCw size={14} className="animate-spin" />Actualisé toutes les 5 s</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><a href="tel:+221770000000" className="inline-flex items-center justify-center gap-2 border border-[#cfd3cd] px-4 py-3 text-sm font-bold"><Phone size={16} />Appeler</a><a href="https://wa.me/221770000000" className="inline-flex items-center justify-center gap-2 border border-[#b6d9c4] bg-[#edf8f0] px-4 py-3 text-sm font-bold text-[#287047]"><MessageCircle size={16} />WhatsApp</a></div><Button type="button" variant="link" onClick={() => { setTrip(false); setFormOpen(false); setDestination(""); }} className="mt-4 px-0 text-xs font-bold" style={{ color: "var(--transport-primary)" }}>Demander une autre course</Button></div>}
      </div>
    </section>
  );
}