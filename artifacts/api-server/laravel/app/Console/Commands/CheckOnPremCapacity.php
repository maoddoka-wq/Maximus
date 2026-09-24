<?php

namespace App\Console\Commands;

use App\Support\OnPremPostgresCapacityBudget;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

final class CheckOnPremCapacity extends Command
{
    protected $signature = 'maximus:check-on-prem-capacity
        {--php-workers= : Maximum PHP-FPM or IIS FastCGI worker processes}
        {--db-reserve= : PostgreSQL connections reserved for scheduler, administration and maintenance}
        {--url= : Exact HTTPS URL employees will use}';

    protected $description = 'Vérifie la configuration MAXIMUS locale et le budget PostgreSQL pour le pool web choisi.';

    public function handle(): int
    {
        $workers = $this->positiveIntegerOption('php-workers');
        $databaseReserve = $this->nonNegativeIntegerOption('db-reserve');
        $expectedUrl = rtrim(trim((string) $this->option('url')), '/');

        if ($workers === null || $databaseReserve === null || $expectedUrl === '') {
            $this->error('Indiquer --php-workers, --db-reserve et --url=https://nom-interne.');

            return self::FAILURE;
        }

        $errors = [];
        $urlParts = parse_url($expectedUrl);

        if (! is_array($urlParts) || strtolower((string) ($urlParts['scheme'] ?? '')) !== 'https' || empty($urlParts['host'])) {
            $errors[] = '--url doit être une adresse HTTPS avec un nom d’hôte.';
        }

        if (rtrim((string) config('app.url'), '/') !== $expectedUrl) {
            $errors[] = 'APP_URL ne correspond pas exactement à l’adresse HTTPS fournie.';
        }

        if (app()->environment() !== 'production' || (bool) config('app.debug')) {
            $errors[] = 'APP_ENV doit être production et APP_DEBUG doit être false.';
        }

        if (! in_array((string) config('maximus.deployment_mode'), ['dedicated', 'on_premise'], true)) {
            $errors[] = 'MAXIMUS_DEPLOYMENT_MODE doit être dedicated ou on_premise.';
        }

        if (config('database.default') !== 'pgsql') {
            $errors[] = 'DB_CONNECTION doit être pgsql.';
        }

        if (config('session.secure') !== true) {
            $errors[] = 'SESSION_SECURE_COOKIE doit être activé pour la connexion HTTPS.';
        }

        if (trim((string) config('app.key')) === '') {
            $errors[] = 'APP_KEY doit être configurée.';
        }

        if (! is_file(public_path('index.html')) || ! is_file(public_path('index.php'))) {
            $errors[] = 'Le frontend compilé et le point d’entrée Laravel doivent exister dans public/.';
        }

        foreach ([storage_path(), storage_path('framework/cache'), storage_path('logs'), bootstrap_path('cache')] as $writablePath) {
            if (! is_dir($writablePath) || ! is_writable($writablePath)) {
                $errors[] = 'Répertoire absent ou non inscriptible par le compte PHP : '.$writablePath;
            }
        }

        if ($errors !== []) {
            foreach ($errors as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        try {
            $postgres = DB::selectOne(
                "SELECT current_setting('max_connections')::integer AS max_connections,
                    current_setting('superuser_reserved_connections')::integer AS superuser_reserved_connections"
            );
        } catch (Throwable $exception) {
            report($exception);
            $this->error('Impossible de lire les limites de connexion PostgreSQL avec le compte configuré.');

            return self::FAILURE;
        }

        $budget = OnPremPostgresCapacityBudget::calculate(
            (int) $postgres->max_connections,
            (int) $postgres->superuser_reserved_connections,
            $workers,
            $databaseReserve,
        );

        $this->line('URL employés : '.$expectedUrl);
        $this->line('Workers PHP simultanés : '.$workers);
        $this->line('Connexions PostgreSQL utilisables : '.$budget['usable_connections']);
        $this->line('Réserve demandée pour les tâches non web : '.$databaseReserve);
        $this->line('Connexions restantes après le pool : '.$budget['remaining_connections']);

        if (! $budget['fits']) {
            $this->error('Le pool PHP dépasse le budget PostgreSQL. Réduire --php-workers ou augmenter prudemment max_connections.');

            return self::FAILURE;
        }

        $this->info('Précontrôle MAXIMUS local réussi. Cela vérifie la configuration et les connexions, pas les performances réelles du serveur.');

        return self::SUCCESS;
    }

    private function positiveIntegerOption(string $name): ?int
    {
        $value = filter_var($this->option($name), FILTER_VALIDATE_INT);

        return $value !== false && $value > 0 ? $value : null;
    }

    private function nonNegativeIntegerOption(string $name): ?int
    {
        $value = filter_var($this->option($name), FILTER_VALIDATE_INT);

        return $value !== false && $value >= 0 ? $value : null;
    }
}
