<?php

namespace App\Console\Commands;

use App\Support\ModuleCatalog;
use Illuminate\Console\Command;

class ProvisionMaximusDemo extends Command
{
    protected $signature = 'maximus:provision-demo';

    protected $description = 'Vérifie le catalogue MAXIMUS sans créer de données métier de démonstration';

    public function handle(): int
    {
        if ($this->laravel->environment('production')) {
            $this->error('Le provisioning de démonstration est désactivé en production.');

            return self::FAILURE;
        }

        ModuleCatalog::ensureCatalog();

        $this->info('Catalogue MAXIMUS vérifié. Aucune donnée de démonstration n’a été créée.');

        return self::SUCCESS;
    }
}
