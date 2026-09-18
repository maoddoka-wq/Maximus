<?php

namespace App\Console\Commands;

use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Services\InstallationSyncService;
use App\Support\InstallationContext;
use App\Support\InstallationSyncState;
use App\Support\MaximusPassword;
use App\Support\ApplicationIdentity;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class InstallCompanyInstance extends Command
{
    protected $signature = 'maximus:install-company';

    protected $description = 'Initialise une installation MAXIMUS dédiée depuis sa configuration centrale';

    public function handle(InstallationSyncService $sync): int
    {
        if (! InstallationContext::isCompanyOnly()) {
            $this->error('MAXIMUS_DEPLOYMENT_MODE doit être dedicated ou on_premise.');
            return self::FAILURE;
        }
        // Entrypoints may run this command again at startup. An enrolled local
        // instance must start offline and must not reset a recovered password.
        $configuredCompanyId = InstallationContext::companyId();
        if ($configuredCompanyId !== null && InstallationSyncState::summary()['lastSuccessAt'] !== null
            && InstallationContext::company() !== null
            && AuthUser::query()->whereKey('company-admin:'.$configuredCompanyId)
                ->where('company_id', $configuredCompanyId)->where('role', 'company_admin')->exists()) {
            $this->info('Installation déjà initialisée ; configuration et administrateur locaux conservés, sans appel central.');
            $this->line('La synchronisation périodique reste indépendante du démarrage.');
            return self::SUCCESS;
        }
        if (ApplicationIdentity::packageVersion() === 'unknown') {
            $this->error('Cette copie locale ne contient pas son identifiant de build. Utilisez une archive générée par scripts/package-maximus-instance.sh.');
            return self::FAILURE;
        }

        try {
            $company = $sync->apply($sync->fetch(true), true);
        } catch (\Throwable $exception) {
            $this->error('Configuration centrale indisponible : '.$exception->getMessage());
            return self::FAILURE;
        }

        $companyId = InstallationContext::companyId();
        $adminEmail = strtolower(trim((string) env('MAXIMUS_ADMIN_USER', env('ADMIN_USER', $company->email))));
        $adminPassword = (string) env('MAXIMUS_ADMIN_PASSWORD', env('ADMIN_PASSWORD', ''));

        if ($companyId === null || $companyId !== (string) $company->id) {
            $this->error('MAXIMUS_INSTALLATION_COMPANY_ID doit correspondre à l’entreprise validée par MAXIMUS principal.');
            return self::FAILURE;
        }
        $existingAdmin = AuthUser::query()->find('company-admin:'.$companyId);
        if ($existingAdmin) {
            if ($existingAdmin->role !== 'company_admin' || (string) $existingAdmin->company_id !== $companyId) {
                $this->error('Identité administrateur locale incompatible. Aucun compte modifié.');
                return self::FAILURE;
            }
            $this->info('Configuration synchronisée ; administrateur local existant conservé.');
            $this->line('Pour récupérer le mot de passe local : php artisan maximus:recover-admin');
            return self::SUCCESS;
        }
        if (! filter_var($adminEmail, FILTER_VALIDATE_EMAIL) || strlen($adminPassword) < 8) {
            $this->error('MAXIMUS_ADMIN_USER doit être valide et MAXIMUS_ADMIN_PASSWORD doit contenir au moins 8 caractères.');
            return self::FAILURE;
        }
        if (AuthUser::query()->where('email', $adminEmail)->where('id', '!=', 'company-admin:'.$companyId)->exists()) {
            $this->error('MAXIMUS_ADMIN_USER est déjà utilisé par un autre compte.');
            return self::FAILURE;
        }

        DB::transaction(function () use ($company, $adminEmail, $adminPassword): void {
            $adminId = 'company-admin:'.$company->id;
            $admin = AuthUser::query()->whereKey($adminId)->first();
            $values = [
                'email' => $adminEmail,
                'password_hash' => MaximusPassword::hash($adminPassword),
                'display_name' => $company->manager,
                'role' => 'company_admin',
                'company_id' => $company->id,
                'employee_id' => null,
                'sector_ids' => [],
                'permissions' => [],
                'status' => 'ACTIF',
                'updated_at' => now(),
            ];
            if ($admin) {
                $admin->update($values);
                AuthSession::query()->where('user_id', $admin->id)->delete();
            } else {
                AuthUser::query()->create($values + ['id' => $adminId, 'created_at' => now()]);
            }
        });

        $this->info('Installation entreprise MAXIMUS initialisée depuis MAXIMUS principal.');
        $this->line('Aucun administrateur général MAXIMUS n’a été créé.');
        return self::SUCCESS;
    }
}