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
import { Platform } from 'react-native';
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

type DriverSessionContextValue = {
  accessToken: string | null;
  isHydrated: boolean;
  driver: DriverMobile | null;
  isLoadingSession: boolean;
  isRefreshingSession: boolean;
  isSigningIn: boolean;
  isChangingAvailability: boolean;
  isSigningOut: boolean;
  error: string | null;
  signIn: (email: string, password: string, companySlug?: string) => Promise<boolean>;
  changeAvailability: (availability: 'AVAILABLE' | 'PAUSED') => Promise<boolean>;
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
  const [error, setError] = useState<string | null>(null);
  const autoPauseInProgress = useRef(false);

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

  const pauseAvailableDriver = useCallback(
    async (reason: string) => {
      if (
        sessionQuery.data?.driver.availability !== 'AVAILABLE' ||
        autoPauseInProgress.current
      ) {
        return;
      }

      autoPauseInProgress.current = true;
      try {
        await availabilityMutation.mutateAsync({ data: { availability: 'PAUSED' } });
        await refetchSession();
      } catch (pauseError) {
        setError(
          `${reason} La mise en pause côté serveur n’a pas pu être confirmée : ${errorMessage(pauseError)}`,
        );
      } finally {
        autoPauseInProgress.current = false;
      }
    },
    [availabilityMutation, refetchSession, sessionQuery.data?.driver.availability],
  );

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
    if (
      !accessToken ||
      sessionQuery.data?.driver.availability !== 'AVAILABLE'
    ) {
      return;
    }

    void pauseAvailableDriver(
      'Le suivi GPS est désactivé dans MAXIMUS Chauffeur.',
    );
  }, [accessToken, pauseAvailableDriver, sessionQuery.data?.driver.availability]);

  useEffect(() => {
    if (!accessToken || !unauthorized) return;

    let active = true;
    const clearExpiredSession = async () => {
      try {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      } finally {
        if (active) {
          setAccessToken(null);
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
        setError('La disponibilité ne peut pas être activée sans suivi GPS.');
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
    [availabilityMutation, sessionQuery],
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
      isLoadingSession: sessionQuery.isLoading,
      isRefreshingSession: sessionQuery.isFetching,
      isSigningIn,
      isChangingAvailability,
      isSigningOut,
      error,
      signIn,
      changeAvailability,
      signOut,
      refreshSession,
      clearError,
    }),
    [
      accessToken,
      changeAvailability,
      clearError,
      driver,
      error,
      isChangingAvailability,
      isHydrated,
      isSigningIn,
      isSigningOut,
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