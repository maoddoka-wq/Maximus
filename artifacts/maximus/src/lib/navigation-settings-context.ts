import { createContext } from 'react';

export type NavigationSettingsContextValue = {
  isCompanyAdmin: boolean;
  onSaved?: () => Promise<unknown> | void;
};

/** Provided by App: only the signed-in company administrator gets isCompanyAdmin. */
export const NavigationSettingsContext = createContext<NavigationSettingsContextValue>({ isCompanyAdmin: false });
