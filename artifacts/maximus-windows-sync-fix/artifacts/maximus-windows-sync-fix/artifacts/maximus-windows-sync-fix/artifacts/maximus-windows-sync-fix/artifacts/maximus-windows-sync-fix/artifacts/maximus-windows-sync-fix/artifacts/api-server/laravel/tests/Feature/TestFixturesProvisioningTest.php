<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class TestFixturesProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_fixture_command_creates_the_accounts_and_company_needed_for_manual_testing(): void
    {
        $this->assertSame(0, Artisan::call('maximus:provision-test-fixtures'));

        $this->assertDatabaseHas('companies', [
            'id' => 'fixture-company',
            'status' => 'ACTIF',
        ]);
        $this->assertDatabaseHas('companies', [
            'id' => 'fixture-pending-company',
            'status' => 'EN ATTENTE',
        ]);
        $this->assertDatabaseHas('company_requests', [
            'company_id' => 'fixture-pending-company',
            'status' => 'PENDING',
        ]);
        $this->assertDatabaseCount('auth_users', 4);

        $admin = AuthUser::query()->whereKey('fixture-maximus-admin')->firstOrFail();
        $this->assertSame('maximus_admin', $admin->role);
        $this->assertStringContainsString('Mot de passe temporaire', Artisan::output());
    }
}