import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetTransportDriverMobileSessionQueryKey,
  revokeTransportDriverMobileSession,
  useCreateTransportDriverMobileSession,
  useGetTransportDriverMobileSession,
  useLoginMaximus,
  useLoginToCompany,
  useLogoutMaximus,
  useRevokeTransportDriverMobileSession,
  useUpdateTransportDriverMobileAvailability,
  type DriverMobile,
} from '@workspace/api-client-react';
import {
  ACCESS_TOKEN_KEY,
  API_ORIGIN,
  BEARER_REQUEST_OPTIONS,
  COOKIE_REQUEST_OPTIONS,
} from '@/lib/mobile-api';
import {
  readLocationSyncStatus,
  sendCurrentDriverLocation,
  startDriverLocationUpdates,
  stopDriverLocationUpdates,
  type LocationSyncStatus,
} from '@/lib/driver-location-task';

type LocationPermissionState =
  | 'checking'
  | 'needs-permission'
  | 'settings-required'
  | 'services-disabled'
  | 'ready'
  | 'unsupported';

type DriverSessionContextValue = {
  accessToken: string | null;
  isHydrated: boolean;
  driver: DriverMobile | null;
  isLoadingSession: boolean;
  isRefreshingSession: boolean;
  isActivatingLocation: boolean;
  isSigningIn: boolean;
  isChangingAvailability: boolean;
  isSigningOut: boolean;
  locationPermissionState: LocationPermissionState;
  isTracking: boolean;
  syncStatus: LocationSyncStatus | null;
  error: string | null;
  signIn: (email: string, password: string, companySlug?: string) => Promise<boolean>;
  activateBackgroundLocation: () => Promise<boolean>;
  refreshLocation: () => Promise<boolean>;
  changeAvailability: (availability: 'AVAILABLE' | 'PAUSED') => Promise<boolean>;
  signOut: () => Promise<boolean>;
  openSettings: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
};

const DriverSessionContext = createContext<DriverSessionContextValue | null>(null);

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const value = error as {
      message?: unknown;
      data?: { error?: unknown; message?: unknown };
    };
    if (typeof value.data?.error === 'string') return value.data.error;
    if (typeof value.data?.message === 'string') return value.data.message;
    if (typeof value.message === 'string') return value.message;
  }

  return 'Une erreur inattendue est survenue. Réessayez.';
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

export function DriverSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isActivatingLocation, setIsActivatingLocation] = useState(false);
  const [isChangingAvailability, setIsChangingAvailability] = useState(false);
  const [locationPermissionState, setLocationPermissionState] =
    useState<LocationPermissionState>('checking');
  const [syncStatus, setSyncStatus] = useState<LocationSyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkedToken = useRef<string | null>(null);

  const loginMutation = useLoginMaximus({ request: COOKIE_REQUEST_OPTIONS });
  const companyLoginMutation = useLoginToCompany({ request: COOKIE_REQUEST_OPTIONS });
  const createMobileSessionMutation = useCreateTransportDriverMobileSession({
    request: COOKIE_REQUEST_OPTIONS,
  });
  const logoutCookieMutation = useLogoutMaximus({ request: COOKIE_REQUEST_OPTIONS });
  const revokeMobileSessionMutation = useRevokeTransportDriverMobileSession({
    request: BEARER_REQUEST_OPTIONS,
  });
  const availabilityMutation = useUpdateTransportDriverMobileAvailability({
    request: BEARER_REQUEST_OPTIONS,
  });
  const sessionQuery = useGetTransportDriverMobileSession({
    query: {
      queryKey: getGetTransportDriverMobileSessionQueryKey(),
      enabled: isHydrated && Boolean(accessToken) && Boolean(API_ORIGIN),
      retry: false,
      refetchInterval: 30_000,
    },
    request: BEARER_REQUEST_OPTIONS,
  });
  const refetchSession = sessionQuery.refetch;

  const driver = sessionQuery.data?.driver ?? null;
  const unauthorized = [401, 403].includes(errorStatus(sessionQuery.error) ?? 0);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      if (Platform.OS === 'web') {
        if (active) {
          setAccessToken(null);
          setIsHydrated(true);
        }
        return;
      }

      try {
        const storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (!active) return;

        setAccessToken(storedToken);
        setIsHydrated(true);
        if (!storedToken) {
          await stopDriverLocationUpdates();
        }
      } catch {
        if (!active) return;
        setError('Le stockage sécurisé est indisponible sur cet appareil.');
        setIsHydrated(true);
      }
    };

    void restore();
    return () => {
      active = false;
    };
  }, []);

  const inspectAndResumeLocation = useCallback(async () => {
    setError(null);
    if (Platform.OS === 'web') {
      setIsTracking(false);
      setLocationPermissionState('unsupported');
      return;
    }

    setIsTracking(false);
    setLocationPermissionState('checking');

    try {
      const foreground = await Location.getForegroundPermissionsAsync();
      const background = await Location.getBackgroundPermissionsAsync();
      if (!foreground.granted || !background.granted) {
        await stopDriverLocationUpdates();
        setLocationPermissionState(
          !foreground.canAskAgain || !background.canAskAgain
            ? 'settings-required'
            : 'needs-permission',
        );
        return;
      }

      if (!(await Location.hasServicesEnabledAsync())) {
        await stopDriverLocationUpdates();
        setLocationPermissionState('services-disabled');
        return;
      }

      await startDriverLocationUpdates();
      await sendCurrentDriverLocation();
      await refetchSession();
      setIsTracking(true);
      setLocationPermissionState('ready');
    } catch (locationError) {
      setIsTracking(false);
      setLocationPermissionState('needs-permission');
      setError(errorMessage(locationError));
      try {
        await stopDriverLocationUpdates();
      } catch (stopError) {
        setError(
          `${errorMessage(locationError)} Le suivi GPS n’a pas pu être arrêté : ${errorMessage(stopError)}`,
        );
      }
    }
  }, [refetchSession]);

  useEffect(() => {
    if (!accessToken || !sessionQuery.data || checkedToken.current === accessToken) return;
    checkedToken.current = accessToken;
    void inspectAndResumeLocation();
  }, [accessToken, inspectAndResumeLocation, sessionQuery.data]);

  const hasDriverSession = Boolean(sessionQuery.data);

  useEffect(() => {
    if (Platform.OS === 'web' || !accessToken || !hasDriverSession) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !isActivatingLocation) {
        void inspectAndResumeLocation();
      }
    });

    return () => subscription.remove();
  }, [
    accessToken,
    hasDriverSession,
    inspectAndResumeLocation,
    isActivatingLocation,
  ]);

  useEffect(() => {
    if (!accessToken || !unauthorized) return;

    let active = true;
    const clearExpiredSession = async () => {
      try {
        await stopDriverLocationUpdates();
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      } finally {
        if (active) {
          checkedToken.current = null;
          setAccessToken(null);
          setIsTracking(false);
          setLocationPermissionState('checking');
          setError('Votre session chauffeur a expiré ou votre accès Transport a changé. Reconnectez-vous.');
          queryClient.removeQueries({ queryKey: sessionQuery.queryKey });
        }
      }
    };

    void clearExpiredSession();
    return () => {
      active = false;
    };
  }, [accessToken, queryClient, sessionQuery.queryKey, unauthorized]);

  useEffect(() => {
    if (!accessToken) {
      setSyncStatus(null);
      return;
    }

    let active = true;
    const refreshSyncStatus = async () => {
      try {
        const status = await readLocationSyncStatus();
        if (active) setSyncStatus(status);
      } catch {
        if (active) setSyncStatus(null);
      }
    };

    void refreshSyncStatus();
    const interval = setInterval(() => void refreshSyncStatus(), 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [accessToken]);

  const refreshSession = useCallback(async () => {
    await sessionQuery.refetch();
  }, [sessionQuery]);

  const signIn = useCallback(
    async (email: string, password: string, companySlug = ''): Promise<boolean> => {
      setError(null);
      if (Platform.OS === 'web') {
        setError('La connexion chauffeur sécurisée nécessite l’application native iOS ou Android.');
        return false;
      }
      if (!API_ORIGIN) {
        setError('L’adresse du serveur MAXIMUS n’est pas configurée pour cette version.');
        return false;
      }

      setIsSigningIn(true);
      let mobileToken: string | null = null;

      try {
        const credentials = { email: email.trim(), password };
        if (companySlug.trim()) {
          await companyLoginMutation.mutateAsync({
            slug: companySlug.trim().toLowerCase(),
            data: credentials,
          });
        } else {
          await loginMutation.mutateAsync({ data: credentials });
        }

        const mobileSession = await createMobileSessionMutation.mutateAsync({
          data: { deviceName: `${Platform.OS} · MAXIMUS Chauffeur` },
        });
        mobileToken = mobileSession.accessToken;

        try {
          await logoutCookieMutation.mutateAsync();
        } catch (logoutError) {
          let revokeDetail = '';
          try {
            await revokeTransportDriverMobileSession({
              credentials: 'omit',
              headers: { Authorization: `Bearer ${mobileToken}` },
            });
          } catch (revokeError) {
            revokeDetail = ` La révocation du jeton mobile n’a pas été confirmée : ${errorMessage(revokeError)}`;
          }
          throw new Error(
            `La fermeture de la session de connexion a échoué : ${errorMessage(logoutError)}.${revokeDetail}`,
          );
        }

        try {
          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, mobileToken);
        } catch (storageError) {
          let revokeDetail = '';
          try {
            await revokeTransportDriverMobileSession({
              credentials: 'omit',
              headers: { Authorization: `Bearer ${mobileToken}` },
            });
          } catch (revokeError) {
            revokeDetail = ` Le serveur n’a pas confirmé la révocation : ${errorMessage(revokeError)}`;
          }
          throw new Error(
            `Impossible de sécuriser la session sur cet appareil : ${errorMessage(storageError)}.${revokeDetail}`,
          );
        }

        checkedToken.current = null;
        queryClient.removeQueries();
        setAccessToken(mobileToken);
        setLocationPermissionState('checking');
        setIsTracking(false);
        return true;
      } catch (loginError) {
        if (!mobileToken) {
          try {
            await logoutCookieMutation.mutateAsync();
          } catch (logoutError) {
            setError(
              `${errorMessage(loginError)} La fermeture de la session de connexion n’a pas été confirmée : ${errorMessage(logoutError)}`,
            );
            return false;
          }
        }
        setError(errorMessage(loginError));
        return false;
      } finally {
        setIsSigningIn(false);
      }
    },
    [
      companyLoginMutation,
      createMobileSessionMutation,
      loginMutation,
      logoutCookieMutation,
      queryClient,
    ],
  );

  const activateBackgroundLocation = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (Platform.OS === 'web') {
      setLocationPermissionState('unsupported');
      setError('Le suivi en arrière-plan nécessite l’application iOS ou Android.');
      return false;
    }

    setIsActivatingLocation(true);
    try {
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (!foreground.granted) {
        await stopDriverLocationUpdates();
        setIsTracking(false);
        setLocationPermissionState(
          foreground.canAskAgain ? 'needs-permission' : 'settings-required',
        );
        setError('Autorisez la localisation pendant l’utilisation pour continuer.');
        return false;
      }

      const background = await Location.requestBackgroundPermissionsAsync();
      if (!background.granted) {
        await stopDriverLocationUpdates();
        setIsTracking(false);
        setLocationPermissionState(
          background.canAskAgain ? 'needs-permission' : 'settings-required',
        );
        setError('Autorisez aussi la localisation en arrière-plan pour rester détectable écran verrouillé.');
        return false;
      }

      if (!(await Location.hasServicesEnabledAsync())) {
        await stopDriverLocationUpdates();
        setIsTracking(false);
        setLocationPermissionState('services-disabled');
        setError('Activez le service de localisation de votre téléphone.');
        return false;
      }

      await startDriverLocationUpdates();
      await sendCurrentDriverLocation();
      await sessionQuery.refetch();
      setIsTracking(true);
      setLocationPermissionState('ready');
      return true;
    } catch (locationError) {
      setIsTracking(false);
      setLocationPermissionState('needs-permission');
      setError(errorMessage(locationError));
      try {
        await stopDriverLocationUpdates();
      } catch (stopError) {
        setError(
          `${errorMessage(locationError)} Le suivi GPS n’a pas pu être arrêté : ${errorMessage(stopError)}`,
        );
      }
      return false;
    } finally {
      setIsActivatingLocation(false);
    }
  }, [sessionQuery]);

  const refreshLocation = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      await sendCurrentDriverLocation();
      await sessionQuery.refetch();
      return true;
    } catch (locationError) {
      setIsTracking(false);
      setLocationPermissionState('needs-permission');
      setError(errorMessage(locationError));
      try {
        await stopDriverLocationUpdates();
      } catch (stopError) {
        setError(
          `${errorMessage(locationError)} Le suivi GPS n’a pas pu être arrêté : ${errorMessage(stopError)}`,
        );
      }
      return false;
    }
  }, [sessionQuery]);

  const changeAvailability = useCallback(
    async (availability: 'AVAILABLE' | 'PAUSED'): Promise<boolean> => {
      setError(null);
      if (
        availability === 'AVAILABLE' &&
        (!isTracking || locationPermissionState !== 'ready')
      ) {
        setError('Activez la localisation et obtenez une position GPS avant de devenir disponible.');
        return false;
      }
      setIsChangingAvailability(true);
      try {
        await availabilityMutation.mutateAsync({ data: { availability } });
        await sessionQuery.refetch();
        return true;
      } catch (availabilityError) {
        setError(errorMessage(availabilityError));
        return false;
      } finally {
        setIsChangingAvailability(false);
      }
    },
    [availabilityMutation, isTracking, locationPermissionState, sessionQuery],
  );

  const signOut = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (driver?.availability === 'ON_TRIP') {
      setError('Terminez la course en cours avant de fermer la session chauffeur.');
      return false;
    }

    setIsSigningOut(true);
    try {
      await availabilityMutation.mutateAsync({ data: { availability: 'PAUSED' } });
      await stopDriverLocationUpdates();
      setIsTracking(false);
      await revokeMobileSessionMutation.mutateAsync();
      await logoutCookieMutation.mutateAsync();
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);

      checkedToken.current = null;
      setAccessToken(null);
      setLocationPermissionState('checking');
      queryClient.removeQueries({ queryKey: sessionQuery.queryKey });
      return true;
    } catch (signOutError) {
      setError(errorMessage(signOutError));
      return false;
    } finally {
      setIsSigningOut(false);
    }
  }, [
    availabilityMutation,
    driver?.availability,
    logoutCookieMutation,
    queryClient,
    revokeMobileSessionMutation,
    sessionQuery.queryKey,
  ]);

  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (settingsError) {
      setError(`Impossible d’ouvrir les réglages : ${errorMessage(settingsError)}`);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<DriverSessionContextValue>(
    () => ({
      accessToken,
      isHydrated,
      driver,
      isLoadingSession: sessionQuery.isLoading,
      isRefreshingSession: sessionQuery.isFetching,
      isActivatingLocation,
      isSigningIn,
      isChangingAvailability,
      isSigningOut,
      locationPermissionState,
      isTracking,
      syncStatus,
      error,
      signIn,
      activateBackgroundLocation,
      refreshLocation,
      changeAvailability,
      signOut,
      openSettings,
      refreshSession,
      clearError,
    }),
    [
      accessToken,
      activateBackgroundLocation,
      changeAvailability,
      clearError,
      driver,
      error,
      isChangingAvailability,
      isHydrated,
      isActivatingLocation,
      isSigningIn,
      isSigningOut,
      isTracking,
      locationPermissionState,
      openSettings,
      refreshLocation,
      refreshSession,
      sessionQuery.isLoading,
      sessionQuery.isFetching,
      signIn,
      signOut,
      syncStatus,
    ],
  );

  return <DriverSessionContext.Provider value={value}>{children}</DriverSessionContext.Provider>;
}

export function useDriverSession(): DriverSessionContextValue {
  const context = useContext(DriverSessionContext);
  if (!context) throw new Error('useDriverSession doit être utilisé dans DriverSessionProvider.');
  return context;
}