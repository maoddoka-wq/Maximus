<?php

namespace App\Console\Commands;

use App\Support\MaximusDemoProvisioner;
use App\Support\ModuleCatalog;
use Illuminate\Console\Command;

class ProvisionMaximusDemo extends Command
{
    protected $signature = 'maximus:provision-demo';

    protected $description = 'Provisionne de façon idempotente les comptes et données de démonstration MAXIMUS';

    public function handle(): int
    {
        ModuleCatalog::ensureCatalog();
        MaximusDemoProvisioner::ensureAuthUsers();
        ModuleCatalog::ensureCompanyAccess('kora');
        MaximusDemoProvisioner::ensureStockSeed('kora');
        MaximusDemoProvisioner::ensureStockWorkflowSeed('kora');
        MaximusDemoProvisioner::ensureControlSeed('kora');
        MaximusDemoProvisioner::ensurePresenceSeed('kora');

        $this->info('Provisionnement MAXIMUS terminé.');

        return self::SUCCESS;
    }
}
