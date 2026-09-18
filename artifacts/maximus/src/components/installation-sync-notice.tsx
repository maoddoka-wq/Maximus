import type { InstallationProfile } from '@/lib/installation-api';

export function InstallationSyncNotice({ sync, onRefresh }: {
  sync: InstallationProfile['sync'];
  onRefresh: () => void;
}) {
  if (!sync || (sync.state === 'synced' && !sync.lastError && !sync.versionWarning)) return null;
  const message = sync.lastError || sync.versionWarning || (
    sync.state === 'syncing' ? 'La synchronisation avec MAXIMUS principal est en cours.'
      : 'Cette installation n’a pas encore confirmé sa synchronisation avec MAXIMUS principal.'
  );
  return (
    <aside role="status" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="font-bold">Synchronisation de l’installation</p>
          <p className="mt-1 leading-6">{message}</p>
          {sync.lastSuccessAt && <p className="mt-1 text-xs">Dernière réussite : {new Date(sync.lastSuccessAt).toLocaleString('fr-FR')}</p>}
          <p className="mt-1 text-xs">Les comptes restent locaux. Une panne de synchronisation ne supprime pas vos données.</p>
        </div>
        <button type="button" onClick={onRefresh} className="shrink-0 rounded-lg border border-current px-3 py-2 text-xs font-bold">
          Actualiser l’état
        </button>
      </div>
    </aside>
  );
}