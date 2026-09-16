<?php

namespace App\Console\Commands;

use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Models\Company;
use App\Support\InstallationContext;
use App\Support\MaximusPassword;
use App\Support\ModuleCatalog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InstallCompanyInstance extends Command
{
    protected $signature = 'maximus:install-company';

    protected $description = 'Initialise une installation MAXIMUS dédiée pour une seule entreprise';

    public function handle(): int
    {
        if (!InstallationContext::isCompanyOnly()) {
            $this->error('MAXIMUS_DEPLOYMENT_MODE doit être dedicated ou on_premise.');

            return self::FAILURE;
        }

        $companyId = InstallationContext::companyId();
        $companyName = trim((string) env('MAXIMUS_COMPANY_NAME', ''));
        $manager = trim((string) env('MAXIMUS_COMPANY_MANAGER', $companyName));
        $companyEmail = Str::lower(trim((string) env('MAXIMUS_COMPANY_EMAIL', env('ADMIN_USER', ''))));
        $adminEmail = Str::lower(trim((string) env('MAXIMUS_ADMIN_USER', env('ADMIN_USER', $companyEmail))));
        $adminPassword = (string) env('MAXIMUS_ADMIN_PASSWORD', env('ADMIN_PASSWORD', ''));

        if ($companyId === null) {
            $this->error('MAXIMUS_INSTALLATION_COMPANY_ID est requis pour fixer le périmètre de cette installation.');

            return self::FAILURE;
        }

        if ($companyName === '' || $manager === '' || !filter_var($companyEmail, FILTER_VALIDATE_EMAIL)) {
            $this->error('MAXIMUS_COMPANY_NAME, MAXIMUS_COMPANY_MANAGER et MAXIMUS_COMPANY_EMAIL sont requis.');

            return self::FAILURE;
        }

        if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL) || strlen($adminPassword) < 8) {
            $this->error('MAXIMUS_ADMIN_USER doit être valide et MAXIMUS_ADMIN_PASSWORD doit contenir au moins 8 caractères.');

            return self::FAILURE;
        }

        if (AuthUser::query()->where('email', $adminEmail)->where('id', '!=', 'company-admin:'.$companyId)->exists()) {
            $this->error('MAXIMUS_ADMIN_USER est déjà utilisé par un autre compte.');

            return self::FAILURE;
        }

        ModuleCatalog::ensureCatalog();
        $moduleIds = $this->moduleIds();
        $loginSlug = trim((string) env('MAXIMUS_INSTALLATION_LOGIN_SLUG', Str::slug($companyName)));

        DB::transaction(function () use (
            $companyId,
            $companyName,
            $manager,
            $companyEmail,
            $adminEmail,
            $adminPassword,
            $moduleIds,
            $loginSlug,
        ): void {
            $company = Company::query()->updateOrCreate(
                ['id' => $companyId],
                [
                    'name' => $companyName,
                    'manager' => $manager,
                    'email' => $companyEmail,
                    'phone' => trim((string) env('MAXIMUS_COMPANY_PHONE', '')),
                    'country' => trim((string) env('MAXIMUS_COMPANY_COUNTRY', '')),
                    'sector' => trim((string) env('MAXIMUS_COMPANY_SECTOR', '')),
                    'status' => 'ACTIF',
                    'requested_modules' => $moduleIds,
                    'requested_module_pack_ids' => [],
                    'requested_module_features' => [],
                    'requested_module_permissions' => [],
                    'login_custom_allowed' => false,
                    'login_mode' => 'MAXIMUS',
                    'login_slug' => $loginSlug !== '' ? $loginSlug : null,
                    'deleted_at' => null,
                    'updated_at' => now(),
                ],
            );

            DB::table('maximus_company_modules')
                ->where('company_id', $company->id)
                ->whereNotIn('module_id', $moduleIds)
                ->delete();
            ModuleCatalog::ensureCompanyAccess($company->id, $moduleIds);

            $adminId = 'company-admin:'.$company->id;
            $admin = AuthUser::query()->whereKey($adminId)->first();
            $values = [
                'email' => $adminEmail,
                'password_hash' => MaximusPassword::hash($adminPassword),
                'display_name' => $manager,
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
                AuthUser::query()->create($values + [
                    'id' => $adminId,
                    'created_at' => now(),
                ]);
            }
        });

        $this->info('Installation entreprise MAXIMUS initialisée.');
        $this->line('Aucun administrateur général MAXIMUS n’a été créé.');

        return self::SUCCESS;
    }

    /** @return list<string> */
    private function moduleIds(): array
    {
        $configured = trim((string) env('MAXIMUS_INSTALLATION_MODULES', ''));
        $requested = $configured === ''
            ? array_column(ModuleCatalog::definitions(), 'id')
            : array_values(array_filter(array_map('trim', explode(',', $configured))));

        $invalid = array_values(array_filter(
            $requested,
            fn (string $moduleId): bool => !ModuleCatalog::isPublishedModule($moduleId),
        ));

        if ($invalid !== []) {
            throw new \RuntimeException('Modules non publiés ou inconnus : '.implode(', ', $invalid));
        }

        return array_values(array_unique($requested));
    }
}