import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { applyCompanyTheme } from '@/lib/company-theme';
import { initializePwa } from '@/lib/pwa';
import { installVitePreloadRecovery } from '@/lib/vite-preload-recovery';
import { isAnaPreviewPath } from '@/lib/ana-preview-path';

import './index.css';

// Une PWA peut reprendre le document après une session entreprise.
// Nettoyer les variables globales avant le premier rendu garantit que
// l'accueil MAXIMUS ne démarre jamais avec la couleur d'un tenant.
applyCompanyTheme(undefined);
const root = createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
});

if (import.meta.env.DEV && isAnaPreviewPath(window.location.pathname, import.meta.env.BASE_URL)) {
  void import('./pages/ana-preview').then(({ default: AnaPreviewApp }) => {
    root.render(
      <ErrorBoundary>
        <AnaPreviewApp />
      </ErrorBoundary>,
    );
  });
} else {
  if (import.meta.env.PROD) installVitePreloadRecovery();
  initializePwa();
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
}
