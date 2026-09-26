<?php

namespace Tests;

use App\Support\CompanyPaymentAccess;
use App\Support\ModuleCatalog;
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
        ModuleCatalog::ensureCatalog();
        ModuleCatalog::ensureCompanyAccess('kora');
        CompanyPaymentAccess::ensure('kora', 'ACTIF');
    }

    protected function enablePublicSiteForTesting(string $companyId, array $moduleIds): void
    {
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => $companyId],
            [
                'maximus_enabled' => true,
                'company_enabled' => true,
                'module_ids' => json_encode(array_values(array_unique($moduleIds)), JSON_UNESCAPED_UNICODE),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }
}
