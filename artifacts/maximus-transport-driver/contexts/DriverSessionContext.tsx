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
  type DriverMobileCapabilities,
} from '@workspace/api-client-react';
import {
  ACCESS_TOKEN_KEY,
  API_ORIGIN,
  BEARER_REQUEST_OPTIONS,
  COOKIE_REQUEST_OPTIONS,
} from '@/lib/mobile-api';
import {
  startDriverLocationTracking,
  stopDriverLocationTracking,
  uploadDriverLocation,
} from '@/lib/driver-location';

type DriverSessionContextValue = {
  accessToken: string | null;
  isHydrated: boolean;
  driver: DriverMobile | null;
  capabilities: DriverMobileCapabilities | null;
  isLoadingSession: boolean;
  isRefreshingSession: boolean;
  isSigningIn: boolean;
  isChangingAvailability: boolean;
  isSigningOut: boolean;
  isGpsTracking: boolean;
  isEnablingGps: boolean;
  gpsError: string | null;
  gpsNeedsSettings: boolean;
  error: string | null;
  signIn: (email: string, password: string, companySlug?: string) => Promise<boolean>;
  changeAvailability: (availability: 'AVAILABLE' | 'PAUSED') => Promise<boolean>;
  enableGpsTracking: () => Promise<boolean>;
  openLocationSettings: () => Promise<void>;
  signOut: () => Promise<boolean>;
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
  const [isChangingAvailability, setIsChangingAvailability] = useState(false);
  const [isGpsTracking, setIsGpsTracking] = useState(false);
  const [isEnablingGps, setIsEnablingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsNeedsSettings, setGpsNeedsSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gpsStartPromise = useRef<Promise<boolean> | null>(null);

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
  const driver = sessionQuery.data?.driver ?? null;
  const capabilities = sessionQuery.data?.capabilities ?? null;
  const unauthorized = [401, 403].includes(errorStatus(sessionQuery.error) ?? 0);

  const ensureGpsTracking = useCallback(
    (requestPermission: boolean): Promise<boolean> => {
      if (gpsStartPromise.current) return gpsStartPromise.current;

      let operation: Promise<boolean>;
      operation = (async () => {
        setGpsError(null);
        setGpsNeedsSettings(false);
        if (Platform.OS === 'web') {
          setGpsError('Le suivi GPS en arrière-plan nécessite l’application Android ou iOS.');
          return false;
        }
        if (!capabilities?.canUpdateGps) {
          setGpsError('Votre rôle ne permet pas la mise à jour de la position Transport.');
          return false;
        }

        setIsEnablingGps(true);
        try {
          let foregroundPermission = await Location.getForegroundPermissionsAsync();
          if (!foregroundPermission.granted && requestPermission) {
            foregroundPermission = await Location.requestForegroundPermissionsAsync();
          }
          if (!foregroundPermission.granted) {
            setGpsNeedsSettings(!foregroundPermission.canAskAgain);
            setGpsError('Autorisez l’accès à la position pour activer votre suivi GPS.');
            return false;
          }

          let backgroundPermission = await Location.getBackgroundPermissionsAsync();
          if (!backgroundPermission.granted && requestPermission) {
            backgroundPermission = await Location.requestBackgroundPermissionsAsync();
          }
          if (!backgroundPermission.granted) {
            setGpsNeedsSettings(!backgroundPermission.canAskAgain);
            setGpsError(
              'Autorisez la position en arrière-plan pour garder le GPS à jour lorsque l’application est fermée.',
            );
            return false;
          }

          if (!(await Location.hasServicesEnabledAsync())) {
            setGpsError('Activez le service de localisation de votre téléphone.');
            return false;
          }

          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          await uploadDriverLocation(currentLocation);
          await startDriverLocationTracking();
          setIsGpsTracking(true);
          await sessionQuery.refetch();
          return true;
        } catch (locationError) {
          setIsGpsTracking(false);
          setGpsError(errorMessage(locationError));
          return false;
        } finally {
          setIsEnablingGps(false);
        }
      })().finally(() => {
        if (gpsStartPromise.current === operation) {
          gpsStartPromise.current = null;
        }
      });

      gpsStartPromise.current = operation;
      return operation;
    },
    [capabilities?.canUpdateGps, sessionQuery.refetch],
  );

  const enableGpsTracking = useCallback(
    () => ensureGpsTracking(true),
    [ensureGpsTracking],
  );

  const openLocationSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

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

  useEffect(() => {
    const shouldTrack = Boolean(
      accessToken &&
        capabilities?.canUpdateGps &&
        (driver?.availability === 'AVAILABLE' || driver?.availability === 'ON_TRIP'),
    );
    if (shouldTrack) {
      void ensureGpsTracking(false);
      return;
    }

    void stopDriverLocationTracking()
      .then(() => setIsGpsTracking(false))
      .catch((stopError) => setGpsError(errorMessage(stopError)));
  }, [accessToken, capabilities?.canUpdateGps, driver?.availability, ensureGpsTracking]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (
        state === 'active' &&
        accessToken &&
        capabilities?.canUpdateGps &&
        (driver?.availability === 'AVAILABLE' || driver?.availability === 'ON_TRIP')
      ) {
        void ensureGpsTracking(false);
      }
    });
    return () => subscription.remove();
  }, [accessToken, capabilities?.canUpdateGps, driver?.availability, ensureGpsTracking]);

  useEffect(() => {
    if (!accessToken || !unauthorized) return;

    let active = true;
    const clearExpiredSession = async () => {
      try {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      } finally {
        await stopDriverLocationTracking().catch(() => undefined);
        if (active) {
          setAccessToken(null);
          setIsGpsTracking(false);
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

        queryClient.removeQueries();
        setAccessToken(mobileToken);
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

  const changeAvailability = useCallback(
    async (availability: 'AVAILABLE' | 'PAUSED'): Promise<boolean> => {
      setError(null);
      if (availability === 'AVAILABLE') {
        if (!(await ensureGpsTracking(true))) return false;
      }
      setIsChangingAvailability(true);
      try {
        await availabilityMutation.mutateAsync({ data: { availability } });
        if (availability === 'PAUSED') {
          await stopDriverLocationTracking();
          setIsGpsTracking(false);
        }
        await sessionQuery.refetch();
        return true;
      } catch (availabilityError) {
        setError(errorMessage(availabilityError));
        return false;
      } finally {
        setIsChangingAvailability(false);
      }
    },
    [availabilityMutation, ensureGpsTracking, sessionQuery],
  );

  const signOut = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (driver?.availability === 'ON_TRIP') {
      setError('Terminez la course en cours avant de fermer la session chauffeur.');
      return false;
    }
    setIsSigningOut(true);
    try {
      if (driver?.availability !== 'PAUSED') {
        await availabilityMutation.mutateAsync({ data: { availability: 'PAUSED' } });
      }
      await stopDriverLocationTracking();
      setIsGpsTracking(false);
      await revokeMobileSessionMutation.mutateAsync();
      await logoutCookieMutation.mutateAsync();
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);

      setAccessToken(null);
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

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<DriverSessionContextValue>(
    () => ({
      accessToken,
      isHydrated,
      driver,
      capabilities,
      isLoadingSession: sessionQuery.isLoading,
      isRefreshingSession: sessionQuery.isFetching,
      isSigningIn,
      isChangingAvailability,
      isSigningOut,
      isGpsTracking,
      isEnablingGps,
      gpsError,
      gpsNeedsSettings,
      error,
      signIn,
      changeAvailability,
      enableGpsTracking,
      openLocationSettings,
      signOut,
      refreshSession,
      clearError,
    }),
    [
      accessToken,
      capabilities,
      changeAvailability,
      clearError,
      driver,
      enableGpsTracking,
      error,
      isChangingAvailability,
      isEnablingGps,
      isGpsTracking,
      isHydrated,
      isSigningIn,
      isSigningOut,
      gpsError,
      gpsNeedsSettings,
      openLocationSettings,
      refreshSession,
      sessionQuery.isLoading,
      sessionQuery.isFetching,
      signIn,
      signOut,
    ],
  );

  return <DriverSessionContext.Provider value={value}>{children}</DriverSessionContext.Provider>;
}

export function useDriverSession(): DriverSessionContextValue {
  const context = useContext(DriverSessionContext);
  if (!context) throw new Error('useDriverSession doit être utilisé dans DriverSessionProvider.');
  return context;
}