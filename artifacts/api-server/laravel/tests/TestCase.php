<?php

namespace Tests;

use App\Support\CompanyPaymentAccess;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
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
}
