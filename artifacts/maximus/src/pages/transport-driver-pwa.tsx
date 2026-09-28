import { useCallback, useEffect, useMemo, useState } from 'react';
import { DriverPortalView } from '@/components/transport-driver-pwa/DriverPortalView';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { ApiRequestError } from '@/lib/api-request';
import { authApi } from '@/lib/auth-api';
import {
  createDriverPortalApi,
  type DriverPortalProfile,
  type DriverPortalTrip,
  type DriverPortalTripStatus,
} from '@/lib/transport-api';

type Props = {
  slug: string;
  storeName: string;
  logoUrl: string | null;
  installAvailable: boolean;
  installInstructions: boolean;
  onInstall: () => void;
  onOpenTransport: () => void;
};

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiRequestError || cause instanceof Error) return cause.message;
  return fallback;
}

export function TransportDriverPwaPage({
  slug,
  storeName,
  logoUrl,
  installAvailable,
  installInstructions,
  onInstall,
  onOpenTransport,
}: Props) {
  const api = useMemo(() => createDriverPortalApi(slug), [slug]);
  const [viewState, setViewState] = useState<'checking' | 'login' | 'dashboard'>('checking');
  const [driver, setDriver] = useState<DriverPortalProfile | null>(null);
  const [trips, setTrips] = useState<DriverPortalTrip[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const loadDashboard = useCallback(async () => {
    const result = await api.bootstrap();
    setDriver(result.driver);
    setTrips(result.trips);
  }, [api]);

  const refresh = useCallback(async () => {
    if (viewState !== 'dashboard') return;
    try {
      setError('');
      await loadDashboard();
    } catch (cause) {
      setError(errorMessage(cause, 'Les courses ne sont pas accessibles pour le moment.'));
    }
  }, [loadDashboard, viewState]);

  useAutoRefresh(refresh, { enabled: viewState === 'dashboard', intervalMs: 20_000 });

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      setViewState('checking');
      setDriver(null);
      setTrips([]);
      setError('');
      setInfo('');
      try {
        const { user } = await authApi.session();
        if (cancelled) return;
        if (!user) {
          setViewState('login');
          return;
        }
        if (user.role !== 'employee' || !user.employeeId) {
          await authApi.logout().catch(() => undefined);
          if (!cancelled) {
            setError('Connectez-vous avec le compte employé rattaché à votre profil chauffeur.');
            setViewState('login');
          }
          return;
        }

        const { driver: sessionDriver } = await api.validateSession();
        if (cancelled) return;
        setDriver(sessionDriver);
        await loadDashboard();
        if (!cancelled) setViewState('dashboard');
      } catch (cause) {
        await authApi.logout().catch(() => undefined);
        if (!cancelled) {
          setError(errorMessage(cause, 'La session chauffeur n’a pas pu être vérifiée.'));
          setViewState('login');
        }
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [api, loadDashboard]);

  const signIn = async (email: string, password: string) => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const { user } = await authApi.login(email, password);
      if (user.role !== 'employee' || !user.employeeId) {
        await authApi.logout().catch(() => undefined);
        throw new Error('Utilisez le compte employé rattaché à votre profil chauffeur.');
      }
      const { driver: sessionDriver } = await api.validateSession();
      setDriver(sessionDriver);
      await loadDashboard();
      setViewState('dashboard');
      setInfo('Connexion réussie.');
    } catch (cause) {
      setDriver(null);
      setTrips([]);
      setViewState('login');
      setError(errorMessage(cause, 'La connexion chauffeur a échoué.'));
      await authApi.logout().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const updateAvailability = async (availability: 'AVAILABLE' | 'PAUSED') => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const result = await api.updateAvailability(availability);
      setDriver(result.driver);
      setInfo(availability === 'AVAILABLE' ? 'Vous êtes disponible.' : 'Vous êtes en pause.');
    } catch (cause) {
      setError(errorMessage(cause, 'La disponibilité n’a pas pu être mise à jour.'));
    } finally {
      setBusy(false);
    }
  };

  const updateLocation = async () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }

    setBusy(true);
    setError('');
    setInfo('');
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 20_000,
          timeout: 25_000,
        });
      });
      const result = await api.updateLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date(position.timestamp).toISOString(),
      });
      setDriver(result.driver);
      setInfo('Votre position a été actualisée.');
    } catch (cause) {
      const geoErrorCode = cause && typeof cause === 'object' && 'code' in cause
        ? Number((cause as { code?: unknown }).code)
        : null;
      const message = geoErrorCode !== null
        ? geoErrorCode === 1
          ? 'Autorisez la localisation dans les réglages du navigateur pour partager votre position.'
          : 'La position GPS n’a pas pu être obtenue. Réessayez à l’extérieur ou vérifiez le signal.'
        : errorMessage(cause, 'La position GPS n’a pas pu être actualisée.');
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const updateTripStatus = async (id: string, status: DriverPortalTripStatus, pickupCode?: string) => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await api.updateTripStatus(id, status, pickupCode);
      await loadDashboard();
      setInfo(
        status === 'ASSIGNED' ? 'Course acceptée.'
          : status === 'IN_PROGRESS' ? 'Course démarrée.'
            : status === 'COMPLETED' ? 'Course terminée.'
              : 'Proposition libérée.',
      );
    } catch (cause) {
      setError(errorMessage(cause, 'La course n’a pas pu être mise à jour.'));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await authApi.logout();
      setDriver(null);
      setTrips([]);
      setViewState('login');
      setInfo('Vous êtes déconnecté.');
    } catch (cause) {
      setError(errorMessage(cause, 'La déconnexion n’a pas abouti.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DriverPortalView
      storeName={storeName}
      logoUrl={logoUrl}
      driver={driver}
      trips={trips}
      viewState={viewState}
      busy={busy}
      error={error}
      info={info}
      installAvailable={installAvailable}
      installInstructions={installInstructions}
      onLogin={(email, password) => void signIn(email, password)}
      onLogout={() => void signOut()}
      onRefresh={() => void refresh()}
      onAvailabilityChange={(availability) => void updateAvailability(availability)}
      onLocate={() => void updateLocation()}
      onTripStatusChange={(id, status, pickupCode) => void updateTripStatus(id, status, pickupCode)}
      onInstall={onInstall}
      onOpenTransport={onOpenTransport}
    />
  );
}