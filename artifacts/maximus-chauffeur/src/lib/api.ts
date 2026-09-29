import { customFetch, setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { readMobileToken } from './auth-storage';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'https://maximus-erp.onrender.com'
).replace(/\/+$/, '');

setBaseUrl(API_BASE_URL);
setAuthTokenGetter(readMobileToken);

export { customFetch };