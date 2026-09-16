<?php

namespace Tests;

use App\Support\ModuleCatalog;
use App\Support\CompanyPaymentAccess;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (!Schema::hasTable('maximus_modules')) {
            return;
        }
        ModuleCatalog::ensureCatalog();
        ModuleCatalog::ensureCompanyAccess('kora');
        CompanyPaymentAccess::ensure('kora', 'ACTIF');
    }
}
