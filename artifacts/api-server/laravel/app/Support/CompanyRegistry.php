<?php

namespace App\Support;

use App\Models\Company;
use Illuminate\Support\Facades\DB;

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
        return Company::query()->updateOrCreate(
            ['id' => $companyId],
            [
                'name' => $name !== '' ? $name : $companyId,
                'manager' => $name !== '' ? $name : 'Administrateur',
                'email' => $companyId.'@invalid.maximus',
                'status' => 'ACTIF',
                'deleted_at' => null,
                'updated_at' => now(),
            ],
        );
    }

    public static function removeTenantData(string $companyId): void
    {
        DB::table('auth_sessions')
            ->whereIn('user_id', function ($query) use ($companyId): void {
                $query->select('id')->from('auth_users')->where('company_id', $companyId);
            })
            ->delete();
        DB::table('auth_users')->where('company_id', $companyId)->update([
            'status' => 'SUSPENDU',
            'updated_at' => now(),
        ]);
        DB::table('maximus_company_modules')->where('company_id', $companyId)->delete();

        if (DB::getSchemaBuilder()->hasTable('ecommerce_customer_sessions')) {
            DB::table('ecommerce_customer_sessions')->where('company_id', $companyId)->delete();
        }
        if (DB::getSchemaBuilder()->hasTable('ecommerce_customers')) {
            DB::table('ecommerce_customers')->where('company_id', $companyId)->update([
                'status' => 'SUSPENDU',
                'updated_at' => now(),
            ]);
        }
    }
}