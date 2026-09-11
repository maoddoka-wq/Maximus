import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { applyCompanyTheme } from '@/lib/company-theme';
import { initializePwa } from '@/lib/pwa';

import './index.css';

// Une PWA peut reprendre le document après une session entreprise.
// Nettoyer les variables globales avant le premier rendu garantit que
// l'accueil MAXIMUS ne démarre jamais avec la couleur d'un tenant.
applyCompanyTheme(undefined);
initializePwa();

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
