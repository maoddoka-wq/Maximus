import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FilePlus2,
  Gauge,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Route,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wrench,
  X,
} from 'lucide-react';
import {
  createTransportApi,
  type CreateDriverInput,
  type CreateTripInput,
  type CreateVehicleInput,
  type Driver,
  type DriverStatus,
  type TransportBootstrap,
  type Trip,
  type TripStatus,
  type Vehicle,
  type VehicleStatus,
} from '@/lib/transport-api';
import { showAppToast } from '@/hooks/use-toast';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

type TransportTab = 'overview' | 'courses' | 'chauffeurs' | 'vehicules';
type DialogKind = 'driver' | 'vehicle' | 'trip' | null;

const tabs: { id: TransportTab; label: string; icon: typeof Gauge; featureId: string }[] = [
  { id: 'overview', label: 'Vue d’ensemble', icon: Gauge, featureId: 'overview' },
  { id: 'courses', label: 'Courses', icon: Route, featureId: 'trips' },
  { id: 'chauffeurs', label: 'Chauffeurs', icon: UserRound, featureId: 'drivers' },
  { id: 'vehicules', label: 'Véhicules', icon: CarFront, featureId: 'vehicles' },
];

const transportTabByFeatureId: Record<string, TransportTab> = {
  overview: 'overview',
  trips: 'courses',
  courses: 'courses',
  drivers: 'chauffeurs',
  chauffeurs: 'chauffeurs',
  vehicles: 'vehicules',
  vehicules: 'vehicules',
};

const tripStatuses: TripStatus[] = ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const emptyData = (): TransportBootstrap => ({
  drivers: [],
  vehicles: [],
  trips: [],
  metrics: { activeDrivers: 0, availableVehicles: 0, todayTrips: 0, todayRevenue: 0 },
});

const dateLabel = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'Date inconnue'
    : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(parsed);
};

const money = (value: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} XOF`;

const statusLabels: Record<TripStatus, string> = {
  REQUESTED: 'Demandée',
  ASSIGNED: 'Assignée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

const nextTripStatuses = (status: TripStatus): TripStatus[] => ({
  REQUESTED: ['REQUESTED', 'ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['COMPLETED'],
  CANCELLED: ['CANCELLED'],
}[status] as TripStatus[]);

const statusTone = (status: TripStatus | DriverStatus | VehicleStatus) => {
  if (status === 'COMPLETED' || status === 'ACTIVE' || status === 'AVAILABLE') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
  if (status === 'CANCELLED' || status === 'INACTIVE' || status === 'MAINTENANCE') return 'bg-rose-500/10 text-rose-700 border-rose-500/20';
  if (status === 'IN_PROGRESS' || status === 'ON_TRIP') return 'bg-sky-500/10 text-sky-700 border-sky-500/20';
  return 'bg-amber-500/10 text-amber-800 border-amber-500/20';
};

const driverStatusLabel: Record<DriverStatus, string> = { ACTIVE: 'Actif', INACTIVE: 'Inactif' };
const vehicleStatusLabel: Record<VehicleStatus, string> = {
  AVAILABLE: 'Disponible',
  ON_TRIP: 'En course',
  MAINTENANCE: 'Maintenance',
};

export default function TransportModulePage({
  companyId,
  canCreate = true,
  canModify = true,
  allowedFeatureIds,
  featurePermissions,
  initialTab,
  employees = [],
  currentEmployeeId = null,
  singleModuleNavigation = false,
  preview = false,
}: {
  companyId: string;
  canCreate?: boolean;
  canModify?: boolean;
  allowedFeatureIds?: string[];
  featurePermissions?: Record<string, { canCreate: boolean; canModify: boolean }>;
  initialTab?: string;
  employees?: Array<{ id: string; firstName: string; lastName: string; phone: string; status: string }>;
  currentEmployeeId?: string | null;
  singleModuleNavigation?: boolean;
  preview?: boolean;
}) {
  const api = useMemo(() => createTransportApi(companyId), [companyId]);
  const visibleTabs = useMemo(
    () => allowedFeatureIds
      ? tabs.filter(tab => allowedFeatureIds.includes(tab.featureId) || allowedFeatureIds.includes(tab.id))
      : tabs,
    [allowedFeatureIds],
  );
  const requestedTab = initialTab ? transportTabByFeatureId[initialTab] : undefined;
  const [tab, setTab] = useState<TransportTab>(
    requestedTab && visibleTabs.some(item => item.id === requestedTab)
      ? requestedTab
      : visibleTabs[0]?.id ?? 'overview',
  );
  const [data, setData] = useState<TransportBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [locationError, setLocationError] = useState('');
  const [locationActive, setLocationActive] = useState(false);
  const latestPosition = useRef<{ latitude: number; longitude: number } | null>(null);
  const currentDriver = useMemo(
    () => currentEmployeeId ? data?.drivers.find(driver => driver.employeeId === currentEmployeeId) ?? null : null,
    [currentEmployeeId, data?.drivers],
  );
  const currentDriverId = currentDriver?.id ?? null;
  const canCreateTrips = featurePermissions ? Boolean(featurePermissions.trips?.canCreate) : canCreate;
  const canModifyTrips = featurePermissions ? Boolean(featurePermissions.trips?.canModify) : canModify;
  const canCreateDrivers = featurePermissions ? Boolean(featurePermissions.drivers?.canCreate) : canCreate;
  const canModifyDrivers = featurePermissions ? Boolean(featurePermissions.drivers?.canModify) : canModify;
  const canCreateVehicles = featurePermissions ? Boolean(featurePermissions.vehicles?.canCreate) : canCreate;

  useEffect(() => {
    const nextRequestedTab = initialTab ? transportTabByFeatureId[initialTab] : undefined;
    if (nextRequestedTab && visibleTabs.some(item => item.id === nextRequestedTab)) {
      setTab(nextRequestedTab);
    } else if (!visibleTabs.some(item => item.id === tab)) {
      setTab(visibleTabs[0]?.id ?? 'overview');
    }
  }, [initialTab, tab, visibleTabs]);

  const load = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    if (preview) {
      setData(emptyData());
      setError('');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const result = await api.bootstrap();
      setData({
        drivers: Array.isArray(result?.drivers) ? result.drivers : [],
        vehicles: Array.isArray(result?.vehicles) ? result.vehicles : [],
        trips: Array.isArray(result?.trips) ? result.trips : [],
        metrics: result?.metrics ?? emptyData().metrics,
      });
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger l’espace taxi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, [companyId, preview]);
  useAutoRefresh(() => load(true), { enabled: !preview && Boolean(data), intervalMs: 30_000 });

  useEffect(() => {
    if (preview || !currentDriverId || !canModifyDrivers || !navigator.geolocation) {
      setLocationActive(false);
      return undefined;
    }
    const sendLocation = (coords: { latitude: number; longitude: number }) => {
      latestPosition.current = coords;
      void api.updateDriverLocation(currentDriverId, coords).then(driver => {
        setData(current => current ? { ...current, drivers: current.drivers.map(item => item.id === driver.id ? driver : item) } : current);
      }).catch(cause => {
        setLocationError(cause instanceof Error ? cause.message : 'La position GPS n’a pas pu être partagée.');
      });
    };
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setLocationError('');
        setLocationActive(true);
        sendLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      },
      ({ code }) => {
        setLocationActive(false);
        setLocationError(code === 1
          ? 'Autorisez la localisation pour être proposé aux clients proches.'
          : 'La position GPS n’a pas pu être obtenue. Vérifiez le signal et réessayez.');
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 },
    );
    const refreshId = window.setInterval(() => {
      if (latestPosition.current) sendLocation(latestPosition.current);
    }, 30_000);
    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(refreshId);
    };
  }, [api, currentDriverId, canModifyDrivers, preview]);

  const run = async <T,>(action: () => Promise<T>, success: string) => {
    if (pendingAction) return;
    setPendingAction('action');
    try {
      await action();
      showAppToast(success, 'success');
      setDialog(null);
      if (!preview) void load(true);
    } catch (cause) {
      showAppToast(cause instanceof Error ? cause.message : 'Opération impossible.', 'error');
    } finally {
      setPendingAction('');
    }
  };

  const addPreviewDriver = (input: CreateDriverInput) => {
    if (!data) return;
    const employee = employees.find(item => item.id === input.employeeId);
    const driver: Driver = {
      id: `preview-driver-${Date.now()}`,
      companyId,
      name: employee ? `${employee.firstName} ${employee.lastName}` : 'Employé sélectionné',
      phone: employee?.phone ?? '',
      licenseNumber: input.licenseNumber,
      status: input.status,
      employeeId: input.employeeId,
      latitude: null,
      longitude: null,
      locationUpdatedAt: null,
    };
    setData(current => current ? { ...current, drivers: [driver, ...current.drivers], metrics: { ...current.metrics, activeDrivers: current.metrics.activeDrivers + (input.status === 'ACTIVE' ? 1 : 0) } } : current);
    showAppToast('Chauffeur ajouté à l’aperçu local.', 'success');
    setDialog(null);
  };

  const addPreviewVehicle = (input: CreateVehicleInput) => {
    if (!data) return;
    const vehicle: Vehicle = { ...input, id: `preview-vehicle-${Date.now()}`, companyId };
    setData(current => current ? { ...current, vehicles: [vehicle, ...current.vehicles], metrics: { ...current.metrics, availableVehicles: current.metrics.availableVehicles + (input.status === 'AVAILABLE' ? 1 : 0) } } : current);
    showAppToast('Véhicule ajouté à l’aperçu local.', 'success');
    setDialog(null);
  };

  const addPreviewTrip = (input: CreateTripInput) => {
    if (!data) return;
    const trip: Trip = { ...input, id: `preview-trip-${Date.now()}`, companyId, reference: `TX-${String(data.trips.length + 1).padStart(4, '0')}`, driverId: input.driverId ?? null, vehicleId: input.vehicleId ?? null, status: input.driverId ? 'ASSIGNED' : 'REQUESTED', requestedAt: new Date().toISOString() };
    setData(current => current ? { ...current, trips: [trip, ...current.trips], metrics: { ...current.metrics, todayTrips: current.metrics.todayTrips + 1, todayRevenue: current.metrics.todayRevenue + input.fare } } : current);
    showAppToast('Course ajoutée à l’aperçu local.', 'success');
    setDialog(null);
  };

  const updateStatus = (trip: Trip, status: TripStatus) => {
    if (status === trip.status || !canModifyTrips) return;
    if (preview) {
      setData(current => current ? { ...current, trips: current.trips.map(item => item.id === trip.id ? { ...item, status } : item) } : current);
      showAppToast('Statut de la course mis à jour.', 'success');
      return;
    }
    void run(() => api.updateTripStatus(trip.id, status), 'Statut de la course mis à jour.');
  };

  if (loading) return <TransportLoadingState />;
  if (!data) return <TransportErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-5" data-testid="transport-module" aria-busy={Boolean(pendingAction)}>
      {pendingAction && <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm font-semibold text-sky-700"><RefreshCw size={15} className="animate-spin" />Enregistrement en cours…</div>}
      {error && <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Fermer le message"><X size={16} /></button></div>}

      <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-6 text-slate-100 shadow-[0_18px_45px_rgba(15,23,42,.16)] sm:px-7">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-amber-300/15" />
        <div className="absolute right-8 top-8 h-36 w-36 rounded-full border border-sky-300/10" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-amber-300"><CarFront size={15} />Opérations taxi</div>
            <h1 className="max-w-2xl text-2xl font-black tracking-[-.04em] sm:text-3xl">La flotte en mouvement, sans angles morts.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Suivez les demandes, les équipages et la disponibilité des véhicules depuis un seul poste de pilotage.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void load(true)} className="btn inline-flex items-center gap-2 border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700" title="Actualiser"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />Actualiser</button>
            {canCreateTrips && <button type="button" onClick={() => setDialog('trip')} className="btn inline-flex items-center gap-2 bg-amber-300 px-3.5 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-200"><Plus size={15} />Nouvelle course</button>}
          </div>
        </div>
      </header>

      {!singleModuleNavigation && <nav aria-label="Navigation transport" className="module-tabs flex gap-1.5 overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.9)] p-1.5 shadow-sm">
        {visibleTabs.map(item => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${tab === item.id ? 'active bg-slate-900 text-white shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.6)] hover:text-[hsl(var(--foreground))]'}`}><Icon size={15} />{item.label}</button>; })}
      </nav>}

      {visibleTabs.length === 0 ? <EmptyState icon={ShieldCheck} title="Aucune fonctionnalité disponible" text="Votre rôle n’a pas encore reçu de fonctionnalité pour cet espace." /> : <>
        {tab === 'overview' && <Overview data={data} onTab={setTab} />}
        {tab === 'courses' && <TripsPanel data={data} canCreate={canCreateTrips} canModify={canModifyTrips} onCreate={() => setDialog('trip')} onStatusChange={updateStatus} />}
        {tab === 'chauffeurs' && <><DriversPanel drivers={data.drivers} canCreate={canCreateDrivers} onCreate={() => setDialog('driver')} /><DriverLocationPanel driver={currentDriver} active={locationActive} error={locationError} /></>}
        {tab === 'vehicules' && <VehiclesPanel vehicles={data.vehicles} canCreate={canCreateVehicles} onCreate={() => setDialog('vehicle')} />}
      </>}

      {dialog === 'driver' && <DriverDialog busy={Boolean(pendingAction)} employees={employees} onClose={() => setDialog(null)} onSubmit={input => preview ? addPreviewDriver(input) : void run(() => api.createDriver(input), 'Chauffeur créé.')} />}
      {dialog === 'vehicle' && <VehicleDialog busy={Boolean(pendingAction)} onClose={() => setDialog(null)} onSubmit={input => preview ? addPreviewVehicle(input) : void run(() => api.createVehicle(input), 'Véhicule enregistré.')} />}
      {dialog === 'trip' && <TripDialog busy={Boolean(pendingAction)} drivers={data.drivers} vehicles={data.vehicles} onClose={() => setDialog(null)} onSubmit={input => preview ? addPreviewTrip(input) : void run(() => api.createTrip(input), 'Course créée.')} />}
    </div>
  );
}

function Overview({ data, onTab }: { data: TransportBootstrap; onTab: (tab: TransportTab) => void }) {
  const activeTrips = data.trips.filter(trip => ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS'].includes(trip.status));
  const recentTrips = data.trips.slice(0, 5);
  return <div className="fade-up space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Chauffeurs actifs" value={data.metrics.activeDrivers} detail="Prêts à prendre une course" icon={UsersRound} accent="amber" />
      <Metric label="Véhicules disponibles" value={data.metrics.availableVehicles} detail="À la station ou en attente" icon={CarFront} accent="sky" />
      <Metric label="Courses aujourd’hui" value={data.metrics.todayTrips} detail={`${activeTrips.length} demande${activeTrips.length > 1 ? 's' : ''} ouverte${activeTrips.length > 1 ? 's' : ''}`} icon={Route} accent="violet" />
      <Metric label="Recettes du jour" value={money(data.metrics.todayRevenue)} detail="Courses non annulées" icon={CircleDollarSign} accent="emerald" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
      <section className="card-surface overflow-hidden">
        <div className="section-heading border-b px-5 py-4"><div><p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Flux opérationnel</p><h2 className="mt-1 text-base font-bold">Dernières courses</h2></div><button type="button" onClick={() => onTab('courses')} className="text-xs font-bold text-sky-700 hover:underline">Voir toutes les courses</button></div>
        {recentTrips.length ? <TripTable trips={recentTrips} compact onStatusChange={() => undefined} /> : <EmptyState icon={Route} title="Aucune course aujourd’hui" text="Les nouvelles demandes apparaîtront ici dès leur création." />}
      </section>
      <section className="card-surface overflow-hidden">
        <div className="border-b px-5 py-4"><p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Disponibilité</p><h2 className="mt-1 text-base font-bold">État de la flotte</h2></div>
        <div className="space-y-4 p-5">
          <AvailabilityRow label="Véhicules disponibles" value={data.vehicles.filter(item => item.status === 'AVAILABLE').length} total={data.vehicles.length} color="bg-emerald-500" />
          <AvailabilityRow label="Chauffeurs actifs" value={data.drivers.filter(item => item.status === 'ACTIVE').length} total={data.drivers.length} color="bg-amber-400" />
          <AvailabilityRow label="En maintenance" value={data.vehicles.filter(item => item.status === 'MAINTENANCE').length} total={data.vehicles.length} color="bg-rose-400" />
        </div>
      </section>
    </div>
  </div>;
}

function Metric({ label, value, detail, icon: Icon, accent }: { label: string; value: string | number; detail: string; icon: typeof Gauge; accent: string }) {
  const colors: Record<string, string> = { amber: 'bg-amber-400/15 text-amber-700', sky: 'bg-sky-500/12 text-sky-700', violet: 'bg-violet-500/12 text-violet-700', emerald: 'bg-emerald-500/12 text-emerald-700' };
  return <div className="metric-card card-surface metric-accent p-4"><div className="flex items-start justify-between gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors[accent]}`}><Icon size={18} /></div><Activity size={15} className="text-[hsl(var(--muted-foreground)/.5)]" /></div><p className="mt-5 text-[11px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 text-2xl font-black tracking-[-.05em]">{value}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}

function AvailabilityRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = total ? Math.min(100, (value / total) * 100) : 0;
  return <div><div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold">{label}</span><span className="mono text-[11px] text-[hsl(var(--muted-foreground))]">{value}/{total}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} /></div></div>;
}

function TripsPanel({ data, canCreate, canModify, onCreate, onStatusChange }: { data: TransportBootstrap; canCreate: boolean; canModify: boolean; onCreate: () => void; onStatusChange: (trip: Trip, status: TripStatus) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TripStatus | 'ALL'>('ALL');
  const trips = useMemo(() => data.trips.filter(trip => {
    const matchesQuery = !query || `${trip.reference} ${trip.pickup} ${trip.destination} ${trip.passengerName}`.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    return matchesQuery && (filter === 'ALL' || trip.status === filter);
  }), [data.trips, filter, query]);
  return <div className="fade-up space-y-4">
    <div className="section-heading"><div><p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Dispatch</p><h2 className="mt-1 text-xl font-black tracking-[-.03em]">Courses</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Chaque demande, de l’appel à l’arrivée.</p></div>{canCreate && <button type="button" onClick={onCreate} className="btn inline-flex items-center gap-2 bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} />Créer une course</button>}</div>
    <section className="card-surface overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><MapPin size={15} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher une référence, un passager ou une adresse" className="w-full border px-9 py-2.5 text-sm" /></div><select value={filter} onChange={event => setFilter(event.target.value as TripStatus | 'ALL')} className="border px-3 py-2.5 text-sm sm:w-48"><option value="ALL">Tous les statuts</option>{tripStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></div>
      {trips.length ? <TripTable trips={trips} canModify={canModify} onStatusChange={onStatusChange} /> : <EmptyState icon={Route} title={query || filter !== 'ALL' ? 'Aucun résultat' : 'Le carnet de courses est vide'} text={query || filter !== 'ALL' ? 'Essayez un autre filtre ou une autre recherche.' : 'Créez une course pour commencer à organiser le dispatch.'} />}
    </section>
  </div>;
}

function TripTable({ trips, canModify = false, compact = false, onStatusChange }: { trips: Trip[]; canModify?: boolean; compact?: boolean; onStatusChange: (trip: Trip, status: TripStatus) => void }) {
  return <div className="table-scroll"><table className="data-table w-full text-left text-sm"><thead><tr><th className="px-4">Course</th><th>Trajet</th><th>Passager</th><th>Montant</th><th>Statut</th>{!compact && <th className="px-4">Action</th>}</tr></thead><tbody>{trips.map(trip => <tr key={trip.id} className="border-t"><td className="px-4"><span className="mono text-xs font-bold">{trip.reference}</span><span className="mt-1 block text-[11px] text-[hsl(var(--muted-foreground))]">{dateLabel(trip.requestedAt)}</span></td><td><div className="max-w-[220px]"><span className="block truncate font-semibold">{trip.pickup}</span><span className="mt-1 block truncate text-xs text-[hsl(var(--muted-foreground))]">→ {trip.destination}</span></div></td><td><span className="font-semibold">{trip.passengerName}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{trip.passengerPhone}</span></td><td className="whitespace-nowrap font-bold">{money(trip.fare)}</td><td><StatusBadge status={trip.status} label={statusLabels[trip.status]} /></td>{!compact && <td className="px-4">{canModify && <select aria-label={`Modifier le statut de ${trip.reference}`} value={trip.status} onChange={event => onStatusChange(trip, event.target.value as TripStatus)} className="border px-2 py-2 text-xs">{nextTripStatuses(trip.status).map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>}</td>}</tr>)}</tbody></table></div>;
}

function DriverLocationPanel({ driver, active, error }: { driver: Driver | null; active: boolean; error: string }) {
  if (!driver) return <section className="card-surface border-dashed p-5"><div className="flex items-start gap-3"><MapPin className="mt-0.5 text-amber-600" size={19} /><div><h2 className="font-bold">Position chauffeur non configurée</h2><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Un administrateur doit lier votre compte employé à votre fiche chauffeur. La localisation GPS sera ensuite partagée automatiquement pendant que cette application est ouverte.</p></div></div></section>;
  return <section className={`card-surface border p-5 ${active ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}><div className="flex items-start gap-3"><MapPin className={`mt-0.5 ${active ? 'text-emerald-600' : 'text-amber-600'}`} size={19} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">Localisation du chauffeur</h2><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{active ? 'Active' : 'À activer'}</span></div><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{active ? 'Votre position GPS est partagée automatiquement. Les clients peuvent être orientés vers vous si votre véhicule est disponible.' : error || 'Autorisez la localisation dans votre navigateur pour recevoir les demandes proches.'}</p>{error && <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}</div></div></section>;
}

function DriversPanel({ drivers, canCreate, onCreate }: { drivers: Driver[]; canCreate: boolean; onCreate: () => void }) {
  return <div className="fade-up space-y-4"><div className="section-heading"><div><p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Équipage</p><h2 className="mt-1 text-xl font-black tracking-[-.03em]">Chauffeurs</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Les profils autorisés à prendre le volant.</p></div>{canCreate && <button type="button" onClick={onCreate} className="btn inline-flex items-center gap-2 bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} />Ajouter un chauffeur</button>}</div><section className="card-surface overflow-hidden">{drivers.length ? <div className="table-scroll"><table className="data-table w-full text-left text-sm"><thead><tr><th className="px-4">Chauffeur</th><th>Téléphone</th><th>Permis</th><th>Statut</th></tr></thead><tbody>{drivers.map(driver => <tr key={driver.id} className="border-t"><td className="px-4"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 text-xs font-black text-amber-800">{driver.name.slice(0, 2).toUpperCase()}</div><span className="font-semibold">{driver.name}</span></div></td><td><a href={`tel:${driver.phone}`} className="inline-flex items-center gap-1.5 text-sky-700 hover:underline"><Phone size={13} />{driver.phone}</a></td><td className="mono text-xs">{driver.licenseNumber}</td><td><StatusBadge status={driver.status} label={driverStatusLabel[driver.status]} /></td></tr>)}</tbody></table></div> : <EmptyState icon={UserRound} title="Aucun chauffeur enregistré" text="Ajoutez les chauffeurs habilités à rejoindre votre flotte." />}</section></div>;
}

function VehiclesPanel({ vehicles, canCreate, onCreate }: { vehicles: Vehicle[]; canCreate: boolean; onCreate: () => void }) {
  return <div className="fade-up space-y-4"><div className="section-heading"><div><p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Parc roulant</p><h2 className="mt-1 text-xl font-black tracking-[-.03em]">Véhicules</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Une lecture rapide de l’état de chaque voiture.</p></div>{canCreate && <button type="button" onClick={onCreate} className="btn inline-flex items-center gap-2 bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} />Ajouter un véhicule</button>}</div><section className="card-surface overflow-hidden">{vehicles.length ? <div className="table-scroll"><table className="data-table w-full text-left text-sm"><thead><tr><th className="px-4">Immatriculation</th><th>Modèle</th><th>Type</th><th>État</th></tr></thead><tbody>{vehicles.map(vehicle => <tr key={vehicle.id} className="border-t"><td className="px-4"><span className="mono rounded bg-[hsl(var(--muted))] px-2 py-1 text-xs font-bold">{vehicle.registration}</span></td><td className="font-semibold">{vehicle.model}</td><td className="text-[hsl(var(--muted-foreground))]">{vehicle.vehicleType}</td><td><StatusBadge status={vehicle.status} label={vehicleStatusLabel[vehicle.status]} /></td></tr>)}</tbody></table></div> : <EmptyState icon={CarFront} title="Aucun véhicule enregistré" text="Votre parc roulant apparaîtra ici après son premier enregistrement." />}</section></div>;
}

function StatusBadge({ status, label }: { status: TripStatus | DriverStatus | VehicleStatus; label: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(status)}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>;
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Route; title: string; text: string }) {
  return <div className="flex min-h-52 flex-col items-center justify-center px-6 py-12 text-center"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700"><Icon size={20} /></div><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div>;
}

function TransportLoadingState() {
  return <div className="space-y-5" aria-label="Chargement de l’espace taxi"><div className="h-40 animate-pulse rounded-2xl bg-slate-800/90" /><div className="h-12 animate-pulse rounded-xl bg-[hsl(var(--muted))]" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-36 animate-pulse rounded-xl bg-[hsl(var(--muted))]" />)}</div><div className="h-64 animate-pulse rounded-xl bg-[hsl(var(--muted)/.72)]" /></div>;
}

function TransportErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="card-surface rounded-2xl p-8"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-700"><Wrench size={20} /></div><h2 className="mt-4 text-lg font-bold">L’espace taxi n’est pas disponible</h2><p className="mt-2 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">{message || 'Une erreur inattendue empêche le chargement de cet espace.'}</p><button type="button" onClick={onRetry} className="btn mt-5 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><RefreshCw size={14} />Réessayer</button></div>;
}

function DialogShell({ title, description, children, onClose }: { title: string; description: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop fixed inset-0 z-50 flex bg-slate-950/55 backdrop-blur-sm"><div className="modal-panel app-dialog-panel w-full max-w-xl rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-2xl sm:p-6"><div className="modal-header flex items-start justify-between gap-5"><div><p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-sky-700">Nouvel enregistrement</p><h2 className="mt-1 text-xl font-black tracking-[-.03em]">{title}</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{description}</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" aria-label="Fermer"><X size={18} /></button></div>{children}</div></div>;
}

function Field({ label, children, required = true }: { label: string; children: ReactNode; required?: boolean }) {
  return <label className="block text-xs font-bold text-[hsl(var(--foreground))]">{label}{required && <span className="ml-1 text-rose-600">*</span>}<span className="mt-1.5 block">{children}</span></label>;
}

const inputClass = 'w-full border px-3 py-2.5 text-sm';

function DriverDialog({ busy, employees, onClose, onSubmit }: { busy: boolean; employees: Array<{ id: string; firstName: string; lastName: string; phone: string; status: string }>; onClose: () => void; onSubmit: (input: CreateDriverInput) => void }) {
  const eligibleEmployees = employees.filter(employee => employee.status === 'ACTIF');
  const [form, setForm] = useState<CreateDriverInput>({ employeeId: '', licenseNumber: '', status: 'ACTIVE' });
  const selectedEmployee = eligibleEmployees.find(employee => employee.id === form.employeeId);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (form.employeeId && form.licenseNumber.trim()) {
      onSubmit({ ...form, licenseNumber: form.licenseNumber.trim() });
    }
  };
  return <DialogShell title="Qualifier un chauffeur" description="Sélectionnez un employé créé dans Organisation, puis ajoutez ses informations de conduite." onClose={onClose}><form onSubmit={submit} className="mt-6 space-y-4"><Field label="Employé de l’organisation"><select required autoFocus value={form.employeeId} onChange={event => setForm({ ...form, employeeId: event.target.value })} className={inputClass}><option value="">Sélectionner un employé…</option>{eligibleEmployees.map(employee => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></Field>{selectedEmployee && <p className="rounded-lg bg-[hsl(var(--muted))] p-3 text-xs text-[hsl(var(--muted-foreground))]">Identité et téléphone repris depuis Organisation : <strong className="text-[hsl(var(--foreground))]">{selectedEmployee.firstName} {selectedEmployee.lastName}</strong>{selectedEmployee.phone ? ` · ${selectedEmployee.phone}` : ' · aucun téléphone renseigné'}</p>}<Field label="Numéro de permis"><input required value={form.licenseNumber} onChange={event => setForm({ ...form, licenseNumber: event.target.value })} className={inputClass} placeholder="SN-TR-0000" /></Field><Field label="Statut"><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as DriverStatus })} className={inputClass}><option value="ACTIVE">Actif</option><option value="INACTIVE">Inactif</option></select></Field>{eligibleEmployees.length === 0 && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-800">Créez d’abord un employé actif dans Organisation pour pouvoir le qualifier comme chauffeur.</p>}<DialogActions busy={busy} disabled={eligibleEmployees.length === 0 || !form.employeeId || !form.licenseNumber.trim()} onClose={onClose} label="Qualifier le chauffeur" /></form></DialogShell>;
}

function VehicleDialog({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (input: CreateVehicleInput) => void }) {
  const [form, setForm] = useState<CreateVehicleInput>({ registration: '', model: '', vehicleType: 'Berline', status: 'AVAILABLE' });
  const submit = (event: FormEvent) => { event.preventDefault(); if (form.registration.trim() && form.model.trim() && form.vehicleType.trim()) onSubmit({ ...form, registration: form.registration.trim().toUpperCase(), model: form.model.trim(), vehicleType: form.vehicleType.trim() }); };
  return <DialogShell title="Ajouter un véhicule" description="Enregistrez une voiture dans le parc roulant." onClose={onClose}><form onSubmit={submit} className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Immatriculation"><input required autoFocus value={form.registration} onChange={event => setForm({ ...form, registration: event.target.value })} className={`${inputClass} uppercase`} placeholder="DK-1234-AB" /></Field><Field label="Modèle"><input required value={form.model} onChange={event => setForm({ ...form, model: event.target.value })} className={inputClass} placeholder="Toyota Corolla" /></Field></div><Field label="Type de véhicule"><input required value={form.vehicleType} onChange={event => setForm({ ...form, vehicleType: event.target.value })} className={inputClass} placeholder="Berline, van, premium…" /></Field><Field label="État initial"><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as VehicleStatus })} className={inputClass}><option value="AVAILABLE">Disponible</option><option value="MAINTENANCE">Maintenance</option><option value="ON_TRIP">En course</option></select></Field><DialogActions busy={busy} onClose={onClose} label="Enregistrer le véhicule" /></form></DialogShell>;
}

function TripDialog({ busy, drivers, vehicles, onClose, onSubmit }: { busy: boolean; drivers: Driver[]; vehicles: Vehicle[]; onClose: () => void; onSubmit: (input: CreateTripInput) => void }) {
  const [form, setForm] = useState<CreateTripInput>({ pickup: '', destination: '', passengerName: '', passengerPhone: '', fare: 0, driverId: '', vehicleId: '' });
  const submit = (event: FormEvent) => { event.preventDefault(); if (form.pickup.trim() && form.destination.trim() && form.passengerName.trim() && form.passengerPhone.trim() && form.fare > 0) onSubmit({ ...form, pickup: form.pickup.trim(), destination: form.destination.trim(), passengerName: form.passengerName.trim(), passengerPhone: form.passengerPhone.trim(), fare: Number(form.fare), driverId: form.driverId || undefined, vehicleId: form.vehicleId || undefined }); };
  return <DialogShell title="Créer une course" description="Saisissez la demande et affectez-la si un équipage est disponible." onClose={onClose}><form onSubmit={submit} className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Départ"><input required autoFocus value={form.pickup} onChange={event => setForm({ ...form, pickup: event.target.value })} className={inputClass} placeholder="Point de prise en charge" /></Field><Field label="Destination"><input required value={form.destination} onChange={event => setForm({ ...form, destination: event.target.value })} className={inputClass} placeholder="Destination" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom du passager"><input required value={form.passengerName} onChange={event => setForm({ ...form, passengerName: event.target.value })} className={inputClass} placeholder="Nom complet" /></Field><Field label="Téléphone du passager"><input required type="tel" value={form.passengerPhone} onChange={event => setForm({ ...form, passengerPhone: event.target.value })} className={inputClass} placeholder="+221 77 000 00 00" /></Field></div><Field label="Tarif estimé (XOF)"><input required min="1" type="number" value={form.fare || ''} onChange={event => setForm({ ...form, fare: Number(event.target.value) })} className={inputClass} placeholder="0" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Chauffeur" required={false}><select value={form.driverId} onChange={event => setForm({ ...form, driverId: event.target.value })} className={inputClass}><option value="">À affecter plus tard</option>{drivers.filter(driver => driver.status === 'ACTIVE').map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></Field><Field label="Véhicule" required={false}><select value={form.vehicleId} onChange={event => setForm({ ...form, vehicleId: event.target.value })} className={inputClass}><option value="">À affecter plus tard</option>{vehicles.filter(vehicle => vehicle.status === 'AVAILABLE').map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.model}</option>)}</select></Field></div><DialogActions busy={busy} onClose={onClose} label="Créer la course" /></form></DialogShell>;
}

function DialogActions({ busy, disabled = false, onClose, label }: { busy: boolean; disabled?: boolean; onClose: () => void; label: string }) {
  return <div className="modal-footer flex items-center justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" disabled={busy}>Annuler</button><button type="submit" disabled={busy || disabled} className="btn inline-flex items-center gap-2 bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{busy ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}{busy ? 'Enregistrement…' : label}</button></div>;
}