import './_group.css';
import { ArrowLeft, ArrowRight, CarFront, MapPin, MessageCircle, Phone, RefreshCw, ShieldCheck } from 'lucide-react';

const suggestions = [
  { title: 'Plateau', detail: 'Plateau, Dakar' },
  { title: 'Almadies', detail: 'Almadies, Dakar' },
];

function LocationPanel() {
  return (
    <div className="rounded-[12px] border border-white/15 bg-black/[.16] p-2.5 text-white backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-white/65">
        <span>État de la localisation</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> En attente
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-5 text-white/90">
        Appuyez sur « Commander » pour autoriser votre position.
      </p>
    </div>
  );
}

function RequestForm() {
  return (
    <div className="rounded-[20px] border border-[hsl(var(--border))] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Étape finale</p>
          <h2 className="mt-1 text-xl font-black tracking-[-.04em]">Où allez-vous ?</h2>
        </div>
        <button type="button" className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Retour</button>
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <MapPin size={18} className="shrink-0" />
        <div>
          <p className="font-bold">Départ : votre position actuelle</p>
          <p className="mt-0.5 text-xs text-emerald-800">Position précise partagée automatiquement</p>
        </div>
      </div>
      <label className="mt-5 block text-sm font-bold">
        Destination
        <div className="relative mt-2">
          <input className="w-full rounded-xl border border-[hsl(var(--input))] px-4 py-3.5 text-sm outline-none" placeholder="Ex. Plateau, Almadies ou Fann" defaultValue="" />
          <div className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-xl border bg-white text-left shadow-xl">
            {suggestions.map((suggestion) => (
              <button type="button" key={suggestion.title} className="block w-full border-b px-4 py-3 text-left last:border-0">
                <span className="block text-sm font-bold text-slate-900">{suggestion.title}</span>
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">{suggestion.detail}</span>
              </button>
            ))}
          </div>
        </div>
        <span className="mt-1.5 block text-xs font-normal text-[hsl(var(--muted-foreground))]">Suggestions d’adresses et de repères dans Dakar.</span>
      </label>
      <label className="mt-5 block text-sm font-bold">
        Votre téléphone
        <input className="mt-2 w-full rounded-xl border border-[hsl(var(--input))] px-4 py-3.5 text-sm outline-none" placeholder="+221 77 000 00 00" />
      </label>
      <button type="button" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--shop-accent)] px-5 py-4 text-sm font-black text-white shadow-lg">
        <CarFront size={17} /> Demander un chauffeur <ArrowRight size={16} />
      </button>
      <p className="mt-3 text-center text-[11px] text-[hsl(var(--muted-foreground))]">Vos coordonnées servent uniquement à vous mettre en relation avec le chauffeur affecté.</p>
    </div>
  );
}

export function Current() {
  return (
    <main className="transport-scroll min-h-screen bg-[hsl(var(--background))] p-3 text-[hsl(var(--foreground))]">
      <section className="space-y-4">
        <button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--shop-accent)]">
          <ArrowLeft size={16} /> Retour à la boutique
        </button>
        <div className="relative overflow-hidden rounded-[20px] bg-[#0b1b2b] p-3 text-white shadow-xl">
          <img src="/__mockup/images/taxi-transport-hero.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-100" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,18,31,.60)_0%,rgba(5,18,31,.25)_65%,rgba(5,18,31,.10)_100%)]" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-white/80">
              <CarFront size={14} /> Taxi à la demande
            </span>
            <h1 className="mt-3 max-w-[285px] text-[1.7rem] font-black leading-[1.05] tracking-[-.06em]">Votre chauffeur, en un seul geste.</h1>
            <p className="mt-2 max-w-[315px] text-[12px] leading-5 text-white/80">Votre départ est détecté automatiquement. Entrez votre destination, confirmez votre téléphone et nous cherchons le chauffeur disponible le plus proche.</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-semibold text-white/85">
              <span className="inline-flex items-center gap-2"><MapPin size={14} className="text-[var(--shop-primary)]" />Position GPS automatique</span>
              <span className="inline-flex items-center gap-2"><Phone size={14} className="text-[var(--shop-primary)]" />Contact direct</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href="tel:+221770000000" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-[11px] font-bold text-white"><Phone size={14} />Appeler</a>
              <a href="https://wa.me/221770000000" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/20 px-3 py-2.5 text-[11px] font-bold text-white"><MessageCircle size={14} />WhatsApp</a>
            </div>
            <div className="mt-3">
              <LocationPanel />
            </div>
          </div>
        </div>
        <RequestForm />
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--shop-primary)]/15 text-[var(--shop-accent)]"><ShieldCheck size={20} /></div>
            <div><h2 className="font-bold">Simple et direct</h2><p className="text-xs text-[hsl(var(--muted-foreground))]">Aucun intermédiaire</p></div>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <p><span className="mr-2 font-black text-[var(--shop-accent)]">1</span><span className="font-bold">Localisez-vous</span><span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">Votre départ est détecté automatiquement.</span></p>
            <p><span className="mr-2 font-black text-[var(--shop-accent)]">2</span><span className="font-bold">Confirmez la destination</span></p>
          </div>
        </div>
        <p className="flex items-center justify-center gap-2 pb-4 text-[10px] text-[hsl(var(--muted-foreground))]"><RefreshCw size={12} /> Aperçu fidèle · données réseau simulées</p>
      </section>
    </main>
  );
}