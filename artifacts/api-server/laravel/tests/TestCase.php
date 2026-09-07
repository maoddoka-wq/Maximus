<?php

namespace Tests;

use App\Support\ModuleCatalog;
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
    }
}
