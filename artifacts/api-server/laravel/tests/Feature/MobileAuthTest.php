<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\CompanyRegistry;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MobileAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_token_is_hashed_revocable_and_restricted_to_driver_routes(): void
    {
        $this->enableTransport();
        $employee = $this->createUser(
            id: 'mobile-driver',
            role: 'employee',
            permissions: [
                'transport:menu:drivers' => ['voir', 'créer', 'modifier'],
                'transport:menu:trips' => ['voir', 'créer', 'modifier'],
            ],
        );
        $adminRequest = $this->companyAdminRequest();
        $driver = $adminRequest->postJson('/api/transport/drivers?companyId=kora', [
            'employeeId' => $employee->employee_id,
            'licenseNumber' => 'SN-MOBILE-001',
        ])->assertCreated();
        $driverPath = '/api/transport/drivers/'.$driver->json('id');
        $adminRequest->patchJson($driverPath.'/location?companyId=kora', [
            'latitude' => 14.7167,
            'longitude' => -17.4677,
        ])->assertOk();
        $adminRequest->patchJson($driverPath.'/availability?companyId=kora', [
            'availability' => 'AVAILABLE',
        ])->assertOk();

        $login = $this->postJson('/api/auth/mobile/login', [
            'email' => $employee->email,
            'password' => 'correct-horse-battery',
            'deviceName' => 'Test Android',
        ])->assertOk()
            ->assertJsonPath('user.employeeId', $employee->employee_id)
            ->assertJsonPath('company.id', 'kora')
            ->assertJsonPath('capabilities.updateLocation', true);

        $plainToken = $login->json('token');
        $this->assertIsString($plainToken);
        $this->assertNotSame('', $plainToken);
        $this->assertDatabaseHas('auth_mobile_tokens', [
            'user_id' => $employee->id,
            'token_hash' => hash('sha256', $plainToken),
        ]);
        $this->assertDatabaseMissing('auth_mobile_tokens', [
            'user_id' => $employee->id,
            'token_hash' => $plainToken,
        ]);

        $headers = ['Authorization' => 'Bearer '.$plainToken];
        $this->getJson('/api/auth/mobile/session', $headers)
            ->assertOk()
            ->assertJsonPath('user.employeeId', $employee->employee_id);
        $this->getJson('/api/transport/bootstrap', $headers)
            ->assertOk()
            ->assertJsonPath('drivers.0.id', $driver->json('id'));
        $this->patchJson('/api/transport/drivers/'.$driver->json('id').'/location', [
            'latitude' => 14.7167,
            'longitude' => -17.4677,
        ], $headers)->assertOk();

        config([
            'services.github.mobile_release_repository' => 'maoddoka-wq/Maximus',
            'services.github.mobile_release_token' => 'unit-test-read-token',
        ]);
        Http::fake([
            'https://api.github.com/repos/maoddoka-wq/Maximus/releases?per_page=100' => Http::response([
                [
                    'tag_name' => 'maximus-erp-v9.0.0',
                    'assets' => [['name' => 'maximus-erp.zip', 'url' => 'https://example.test/erp.zip']],
                ],
                [
                    'tag_name' => 'chauffeur-v1.2.3',
                    'name' => 'MAXIMUS Chauffeur 1.2.3',
                    'published_at' => '2026-09-01T00:00:00Z',
                    'assets' => [[
                        'name' => 'maximus-chauffeur.apk',
                        'url' => 'https://api.github.com/repos/maoddoka-wq/Maximus/releases/assets/123',
                        'size' => 1024,
                        'digest' => 'sha256:'.str_repeat('a', 64),
                    ]],
                ],
            ]),
        ]);
        $this->getJson('/api/transport/mobile/releases/latest', $headers)
            ->assertOk()
            ->assertJsonPath('version', '1.2.3')
            ->assertJsonPath('sizeBytes', 1024);

        $this->postJson('/api/transport/drivers', [
            'employeeId' => $employee->employee_id,
            'licenseNumber' => 'SN-FORBIDDEN',
        ], $headers)->assertForbidden();

        $this->postJson('/api/auth/mobile/logout', [], $headers)->assertNoContent();
        $this->assertDatabaseHas('transport_drivers', [
            'id' => $driver->json('id'),
            'availability' => 'PAUSED',
        ]);
        $this->getJson('/api/auth/mobile/session', $headers)->assertUnauthorized();
    }

    public function test_mobile_login_does_not_allow_company_administrator_accounts(): void
    {
        $this->enableTransport();
        $administrator = $this->createUser(
            id: 'mobile-company-admin',
            role: 'company_admin',
            permissions: [],
        );

        $this->postJson('/api/auth/mobile/login', [
            'email' => $administrator->email,
            'password' => 'correct-horse-battery',
        ])->assertForbidden()
            ->assertJsonPath('error', 'Cette application est réservée aux chauffeurs avec un compte employé MAXIMUS.');
    }

    private function enableTransport(): void
    {
        CompanyRegistry::ensureActive('kora', 'Kora Transport');
        ModuleCatalog::ensureCompanyAccess('kora');
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'transport')
            ->update([
                'feature_ids' => json_encode(['overview', 'trips', 'drivers']),
                'configuration' => json_encode(['featureScope' => 'explicit']),
            ]);
    }

    private function createUser(string $id, string $role, array $permissions): AuthUser
    {
        return AuthUser::query()->create([
            'id' => $id,
            'email' => $id.'@kora.demo',
            'password_hash' => MaximusPassword::hash('correct-horse-battery'),
            'display_name' => 'Chauffeur Test',
            'phone' => '+221770000000',
            'role' => $role,
            'company_id' => 'kora',
            'employee_id' => $role === 'employee' ? $id : null,
            'sector_ids' => [],
            'permissions' => $permissions,
            'status' => 'ACTIF',
        ]);
    }

    private function companyAdminRequest(): self
    {
        $admin = $this->createUser('mobile-test-admin', 'company_admin', []);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($admin));
    }
}