<?php

namespace Tests;

use App\Support\CompanyPaymentAccess;
use App\Support\ModuleCatalog;
use App\Models\Company;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', (string) config('app.url', 'http://localhost'));
        if (! Schema::hasTable('maximus_modules')) {
            return;
        }
        // Existing feature tests model ordinary tenants as free; billing tests opt into paid mode explicitly.
        Company::created(static function (Company $company): void {
            if (! Schema::hasTable('maximus_company_subscription_prices')) {
                return;
            }

            DB::table('maximus_company_subscription_prices')->insertOrIgnore([
                'company_id' => $company->id,
                'custom_monthly_amount' => 0,
                'updated_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
        ModuleCatalog::ensureCatalog();
        ModuleCatalog::ensureCompanyAccess('kora');
        CompanyPaymentAccess::ensure('kora', 'ACTIF');
        if (Schema::hasTable('maximus_company_subscription_prices')) {
            DB::table('maximus_company_subscription_prices')->updateOrInsert(
                ['company_id' => 'kora'],
                [
                    'custom_monthly_amount' => 0,
                    'updated_by' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }
    }
}
