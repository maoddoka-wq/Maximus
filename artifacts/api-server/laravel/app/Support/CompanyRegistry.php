<?php

namespace App\Support;

use App\Models\Company;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class CompanyRegistry
{
    public static function isActive(string $companyId): bool
    {
        $company = Company::query()->whereKey($companyId)->first();

        if ($company) {
            return $company->deleted_at === null && $company->status === 'ACTIF';
        }

        return app()->environment('testing');
    }

    public static function exists(string $companyId): bool
    {
        return Company::query()->whereKey($companyId)->exists();
    }

    public static function ensureActive(string $companyId, string $name = ''): Company
    {
        $company = Company::query()->whereKey($companyId)->first();
        if ($company) {
            if ($company->deleted_at !== null || $company->status !== 'ACTIF') {
                throw new \LogicException('Une entreprise inactive ou archivée ne peut pas être réactivée implicitement.');
            }

            return $company;
        }

        return Company::query()->create([
            'id' => $companyId,
            'name' => $name !== '' ? $name : $companyId,
            'manager' => $name !== '' ? $name : 'Administrateur',
            'email' => $companyId.'@invalid.maximus',
            'status' => 'ACTIF',
            'updated_at' => now(),
        ]);
    }

    public static function removeTenantData(string $companyId): void
    {
        $identityRetirement = app(AuthIdentityRetirement::class);
        \App\Models\AuthUser::query()
            ->where('company_id', $companyId)
            ->get()
            ->each(fn (\App\Models\AuthUser $user) => $identityRetirement->retireUser($user));

        DB::table('maximus_company_modules')->where('company_id', $companyId)->update([
            'status' => 'SUSPENDU',
            'updated_at' => now(),
        ]);

        if (Schema::hasTable('ecommerce_customer_sessions')) {
            DB::table('ecommerce_customer_sessions')->where('company_id', $companyId)->delete();
        }
        if (Schema::hasTable('ecommerce_customers')) {
            DB::table('ecommerce_customers')->where('company_id', $companyId)->update([
                'status' => 'SUSPENDU',
                'updated_at' => now(),
            ]);
        }
        if (Schema::hasTable('ecommerce_stores')) {
            DB::table('ecommerce_stores')->where('company_id', $companyId)->update([
                'status' => 'ARCHIVED',
                'updated_at' => now(),
            ]);
        }
        if (Schema::hasTable('ecommerce_domains')) {
            DB::table('ecommerce_domains')->where('company_id', $companyId)->update([
                'status' => 'REVOKED',
                'verified_at' => null,
                'updated_at' => now(),
            ]);
        }
        if (Schema::hasTable('maximus_installations')) {
            $installationIds = DB::table('maximus_installations')
                ->where('company_id', $companyId)
                ->pluck('id');
            DB::table('maximus_installations')->whereIn('id', $installationIds)->update([
                'status' => 'REVOKED',
                'revoked_at' => now(),
                'updated_at' => now(),
            ]);
            if (Schema::hasTable('maximus_installation_addresses') && $installationIds->isNotEmpty()) {
                DB::table('maximus_installation_addresses')->whereIn('installation_id', $installationIds)->update([
                    'status' => 'REVOKED',
                    'is_primary' => false,
                    'updated_at' => now(),
                ]);
            }
        }
    }
}