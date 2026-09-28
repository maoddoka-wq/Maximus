import { useState, type FormEvent } from 'react';
import type { DriverPortalTrip } from '@/lib/transport-api';
import {
  CarFront,
  Check,
  ChevronRight,
  Clock3,
  LocateFixed,
  LogOut,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@workspace/maximus-transport-public/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/maximus-transport-public/components/ui/card';
import { Input } from '@workspace/maximus-transport-public/components/ui/input';
import { Label } from '@workspace/maximus-transport-public/components/ui/label';
import { cn } from '@workspace/maximus-transport-public/lib/utils';

export type DriverPortalDriver = {
  id: string;
  name: string;
  phone: string | null;
  availability: 'AVAILABLE' | 'PAUSED' | 'ON_TRIP';
  locationUpdatedAt: string | null;
};

export type DriverPortalViewProps = {
  storeName: string;
  logoUrl: string | null;
  driver: DriverPortalDriver | null;
  trips: DriverPortalTrip[];
  viewState: 'checking' | 'login' | 'dashboard';
  busy: boolean;
  error: string;
  info: string;
  installAvailable: boolean;
  installInstructions: boolean;
  onLogin: (email: string, password: string) => void;
  onLogout: () => void;
  onRefresh: () => void;
  onAvailabilityChange: (value: 'AVAILABLE' | 'PAUSED') => void;
  onLocate: () => void;
  onTripStatusChange: (
    id: string,
    status: 'ASSIGNED' | 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED',
    pickupCode?: string,
  ) => void;
  onInstall: () => void;
  onOpenTransport: () => void;
};

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);

const dateTime = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

const statusLabel: Record<DriverPortalTrip['status'], string> = {
  REQUESTED: 'Nouvelle demande',
  OFFERED: 'Proposition',
  ASSIGNED: 'À prendre en charge',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

const statusTone: Record<DriverPortalTrip['status'], string> = {
  REQUESTED: 'border-primary/30 bg-primary/10 text-foreground',
  OFFERED: 'border-primary/30 bg-primary/10 text-foreground',
  ASSIGNED: 'border-accent/25 bg-accent/10 text-foreground',
  IN_PROGRESS: 'border-primary/40 bg-primary/15 text-foreground',
  COMPLETED: 'border-border bg-muted text-muted-foreground',
  CANCELLED: 'border-destructive/30 bg-destructive/10 text-destructive',
};

function Brand({ storeName, logoUrl }: Pick<DriverPortalViewProps, 'storeName' | 'logoUrl'>) {
  return (
    <div className="flex min-w-0 items-center gap-3" data-testid="brand-transport">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${storeName} logo`}
          className="h-10 w-10 rounded-md border border-border bg-card object-contain p-1"
          data-testid="img-transport-logo"
        />
      ) : (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground" data-testid="mark-transport">
          <CarFront className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold tracking-tight" data-testid="text-transport-name">{storeName}</p>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">Transport</p>
      </div>
    </div>
  );
}

function Notice({ error, info }: Pick<DriverPortalViewProps, 'error' | 'info'>) {
  if (!error && !info) return null;
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-3 text-sm',
        error ? 'border-destructive/35 bg-destructive/10 text-destructive' : 'border-primary/30 bg-primary/10 text-foreground',
      )}
      role={error ? 'alert' : 'status'}
      data-testid={error ? 'status-driver-error' : 'status-driver-info'}
    >
      <div className="flex items-start gap-2">
        {error ? <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
        <span>{error || info}</span>
      </div>
    </div>
  );
}

function LoadingState({ storeName, logoUrl }: Pick<DriverPortalViewProps, 'storeName' | 'logoUrl'>) {
  return (
    <section className="transport-public-shell min-h-[100dvh] bg-background px-4 py-5 text-foreground sm:px-6" data-testid="state-driver-checking">
      <div className="mx-auto max-w-3xl"><Brand storeName={storeName} logoUrl={logoUrl} /></div>
      <div className="mx-auto mt-10 max-w-md space-y-4" aria-label="Chargement">
        <div className="h-7 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    </section>
  );
}

export function DriverPortalView(props: DriverPortalViewProps) {
  const {
    storeName, logoUrl, driver, trips, viewState, busy, error, info, installAvailable, installInstructions,
    onLogin, onLogout, onRefresh, onAvailabilityChange, onLocate, onTripStatusChange, onInstall, onOpenTransport,
  } = props;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pickupCodes, setPickupCodes] = useState<Record<string, string>>({});

  if (viewState === 'checking') return <LoadingState storeName={storeName} logoUrl={logoUrl} />;

  if (viewState === 'login') {
    const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onLogin(email.trim(), password);
    };
    return (
      <section className="transport-public-shell min-h-[100dvh] bg-background px-4 py-5 text-foreground sm:px-6" data-testid="state-driver-login">
        <div className="mx-auto max-w-3xl"><Brand storeName={storeName} logoUrl={logoUrl} /></div>
        <section className="mx-auto mt-10 max-w-md">
          <Card className="transport-entry-card">
            <CardHeader className="space-y-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div>
              <div>
                <CardTitle className="text-2xl">Espace chauffeur</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">Connectez-vous pour retrouver vos courses et votre disponibilité.</p>
              </div>
            </CardHeader>
            <CardContent>
              <Notice error={error} info={info} />
              <form className="mt-5 space-y-4" onSubmit={submit} data-testid="form-driver-login">
                <div className="space-y-2">
                  <Label htmlFor="driver-email">Adresse e-mail</Label>
                  <Input id="driver-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} data-testid="input-driver-email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-password">Mot de passe</Label>
                  <Input id="driver-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} data-testid="input-driver-password" />
                </div>
                <Button className="w-full" type="submit" disabled={busy} data-testid="button-driver-login">
                  {busy ? 'Connexion en cours…' : 'Se connecter'} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
              <Button variant="link" className="mt-4 w-full" type="button" onClick={onOpenTransport} data-testid="button-open-transport">Retour au transport public</Button>
            </CardContent>
          </Card>
        </section>
      </section>
    );
  }

  const activeTrip = trips.find((trip) => trip.status === 'IN_PROGRESS' || trip.status === 'ASSIGNED');
  const availableTrips = trips.filter((trip) => trip.status === 'OFFERED');
  const historyTrips = trips.filter((trip) => trip.status === 'COMPLETED' || trip.status === 'CANCELLED');
  const availability = driver?.availability === 'ON_TRIP' ? 'ON_TRIP' : driver?.availability ?? 'PAUSED';

  return (
    <section className="transport-public-shell min-h-[100dvh] bg-background text-foreground" data-testid="state-driver-dashboard">
      <header className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Brand storeName={storeName} logoUrl={logoUrl} />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" type="button" onClick={onRefresh} disabled={busy} aria-label="Actualiser les courses" data-testid="button-driver-refresh"><RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} /></Button>
            <Button variant="ghost" size="icon" type="button" onClick={onLogout} disabled={busy} aria-label="Se déconnecter" data-testid="button-driver-logout"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Notice error={error} info={info} />
        <section className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end" data-testid="section-driver-summary">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Bonjour</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl" data-testid="text-driver-name">{driver?.name || 'Chauffeur'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Votre espace de travail Transport.</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Label htmlFor="driver-availability" className="text-xs text-muted-foreground">Disponibilité</Label>
            <select id="driver-availability" value={availability === 'ON_TRIP' ? 'PAUSED' : availability} disabled={busy || availability === 'ON_TRIP'} onChange={(event) => onAvailabilityChange(event.target.value as 'AVAILABLE' | 'PAUSED')} className="h-10 rounded-md border border-input bg-card px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" data-testid="select-driver-availability">
              <option value="AVAILABLE">Disponible</option>
              <option value="PAUSED">En pause</option>
            </select>
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.35fr_0.65fr]">
          <section className="space-y-4" aria-labelledby="active-trip-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="active-trip-title" className="text-lg font-semibold">Course active</h2>
              <Button variant="outline" size="sm" type="button" onClick={onLocate} disabled={busy} data-testid="button-driver-locate"><LocateFixed className="h-4 w-4" />Partager ma position</Button>
            </div>
            {activeTrip ? <TripCard trip={activeTrip} busy={busy} pickupCode={pickupCodes[activeTrip.id] || ''} onPickupCodeChange={(value) => setPickupCodes((current) => ({ ...current, [activeTrip.id]: value }))} onTripStatusChange={onTripStatusChange} featured /> : (
              <Card className="border-dashed" data-testid="empty-driver-active-trip">
                <CardContent className="flex min-h-40 flex-col items-center justify-center px-5 py-8 text-center">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground"><CarFront className="h-5 w-5" /></div>
                  <p className="mt-3 font-medium">Aucune course active</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">Passez en mode disponible pour recevoir les prochaines demandes.</p>
                </CardContent>
              </Card>
            )}
          </section>
          <aside className="space-y-4">
            {(installAvailable || installInstructions) && (
              <Card className="border-primary/25 bg-primary/5" data-testid="card-driver-install">
                <CardContent className="p-4">
                  <div className="flex gap-3"><Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-medium">Installer l’application</p><p className="mt-1 text-sm text-muted-foreground">{installInstructions ? 'Dans Safari, touchez Partager puis « Sur l’écran d’accueil ».' : 'Gardez votre espace chauffeur à portée de main.'}</p>{installAvailable && <Button size="sm" className="mt-3" type="button" onClick={onInstall} data-testid="button-driver-install">Installer</Button>}</div></div>
                </CardContent>
              </Card>
            )}
            <Card data-testid="card-driver-status">
              <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Mon statut</CardTitle></CardHeader>
              <CardContent className="space-y-3 p-4 pt-2 text-sm">
                <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">État</span><span className="font-medium" data-testid="status-driver-availability">{availability === 'ON_TRIP' ? 'En course' : availability === 'AVAILABLE' ? 'Disponible' : 'En pause'}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Position</span><span className="text-right text-xs" data-testid="text-driver-location">{driver?.locationUpdatedAt ? dateTime(driver.locationUpdatedAt) : 'Non partagée'}</span></div>
                {driver?.phone && <div className="flex items-center gap-2 border-t border-border pt-3 text-muted-foreground"><Phone className="h-4 w-4" />{driver.phone}</div>}
              </CardContent>
            </Card>
          </aside>
        </div>

        <section className="mt-8" aria-labelledby="available-trips-title">
          <div className="flex items-center justify-between gap-3"><h2 id="available-trips-title" className="text-lg font-semibold">Demandes disponibles</h2><span className="font-mono text-xs text-muted-foreground" data-testid="text-driver-trip-count">{availableTrips.length} demande{availableTrips.length === 1 ? '' : 's'}</span></div>
          {availableTrips.length ? <div className="mt-3 grid gap-3 lg:grid-cols-2">{availableTrips.map((trip) => <TripCard key={trip.id} trip={trip} busy={busy} pickupCode={pickupCodes[trip.id] || ''} onPickupCodeChange={(value) => setPickupCodes((current) => ({ ...current, [trip.id]: value }))} onTripStatusChange={onTripStatusChange} />)}</div> : <Card className="mt-3 border-dashed"><CardContent className="p-6 text-center text-sm text-muted-foreground" data-testid="empty-driver-available-trips">Les nouvelles demandes apparaîtront ici.</CardContent></Card>}
        </section>

        {!!historyTrips.length && <section className="mt-8" aria-labelledby="history-trips-title"><h2 id="history-trips-title" className="text-lg font-semibold">Dernières courses</h2><div className="mt-3 grid gap-3 lg:grid-cols-2">{historyTrips.slice(0, 4).map((trip) => <TripCard key={trip.id} trip={trip} busy={busy} pickupCode="" onPickupCodeChange={() => undefined} onTripStatusChange={onTripStatusChange} />)}</div></section>}
        <Button variant="link" className="mt-8 px-0" type="button" onClick={onOpenTransport} data-testid="button-open-public-transport">Ouvrir le transport public <ChevronRight className="h-4 w-4" /></Button>
      </div>
    </section>
  );
}

function TripCard({ trip, busy, pickupCode, onPickupCodeChange, onTripStatusChange, featured = false }: { trip: DriverPortalTrip; busy: boolean; pickupCode: string; onPickupCodeChange: (value: string) => void; onTripStatusChange: DriverPortalViewProps['onTripStatusChange']; featured?: boolean }) {
  const canStart = trip.status === 'ASSIGNED';
  const canComplete = trip.status === 'IN_PROGRESS';
  const canAccept = trip.status === 'OFFERED';
  return (
    <Card className={cn(featured && 'border-primary/40 shadow-md')} data-testid={`card-driver-trip-${trip.id}`}>
      <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><CardTitle className="font-mono text-sm">{trip.reference}</CardTitle><span className={cn('rounded-full border px-2 py-0.5 text-[0.65rem] font-medium', statusTone[trip.status])} data-testid={`status-driver-trip-${trip.id}`}>{statusLabel[trip.status]}</span></div><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{dateTime(trip.requestedAt)}</p></div><span className="shrink-0 font-mono text-sm font-bold">{money(trip.fare)} FCFA</span></CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="grid gap-2 rounded-md bg-muted/60 p-3 text-sm"><div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{trip.pickup}</span></div><div className="ml-2 h-3 border-l border-dashed border-border" /><div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{trip.destination}</span></div></div>
        <div className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 truncate"><UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />{trip.passengerName}</span>{trip.passengerPhone && <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{trip.passengerPhone}</span>}</div>
        {canStart && trip.pickupCodeRequired && <div className="space-y-2"><Label htmlFor={`pickup-code-${trip.id}`} className="text-xs">Code de prise en charge</Label><Input id={`pickup-code-${trip.id}`} value={pickupCode} onChange={(event) => onPickupCodeChange(event.target.value)} placeholder="Ex. 4821" inputMode="numeric" autoComplete="one-time-code" maxLength={4} required data-testid={`input-pickup-code-${trip.id}`} /></div>}
         {(canAccept || canStart || canComplete) && <div className="flex flex-col gap-2 sm:flex-row">
           <Button className="w-full" type="button" disabled={busy} onClick={() => onTripStatusChange(trip.id, canAccept ? 'ASSIGNED' : canStart ? 'IN_PROGRESS' : 'COMPLETED', canStart ? pickupCode.trim() || undefined : undefined)} data-testid={`button-trip-action-${trip.id}`}>{canAccept ? 'Prendre la course' : canStart ? 'Démarrer la course' : 'Terminer la course'} <ChevronRight className="h-4 w-4" /></Button>
           {canAccept && <Button variant="outline" className="w-full" type="button" disabled={busy} onClick={() => onTripStatusChange(trip.id, 'REQUESTED')} data-testid={`button-trip-decline-${trip.id}`}>Refuser</Button>}
         </div>}
      </CardContent>
    </Card>
  );
}