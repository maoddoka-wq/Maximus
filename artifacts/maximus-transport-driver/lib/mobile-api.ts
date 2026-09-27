import * as SecureStore from 'expo-secure-store';
import {
  setAuthTokenGetter,
  setBaseUrl,
} from '@workspace/api-client-react';

export const ACCESS_TOKEN_KEY = 'maximus-transport-driver-token';
export const LOCATION_TASK_NAME = 'maximus-transport-driver-background-location';
export const LOCATION_SYNC_STATUS_KEY = 'maximus-transport-driver-location-sync';

const configuredDomain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
export const API_ORIGIN = configuredDomain
  ? `https://${configuredDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
  : null;

export const BEARER_REQUEST_OPTIONS = {
  credentials: 'omit' as const,
};

export const COOKIE_REQUEST_OPTIONS = API_ORIGIN
  ? {
      credentials: 'include' as const,
      headers: { Origin: API_ORIGIN },
    }
  : {
      credentials: 'include' as const,
    };

let isConfigured = false;

export function configureMobileApi(): void {
  if (!API_ORIGIN || isConfigured) return;

  setBaseUrl(API_ORIGIN);
  setAuthTokenGetter(() => SecureStore.getItemAsync(ACCESS_TOKEN_KEY));
  isConfigured = true;
}