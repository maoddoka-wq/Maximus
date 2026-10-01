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
            ->assertJsonPath('capabilities.viewTrips', true)
            ->assertJsonPath('capabilities.updateLocation', true)
            ->assertJsonPath('capabilities.updateAvailability', true)
            ->assertJsonPath('capabilities.updateTrips', true);

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
                    'tag_name' => 'chauffeur-v1.0.9',
                    'name' => 'MAXIMUS Chauffeur 1.0.9',
                    'published_at' => '2026-09-01T00:00:00Z',
                    'assets' => [[
                        'name' => 'maximus-chauffeur.apk',
                        'url' => 'https://api.github.com/repos/maoddoka-wq/Maximus/releases/assets/109',
                        'size' => 512,
                        'digest' => 'sha256:'.str_repeat('a', 64),
                    ]],
                ],
                [
                    'tag_name' => 'chauffeur-v1.0.16',
                    'name' => 'MAXIMUS Chauffeur 1.0.16',
                    'published_at' => '2026-09-30T23:37:51Z',
                    'assets' => [[
                        'name' => 'maximus-chauffeur.apk',
                        'url' => 'https://api.github.com/repos/maoddoka-wq/Maximus/releases/assets/116',
                        'size' => 2048,
                        'digest' => 'sha256:'.str_repeat('b', 64),
                    ]],
                ],
                [
                    'tag_name' => 'chauffeur-v1.0.15',
                    'name' => 'MAXIMUS Chauffeur 1.0.15',
                    'published_at' => '2026-09-30T22:04:24Z',
                    'assets' => [[
                        'name' => 'maximus-chauffeur.apk',
                        'url' => 'https://api.github.com/repos/maoddoka-wq/Maximus/releases/assets/115',
                        'size' => 1024,
                        'digest' => 'sha256:'.str_repeat('c', 64),
                    ]],
                ],
                [
                    'tag_name' => 'chauffeur-v1.0.99',
                    'prerelease' => true,
                    'assets' => [[
                        'name' => 'maximus-chauffeur.apk',
                        'url' => 'https://api.github.com/repos/maoddoka-wq/Maximus/releases/assets/199',
                        'size' => 4096,
                    ]],
                ],
                [
                    'tag_name' => 'chauffeur-v1.0.100',
                    'draft' => true,
                    'assets' => [[
                        'name' => 'maximus-chauffeur.apk',
                        'url' => 'https://api.github.com/repos/maoddoka-wq/Maximus/releases/assets/1100',
                        'size' => 8192,
                    ]],
                ],
            ]),
        ]);
        $this->getJson('/api/transport/mobile/releases/latest', $headers)
            ->assertOk()
            ->assertJsonPath('version', '1.0.16')
            ->assertJsonPath('sizeBytes', 2048);

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

    public function test_mobile_session_and_bootstrap_apply_revoked_transport_features(): void
    {
        $this->enableTransport();
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'transport')
            ->update(['feature_ids' => json_encode(['overview', 'trips', 'drivers', 'vehicles'])]);

        $employee = $this->createUser(
            id: 'mobile-driver-feature-access',
            role: 'employee',
            permissions: [
                'transport:menu:drivers' => ['voir', 'créer', 'modifier'],
                'transport:menu:trips' => ['voir', 'créer', 'modifier'],
            ],
        );
        $adminRequest = $this->companyAdminRequest();
        $driver = $adminRequest->postJson('/api/transport/drivers?companyId=kora', [
            'employeeId' => $employee->employee_id,
            'licenseNumber' => 'SN-MOBILE-FEATURE-001',
        ])->assertCreated();
        $vehicle = $adminRequest->postJson('/api/transport/vehicles?companyId=kora', [
            'registration' => 'DK-MOBILE-001',
            'model' => 'Toyota Yaris',
            'vehicleType' => 'TAXI',
            'driverId' => $driver->json('id'),
            'imageData' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        ])->assertCreated();
        $trip = $adminRequest->postJson('/api/transport/trips?companyId=kora', [
            'pickup' => 'Plateau',
            'destination' => 'Almadies',
            'passengerName' => 'Passager Mobile',
            'passengerPhone' => '+221770000001',
            'fare' => 3500,
            'driverId' => $driver->json('id'),
            'vehicleId' => $vehicle->json('id'),
        ])->assertCreated();

        $login = $this->postJson('/api/auth/mobile/login', [
            'email' => $employee->email,
            'password' => 'correct-horse-battery',
        ])->assertOk()
            ->assertJsonPath('capabilities.viewTrips', true);
        $headers = ['Authorization' => 'Bearer '.$login->json('token')];
        $this->getJson('/api/transport/bootstrap', $headers)
            ->assertOk()
            ->assertJsonCount(1, 'trips');

        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'transport')
            ->update(['feature_ids' => json_encode(['overview', 'drivers', 'vehicles'])]);

        $this->getJson('/api/auth/mobile/session', $headers)
            ->assertOk()
            ->assertJsonPath('capabilities.viewTrips', false)
            ->assertJsonPath('capabilities.updateTrips', false);
        $this->getJson('/api/transport/bootstrap', $headers)
            ->assertOk()
            ->assertJsonCount(0, 'trips')
            ->assertJsonPath('metrics.todayTrips', 0);
        $this->patchJson('/api/transport/trips/'.$trip->json('id').'/status', [
            'status' => 'COMPLETED',
        ], $headers)->assertForbidden();

        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'transport')
            ->update(['feature_ids' => json_encode(['overview', 'vehicles'])]);

        $this->getJson('/api/auth/mobile/session', $headers)->assertForbidden();
        $this->getJson('/api/transport/bootstrap', $headers)->assertForbidden();
    }

    public function test_mobile_chauffeur_sees_own_active_trip_after_company_trip_limit(): void
    {
        $this->enableTransport();
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'transport')
            ->update(['feature_ids' => json_encode(['overview', 'trips', 'drivers', 'vehicles'])]);
        $employee = $this->createUser(
            id: 'mobile-driver-active-trip',
            role: 'employee',
            permissions: [
                'transport:menu:drivers' => ['voir', 'créer', 'modifier'],
                'transport:menu:trips' => ['voir', 'créer', 'modifier'],
            ],
        );
        $adminRequest = $this->companyAdminRequest();
        $driver = $adminRequest->postJson('/api/transport/drivers?companyId=kora', [
            'employeeId' => $employee->employee_id,
            'licenseNumber' => 'SN-MOBILE-TRIPS-001',
        ])->assertCreated();
        $vehicle = $adminRequest->postJson('/api/transport/vehicles?companyId=kora', [
            'registration' => 'DK-MOBILE-TRIPS-001',
            'model' => 'Toyota Yaris',
            'vehicleType' => 'TAXI',
            'driverId' => $driver->json('id'),
            'imageData' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        ])->assertCreated();
        $trip = $adminRequest->postJson('/api/transport/trips?companyId=kora', [
            'pickup' => 'Plateau',
            'destination' => 'Almadies',
            'passengerName' => 'Passager Mobile',
            'passengerPhone' => '+221770000001',
            'fare' => 3500,
            'driverId' => $driver->json('id'),
            'vehicleId' => $vehicle->json('id'),
        ])->assertCreated()->assertJsonPath('status', 'ASSIGNED');

        $login = $this->postJson('/api/auth/mobile/login', [
            'email' => $employee->email,
            'password' => 'correct-horse-battery',
        ])->assertOk()
            ->assertJsonPath('capabilities.viewTrips', true);
        $headers = ['Authorization' => 'Bearer '.$login->json('token')];

        $this->getJson('/api/transport/bootstrap', $headers)
            ->assertOk()
            ->assertJsonCount(1, 'drivers')
            ->assertJsonPath('drivers.0.id', $driver->json('id'))
            ->assertJsonCount(1, 'trips')
            ->assertJsonPath('trips.0.id', $trip->json('id'))
            ->assertJsonPath('trips.0.status', 'ASSIGNED');

        $this->patchJson('/api/transport/trips/'.$trip->json('id').'/status', [
            'status' => 'IN_PROGRESS',
        ], $headers)->assertOk()->assertJsonPath('status', 'IN_PROGRESS');

        $newerCompanyTrips = [];
        for ($index = 0; $index < 250; $index += 1) {
            $newerCompanyTrips[] = [
                'id' => 'mobile-noise-trip-'.$index,
                'company_id' => 'kora',
                'reference' => 'MOBILE-NOISE-'.$index,
                'pickup' => 'Plateau',
                'destination' => 'Almadies',
                'passenger_name' => 'Autre passager',
                'passenger_phone' => '+221770000002',
                'fare' => 1000,
                'driver_id' => null,
                'vehicle_id' => null,
                'status' => 'COMPLETED',
                'requested_at' => now()->addSeconds($index + 1),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        DB::table('transport_trips')->insert($newerCompanyTrips);

        $this->getJson('/api/transport/bootstrap', $headers)
            ->assertOk()
            ->assertJsonPath('trips.0.id', $trip->json('id'))
            ->assertJsonPath('trips.0.status', 'IN_PROGRESS');
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