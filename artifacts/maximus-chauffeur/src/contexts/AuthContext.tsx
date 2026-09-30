import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetTransportBootstrapQueryKey,
  mobileLogin,
  mobileLogout,
  mobileSession,
} from '@workspace/api-client-react';
import type {
  MobileSessionInfo,
} from '@workspace/api-client-react';
import {
  clearMobileCredentials,
  readMobileToken,
  saveMobileToken,
} from '../lib/auth-storage';
import { stopDriverLocationTracking } from '../services/location-tracking';

type AuthStatus = 'restoring' | 'signed-out' | 'signed-in' | 'offline';

type SignInDetails = {
  email: string;
  password: string;
  companySlug?: string;
};

type AuthContextValue = {
  status: AuthStatus;
  session: MobileSessionInfo | null;
  signIn: (details: SignInDetails) => Promise<void>;
  signOut: () => Promise<void>;
  retrySession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function httpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [session, setSession] = useState<MobileSessionInfo | null>(null);

  const retrySession = useCallback(async () => {
    setStatus('restoring');
    const token = await readMobileToken();
    if (!token) {
      setSession(null);
      setStatus('signed-out');
      return;
    }

    try {
      const restored = await mobileSession();
      setSession(restored);
      setStatus('signed-in');
    } catch (error) {
      if (httpStatus(error) === 401 || httpStatus(error) === 403) {
        await stopDriverLocationTracking();
        await clearMobileCredentials();
        setSession(null);
        setStatus('signed-out');
        return;
      }
      setStatus('offline');
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const token = await readMobileToken();
    if (!token) return;

    try {
      const refreshed = await mobileSession();
      setSession(refreshed);
      setStatus('signed-in');
      void queryClient.invalidateQueries({ queryKey: getGetTransportBootstrapQueryKey() });
    } catch (error) {
      if (httpStatus(error) !== 401 && httpStatus(error) !== 403) return;
      await stopDriverLocationTracking();
      await clearMobileCredentials();
      queryClient.clear();
      setSession(null);
      setStatus('signed-out');
    }
  }, [queryClient]);

  useEffect(() => {
    void retrySession();
  }, [retrySession]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshSession();
    });
    return () => subscription.remove();
  }, [refreshSession]);

  const signIn = useCallback(
    async ({ email, password, companySlug }: SignInDetails) => {
      const result = await mobileLogin({
        email: email.trim(),
        password,
        companySlug: companySlug?.trim() || undefined,
        deviceName: Platform.OS === 'android' ? 'Android — MAXIMUS Chauffeur' : 'MAXIMUS Chauffeur',
      });

      await saveMobileToken(result.token);
      const { token: _token, ...sessionInfo } = result;
      setSession(sessionInfo);
      setStatus('signed-in');
      queryClient.clear();
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await mobileLogout();
    } catch {
      // Always clear local credentials; the server token expires if offline.
    }
    await stopDriverLocationTracking();
    await clearMobileCredentials();
    queryClient.clear();
    setSession(null);
    setStatus('signed-out');
  }, [queryClient]);

  const value = useMemo(
    () => ({ status, session, signIn, signOut, retrySession }),
    [status, session, signIn, signOut, retrySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}