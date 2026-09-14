<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TransportTest extends TestCase
{
    use RefreshDatabase;

    public function test_taxi_cycle_is_persisted_and_vehicle_returns_to_available_after_completion(): void
    {
        $request = $this->asActor();
        $employeeId = $this->createDriverEmployee();
        $driver = $request->postJson('/api/transport/drivers?companyId=kora', [
            'employeeId' => $employeeId,
            'licenseNumber' => 'SN-TAXI-001',
        ])->assertCreated();
        $vehicle = $request->postJson('/api/transport/vehicles?companyId=kora', [
            'registration' => 'DK-1234-AA',
            'model' => 'Toyota Corolla',
            'vehicleType' => 'TAXI',
            'driverId' => $driver->json('id'),
        ])->assertCreated()->assertJsonPath('driverId', $driver->json('id'));
        $this->assertDatabaseHas('transport_vehicles', [
            'id' => $vehicle->json('id'),
            'driver_id' => $driver->json('id'),
        ]);
        $otherDriver = $request->postJson('/api/transport/drivers?companyId=kora', [
            'employeeId' => $this->createDriverEmployee('other-driver'),
            'licenseNumber' => 'SN-TAXI-OTHER',
        ])->assertCreated();
        $request->postJson('/api/transport/trips?companyId=kora', [
            'pickup' => 'Plateau',
            'destination' => 'Fann',
            'passengerName' => 'Moussa Fall',
            'passengerPhone' => '+221771111111',
            'fare' => 2500,
            'driverId' => $otherDriver->json('id'),
            'vehicleId' => $vehicle->json('id'),
        ])->assertStatus(422)->assertJsonPath('error', 'Le véhicule sélectionné n’est pas rattaché à ce chauffeur.');
        $trip = $request->postJson('/api/transport/trips?companyId=kora', [
            'pickup' => 'Plateau',
            'destination' => 'Almadies',
            'passengerName' => 'Moussa Fall',
            'passengerPhone' => '+221771111111',
            'fare' => 3500,
            'driverId' => $driver->json('id'),
            'vehicleId' => $vehicle->json('id'),
        ])->assertCreated()->assertJsonPath('status', 'ASSIGNED');

        $this->assertDatabaseHas('transport_vehicles', [
            'id' => $vehicle->json('id'),
            'company_id' => 'kora',
            'status' => 'ON_TRIP',
        ]);

        $request->patchJson('/api/transport/trips/'.$trip->json('id').'/status?companyId=kora', [
            'status' => 'COMPLETED',
        ])->assertOk()->assertJsonPath('status', 'COMPLETED');

        $this->assertDatabaseHas('transport_vehicles', [
            'id' => $vehicle->json('id'),
            'status' => 'AVAILABLE',
        ]);
        $request->getJson('/api/transport/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonPath('metrics.todayTrips', 1)
            ->assertJsonPath('metrics.todayRevenue', 3500);
    }

    public function test_transport_ignores_client_company_id_for_tenant_scope(): void
    {
        $request = $this->asActor();
        $employeeId = $this->createDriverEmployee('tenant-driver');
        $request->postJson('/api/transport/drivers?companyId=another-company', [
            'employeeId' => $employeeId,
            'licenseNumber' => 'SN-TAXI-002',
        ])->assertForbidden();

        $request->postJson('/api/transport/drivers?companyId=kora', [
            'employeeId' => $employeeId,
            'licenseNumber' => 'SN-TAXI-002',
        ])->assertCreated();
        $this->assertDatabaseHas('transport_drivers', [
            'company_id' => 'kora',
            'employee_id' => $employeeId,
        ]);
        $this->assertDatabaseMissing('transport_drivers', [
            'company_id' => 'another-company',
            'employee_id' => $employeeId,
        ]);
    }

    public function test_transport_chauffeur_pack_exposes_history_and_settings_and_settings_are_persisted(): void
    {
        ModuleCatalog::ensureCompanyAccess('kora');
        $transport = collect(ModuleCatalog::bootstrap('kora'))->firstWhere('id', 'transport');
        $pack = collect($transport['featurePacks'])->firstWhere('id', 'transport-chauffeur');

        $this->assertSame(['overview', 'trips', 'historique', 'parametres'], $pack['featureIds']);
        $this->assertSame(['voir'], $pack['featurePermissions']['historique']);
        $this->assertSame(['voir'], $pack['featurePermissions']['parametres']);

        $request = $this->asActor();
        $request->getJson('/api/transport/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonPath('settings.gpsValidityMinutes', 5)
            ->assertJsonPath('settings.trackingIntervalSeconds', 30);

        $request->patchJson('/api/transport/settings?companyId=kora', [
            'gpsValidityMinutes' => 8,
            'trackingIntervalSeconds' => 45,
        ])->assertOk()
            ->assertJsonPath('gpsValidityMinutes', 8)
            ->assertJsonPath('trackingIntervalSeconds', 45);

        $request->getJson('/api/transport/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonPath('settings.gpsValidityMinutes', 8)
            ->assertJsonPath('settings.trackingIntervalSeconds', 45);
    }

    public function test_transport_permissions_are_scoped_to_each_feature(): void
    {
        $request = $this->asActor('employee', [
            'transport:menu:drivers' => ['voir', 'créer', 'modifier'],
        ]);

        $request->getJson('/api/transport/bootstrap?companyId=kora')->assertOk();
        $request->postJson('/api/transport/drivers?companyId=kora', [
            'employeeId' => 'transport-employee',
            'licenseNumber' => 'SN-TAXI-003',
        ])->assertCreated();

        $request->postJson('/api/transport/vehicles?companyId=kora', [
            'registration' => 'DK-3333-CC',
            'model' => 'Toyota Yaris',
            'vehicleType' => 'TAXI',
            'driverId' => 'missing-driver',
        ])->assertForbidden();

        $request->postJson('/api/transport/trips?companyId=kora', [
            'pickup' => 'Plateau',
            'destination' => 'Almadies',
            'passengerName' => 'Passager',
            'passengerPhone' => '+221774444444',
            'fare' => 3500,
        ])->assertForbidden();
    }

    public function test_public_taxi_matches_the_nearest_driver_with_a_recent_gps_position(): void
    {
        ModuleCatalog::ensureCompanyAccess('kora');
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'transport')
            ->update([
                'feature_ids' => json_encode(['overview']),
                'configuration' => json_encode(['featureScope' => 'explicit']),
            ]);
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-kora-taxi',
            'company_id' => 'kora',
            'slug' => 'kora-taxi',
            'name' => 'Kora Taxi',
            'description' => 'Taxi',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#111827',
            'accent_color' => '#f59e0b',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $freshDriver = 'driver-fresh';
        $staleDriver = 'driver-stale';
        $this->createDriverEmployee($freshDriver, 'Chauffeur GPS', '+221770000001');
        $this->createDriverEmployee($staleDriver, 'Chauffeur obsolète', '+221770000002');
        DB::table('transport_drivers')->insert([
            [
                'id' => $freshDriver,
                'company_id' => 'kora',
                'name' => 'Chauffeur GPS',
                'phone' => '+221770000001',
                'license_number' => 'GPS-001',
                'employee_id' => $freshDriver,
                'status' => 'ACTIVE',
                'latitude' => 14.7180,
                'longitude' => -17.4677,
                'location_updated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $staleDriver,
                'company_id' => 'kora',
                'name' => 'Chauffeur obsolète',
                'phone' => '+221770000002',
                'license_number' => 'GPS-002',
                'employee_id' => $staleDriver,
                'status' => 'ACTIVE',
                'latitude' => 14.7168,
                'longitude' => -17.4677,
                'location_updated_at' => now()->subMinutes(6),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
        DB::table('transport_vehicles')->insert([
            'id' => 'vehicle-gps',
            'company_id' => 'kora',
            'registration' => 'DK-GPS-01',
            'model' => 'Toyota GPS',
            'vehicle_type' => 'TAXI',
            'driver_id' => $freshDriver,
            'status' => 'AVAILABLE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->postJson('/api/shop/kora-taxi/transport/trips', [
            'pickup' => 'Plateau',
            'destination' => 'Almadies',
            'passengerName' => 'Moussa Fall',
            'passengerPhone' => '+221771111111',
            'pickupLatitude' => 14.7167,
            'pickupLongitude' => -17.4677,
        ])->assertCreated()
            ->assertJsonPath('matched', true)
            ->assertJsonPath('trip.driverId', $freshDriver)
            ->assertJsonPath('trip.driverName', 'Chauffeur GPS');

        $this->assertDatabaseHas('transport_trips', [
            'company_id' => 'kora',
            'driver_id' => $freshDriver,
            'vehicle_id' => 'vehicle-gps',
            'status' => 'ASSIGNED',
        ]);
        $this->assertDatabaseMissing('transport_trips', ['driver_id' => $staleDriver]);
    }

    private function createDriverEmployee(string $id = 'driver-employee', string $displayName = 'Awa Ndiaye', string $phone = '+221770000000'): string
    {
        AuthUser::query()->create([
            'id' => $id,
            'email' => $id.'@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => $displayName,
            'phone' => $phone,
            'role' => 'employee',
            'company_id' => 'kora',
            'employee_id' => $id,
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);

        return $id;
    }

    private function asActor(string $role = 'company_admin', array $permissions = []): self
    {
        $user = AuthUser::query()->create([
            'id' => 'transport-'.strtolower($role),
            'email' => 'transport-'.strtolower($role).'@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Gestionnaire Transport',
            'phone' => '',
            'role' => $role,
            'company_id' => 'kora',
            'employee_id' => $role === 'employee' ? 'transport-employee' : null,
            'sector_ids' => [],
            'permissions' => $permissions,
            'status' => 'ACTIF',
        ]);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}