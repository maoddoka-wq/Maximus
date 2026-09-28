import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, ExternalLink, RefreshCw, Smartphone } from 'lucide-react';
import {
  DRIVER_ANDROID_APK_ASSET,
  DRIVER_ANDROID_RELEASE_API_URL,
  DRIVER_ANDROID_RELEASES_URL,
  parseDriverAndroidRelease,
  type DriverAndroidRelease,
} from '@/lib/driver-app-release';

type LoadState = 'loading' | 'ready' | 'not-published' | 'error';

export function TransportDriverInstallCard() {
  const [release, setRelease] = useState<DriverAndroidRelease | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadRelease = async () => {
      setLoadState('loading');
      setRelease(null);
      setQrCode('');

      try {
        const response = await fetch(DRIVER_ANDROID_RELEASE_API_URL, {
          headers: { Accept: 'application/vnd.github+json' },
        });

        if (response.status === 404) {
          if (!cancelled) setLoadState('not-published');
          return;
        }
        if (!response.ok) {
          throw new Error(`GitHub Releases a répondu HTTP ${response.status}.`);
        }

        const nextRelease = parseDriverAndroidRelease(await response.json());
        if (!nextRelease) {
          if (!cancelled) setLoadState('not-published');
          return;
        }

        const nextQrCode = await QRCode.toDataURL(nextRelease.downloadUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 240,
        });

        if (cancelled) return;
        setRelease(nextRelease);
        setQrCode(nextQrCode);
        setLoadState('ready');
      } catch {
        if (!cancelled) setLoadState('error');
      }
    };

    void loadRelease();
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  return (
    <section
      aria-labelledby="driver-app-install-title"
      className="card-surface grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"
      data-testid="card-transport-driver-install"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
            <Smartphone size={20} />
          </span>
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
              Installation chauffeur
            </p>
            <h2 id="driver-app-install-title" className="mt-1 text-lg font-black tracking-[-.03em]">
              MAXIMUS Chauffeur pour Android
            </h2>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Une seule application sert toutes les entreprises. Quand un code de connexion est utilisé,
          il sélectionne l’espace de l’entreprise; le chauffeur entre ensuite ses identifiants habituels.
        </p>

        {loadState === 'loading' ? (
          <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]" role="status" data-testid="status-driver-apk-loading">
            Vérification de la dernière version publiée…
          </p>
        ) : null}

        {loadState === 'not-published' ? (
          <div className="mt-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]" role="status" data-testid="status-driver-apk-not-published">
            Le premier APK Android n’est pas encore publié. Le QR et le téléchargement seront activés dès la première génération signée.
          </div>
        ) : null}

        {loadState === 'error' ? (
          <div className="mt-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-3" role="alert" data-testid="status-driver-apk-error">
            <p className="text-sm leading-6 text-[hsl(var(--foreground))]">
              Impossible de vérifier la version Android publiée. Réessayez ou consultez les versions MAXIMUS.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="button-retry-driver-apk"
                onClick={() => setRetryCount(count => count + 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
              >
                <RefreshCw size={14} />
                Réessayer
              </button>
              <a
                href={DRIVER_ANDROID_RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                data-testid="link-driver-apk-releases"
                className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
              >
                Voir les versions <ExternalLink size={13} />
              </a>
            </div>
          </div>
        ) : null}

        {loadState === 'ready' && release ? (
          <>
            <p className="mt-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]" data-testid="text-driver-apk-version">
              Version disponible : {release.version}
            </p>
            <a
              href={release.downloadUrl}
              data-testid="link-download-driver-apk"
              className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90"
            >
              <Download size={16} />
              Télécharger l’APK Android
            </a>
            <p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              Fichier partagé : {DRIVER_ANDROID_APK_ASSET}. Le téléphone peut demander d’autoriser l’installation depuis le navigateur.
            </p>
          </>
        ) : null}
      </div>

      {loadState === 'ready' && qrCode ? (
        <a
          href={release?.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-fit flex-col items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-center"
          data-testid="link-driver-apk-qr"
        >
          <img
            src={qrCode}
            alt="QR code de téléchargement de MAXIMUS Chauffeur pour Android"
            className="h-48 w-48 rounded-md"
            data-testid="image-driver-apk-qr"
          />
          <span className="text-xs font-bold text-[hsl(var(--foreground))]">
            Scanner pour télécharger
          </span>
        </a>
      ) : null}
    </section>
  );
}