<?php

namespace App\Console\Commands;

use App\Services\InstallationSyncService;
use App\Support\InstallationContext;
use Illuminate\Console\Command;

final class SyncCentralInstallation extends Command
{
    protected $signature = 'maximus:sync-central-installation';
    protected $description = 'Synchronise une installation dédiée avec MAXIMUS principal';

    public function handle(InstallationSyncService $sync): int
    {
        if (! InstallationContext::isCompanyOnly()) {
            $this->error('La synchronisation centrale ne concerne que les installations dédiées.');
            return self::FAILURE;
        }

        try {
            $company = $sync->apply($sync->fetch());
            $sync->heartbeat();
            $this->info('Configuration centrale synchronisée pour '.$company->name.'.');
            return self::SUCCESS;
        } catch (\Throwable $exception) {
            $this->error($exception->getMessage());
            return self::FAILURE;
        }
    }
}