<?php

namespace App\Console\Commands;

use App\Support\MaximusDemoProvisioner;
use Illuminate\Console\Command;

class ProvisionMaximusDemo extends Command
{
    protected $signature = 'maximus:provision-demo';

    protected $description = 'Provisionne de façon idempotente les comptes et données de démonstration MAXIMUS';

    public function handle(): int
    {
        MaximusDemoProvisioner::ensureAuthUsers();
        MaximusDemoProvisioner::ensureStockSeed();

        $this->info('Provisionnement MAXIMUS terminé.');

        return self::SUCCESS;
    }
}