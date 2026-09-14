import { useEffect, useRef, useState } from 'react';
import { CarFront, Check, Clock3, MapPin, Navigation, RefreshCw, ShieldCheck, X } from 'lucide-react';
import {
  createEcommerceApi,
  type EcommerceTaxiDriver,
  type EcommerceTaxiRequest,
} from '@/lib/ecommerce-api';
import { showAppToast } from '@/hooks/use-toast';

const statusLabels: Record<EcommerceTaxiRequest['status'], string> = {
  DEMANDEE: 'En attente',
  PROPOSEE: 'Nouvelle course',
  ACCEPTEE: 'Acceptée',
  CHAUFFEUR_EN_APPROCHE: 'En approche',
  CLIENT_A_BORD: 'Client à bord',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export default function TaxiDriverPage({ companyId }: { companyId: string }) {
  const api = createEcommerceApi(companyId);
  const [driver, setDriver] = useState<EcommerceTaxiDriver | null>(null);
  const [requests, setRequests] = useState<EcommerceTaxiRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const previousRequestIds = useRef<Set<string>>(new Set());

  const load = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const result = await api.taxiDriverSession();
      const nextRequests = Array.isArray(result.requests) ? result.requests : [];
      if (previousRequestIds.current.size > 0) {
        nextRequests.filter(request => request.status === 'PROPOSEE' && !previousRequestIds.current.has(request.id)).forEach(request => {
          showAppToast(`Nouvelle course ${request.reference} à accepter ou refuser.`, 'info');
        });
      }
      previousRequestIds.current = new Set(nextRequests.map(request => request.id));
      setDriver(result.driver);
      setRequests(nextRequests);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'L’espace chauffeur n’est pas disponible.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 15_000);
    return () => window.clearInterval(interval);
  }, [companyId]);

  const sendLocation = (status: 'OFFLINE' | 'AVAILABLE') => {
    if (status === 'OFFLINE' || !navigator.geolocation) {
      void updateSession({ status });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => void updateSession({
        status,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      () => void updateSession({ status }),
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 },
    );
  };

  const updateSession = async (body: { status: 'OFFLINE' | 'AVAILABLE'; latitude?: number; longitude?: number }) => {
    setBusy('status');
    try {
      const updated = await api.updateTaxiDriverSession(body);
      setDriver(updated);
      showAppToast(body.status === 'AVAILABLE' ? 'Vous êtes maintenant disponible.' : 'Vous êtes hors ligne.', 'success');
    } catch (cause) {
      showAppToast(cause instanceof Error ? cause.message : 'Le statut n’a pas pu être mis à jour.', 'error');
    } finally {
      setBusy('');
    }
  };

  const act = async (request: EcommerceTaxiRequest, action: 'ACCEPT' | 'REFUSE' | 'START_APPROACH' | 'BOARD' | 'COMPLETE' | 'CANCEL') => {
    setBusy(request.id);
    try {
      const updated = await api.updateTaxiRequestByDriver(request.id, action);
      setRequests(current => current.map(item => item.id === updated.id ? updated : item).filter(item => item.status !== 'TERMINEE' && item.status !== 'ANNULEE'));
      const message = action === 'REFUSE' ? 'La course a été refusée.' : action === 'COMPLETE' ? 'Course terminée.' : 'Statut de la course mis à jour.';
      showAppToast(message, 'success');
      if (action === 'COMPLETE' || action === 'CANCEL') setDriver(current => current ? { ...current, status: 'AVAILABLE' } : current);
    } catch (cause) {
      showAppToast(cause instanceof Error ? cause.message : 'La course n’a pas pu être mise à jour.', 'error');
    } finally {
      setBusy('');
    }
  };

  if (loading) return <div className="card-surface rounded-2xl p-8"><RefreshCw className="animate-spin text-[hsl(var(--primary))]" size={20} /><p className="mt-3 text-sm">Chargement de votre espace chauffeur…</p></div>;
  if (error && !driver) return <div className="card-surface rounded-2xl p-8"><p className="font-bold">Espace chauffeur indisponible</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{error}</p><button type="button" onClick={() => void load()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><RefreshCw size={14} />Réessayer</button></div>;
  if (!driver) return null;

  return <div className="space-y-5 fade-up">
    {error && <div className="rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">{error}</div>}
    <section className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">Espace chauffeur</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-.03em]">{driver.displayName}</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{driver.vehicleMake || 'Véhicule'} {driver.vehicleModel} · {driver.licensePlate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => sendLocation('AVAILABLE')} disabled={busy === 'status' || driver.verificationStatus !== 'VERIFIED'} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Navigation size={14} />Disponible</button>
          <button type="button" onClick={() => sendLocation('OFFLINE')} disabled={busy === 'status'} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold disabled:opacity-50"><X size={14} />Hors ligne</button>
          <button type="button" onClick={() => void load(true)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />Actualiser</button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[hsl(var(--muted)/.45)] p-4"><p className="text-xs text-[hsl(var(--muted-foreground))]">Statut</p><p className="mt-1 text-lg font-black">{driver.status === 'AVAILABLE' ? 'Disponible' : driver.status === 'OFFLINE' ? 'Hors ligne' : driver.status === 'APPROACHING' ? 'En approche' : 'En course'}</p></div>
        <div className="rounded-xl bg-[hsl(var(--muted)/.45)] p-4"><p className="text-xs text-[hsl(var(--muted-foreground))]">Vérification</p><p className="mt-1 inline-flex items-center gap-1.5 text-lg font-black"><ShieldCheck size={17} className="text-emerald-600" />{driver.verificationStatus === 'VERIFIED' ? 'Validé' : 'En attente'}</p></div>
        <div className="rounded-xl bg-[hsl(var(--muted)/.45)] p-4"><p className="text-xs text-[hsl(var(--muted-foreground))]">Position</p><p className="mt-1 text-sm font-bold">{driver.lastLocationAt ? formatDate(driver.lastLocationAt) : 'Pas encore transmise'}</p></div>
      </div>
    </section>
    <section className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">Notifications</p><h2 className="mt-1 text-xl font-bold">Courses à traiter</h2></div><span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-bold">{requests.length}</span></div>
      {requests.length === 0 ? <div className="mt-6 rounded-xl border border-dashed p-8 text-center"><Clock3 className="mx-auto text-[hsl(var(--muted-foreground))]" size={22} /><p className="mt-3 text-sm font-bold">Aucune course en attente</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">L’écran se met à jour automatiquement.</p></div> : <div className="mt-5 space-y-3">{requests.map(request => <article key={request.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">{request.reference}</p><h3 className="mt-1 text-base font-bold">{request.pickupAddress}</h3><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Destination : {request.destinationAddress}</p></div><span className="rounded-full bg-[hsl(var(--primary)/.1)] px-3 py-1 text-xs font-bold text-[hsl(var(--primary))]">{statusLabels[request.status]}</span></div><div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[hsl(var(--muted-foreground))]"><span className="inline-flex items-center gap-1.5"><MapPin size={14} />{request.assignedDistanceKm !== null ? `${request.assignedDistanceKm} km` : 'Distance non calculée'}</span><span className="inline-flex items-center gap-1.5"><CarFront size={14} />{request.passengerCount} passager{request.passengerCount > 1 ? 's' : ''}</span><span>{formatDate(request.createdAt)}</span></div><div className="mt-4 flex flex-wrap gap-2 border-t pt-3">{request.status === 'PROPOSEE' && <><button type="button" disabled={busy === request.id} onClick={() => void act(request, 'ACCEPT')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Check size={14} />Accepter</button><button type="button" disabled={busy === request.id} onClick={() => void act(request, 'REFUSE')} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"><X size={14} />Refuser</button></>}{request.status === 'ACCEPTEE' && <button type="button" disabled={busy === request.id} onClick={() => void act(request, 'START_APPROACH')} className="rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">Démarrer l’approche</button>}{request.status === 'CHAUFFEUR_EN_APPROCHE' && <button type="button" disabled={busy === request.id} onClick={() => void act(request, 'BOARD')} className="rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">Client à bord</button>}{request.status === 'CLIENT_A_BORD' && <button type="button" disabled={busy === request.id} onClick={() => void act(request, 'COMPLETE')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Terminer la course</button>}{['ACCEPTEE', 'CHAUFFEUR_EN_APPROCHE'].includes(request.status) && <button type="button" disabled={busy === request.id} onClick={() => void act(request, 'CANCEL')} className="rounded-lg border px-3 py-2 text-xs font-bold">Annuler</button>}</div></article>)}</div>}
    </section>
  </div>;
}