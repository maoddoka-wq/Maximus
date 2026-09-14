<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\EcommerceCustomerAuth;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
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
            'imageData' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        ])->assertCreated()->assertJsonPath('driverId', $driver->json('id'));
        $request->getJson('/api/transport/vehicles/'.$vehicle->json('id').'/image?companyId=kora')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
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

    public function test_vehicle_can_be_updated_and_deleted_but_not_while_on_an_active_trip(): void
    {
        $request = $this->asActor();
        $driver = $request->postJson('/api/transport/drivers?companyId=kora', [
            'employeeId' => $this->createDriverEmployee('vehicle-management-driver'),
            'licenseNumber' => 'SN-MANAGE-001',
        ])->assertCreated();
        $vehicle = $request->postJson('/api/transport/vehicles?companyId=kora', [
            'registration' => 'DK-MANAGE-01',
            'model' => 'Toyota Corolla',
            'vehicleType' => 'TAXI',
            'driverId' => $driver->json('id'),
            'imageData' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        ])->assertCreated();

        $request->patchJson('/api/transport/vehicles/'.$vehicle->json('id').'?companyId=kora', [
            'registration' => 'DK-MANAGE-02',
            'model' => 'Toyota Yaris',
            'vehicleType' => 'BERLINE',
            'driverId' => $driver->json('id'),
            'status' => 'AVAILABLE',
        ])->assertOk()
            ->assertJsonPath('registration', 'DK-MANAGE-02')
            ->assertJsonPath('model', 'Toyota Yaris');

        $trip = $request->postJson('/api/transport/trips?companyId=kora', [
            'pickup' => 'Plateau',
            'destination' => 'Fann',
            'passengerName' => 'Passager Gestion',
            'passengerPhone' => '+221770000099',
            'fare' => 2500,
            'driverId' => $driver->json('id'),
            'vehicleId' => $vehicle->json('id'),
        ])->assertCreated();

        $request->deleteJson('/api/transport/vehicles/'.$vehicle->json('id').'?companyId=kora')
            ->assertStatus(422)
            ->assertJsonPath('error', 'Un véhicule engagé dans une course en cours ne peut pas être supprimé.');

        $request->patchJson('/api/transport/trips/'.$trip->json('id').'/status?companyId=kora', [
            'status' => 'COMPLETED',
        ])->assertOk();
        $request->deleteJson('/api/transport/vehicles/'.$vehicle->json('id').'?companyId=kora')
            ->assertOk()
            ->assertJsonPath('id', $vehicle->json('id'));
        $this->assertDatabaseMissing('transport_vehicles', ['id' => $vehicle->json('id')]);
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
            ->assertJsonPath('settings.trackingIntervalSeconds', 10)
            ->assertJsonPath('settings.baseFare', 500)
            ->assertJsonPath('settings.pricePerKm', 300)
            ->assertJsonPath('settings.heroImageUrl', '/taxi-transport-hero.jpg');

        $heroImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        $request->patchJson('/api/transport/settings?companyId=kora', [
            'gpsValidityMinutes' => 8,
            'trackingIntervalSeconds' => 10,
            'baseFare' => 750,
            'pricePerKm' => 425,
            'heroImageData' => $heroImage,
        ])->assertOk()
            ->assertJsonPath('gpsValidityMinutes', 8)
            ->assertJsonPath('trackingIntervalSeconds', 10)
            ->assertJsonPath('baseFare', 750)
            ->assertJsonPath('pricePerKm', 425)
            ->assertJsonPath('heroImageUrl', '/api/transport/settings/hero-image');
        $request->get('/api/transport/settings/hero-image?companyId=kora')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');

        $request->getJson('/api/transport/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonPath('settings.gpsValidityMinutes', 8)
            ->assertJsonPath('settings.trackingIntervalSeconds', 10)
            ->assertJsonPath('settings.baseFare', 750)
            ->assertJsonPath('settings.pricePerKm', 425)
            ->assertJsonPath('settings.heroImageUrl', '/api/transport/settings/hero-image');

        $request->patchJson('/api/transport/settings?companyId=kora', [
            'gpsValidityMinutes' => 8,
            'trackingIntervalSeconds' => 10,
            'heroImageData' => null,
        ])->assertOk()->assertJsonPath('heroImageUrl', '/taxi-transport-hero.jpg');
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
            'imageData' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
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
                'feature_ids' => json_encode(['overview', 'trips']),
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

        $tripResponse = $this->postJson('/api/shop/kora-taxi/transport/trips', [
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
        $tripId = $tripResponse->json('trip.id');
        $this->getJson('/api/shop/kora-taxi/transport/trips/'.$tripId)
            ->assertOk()
            ->assertJsonPath('trip.status', 'OFFERED')
            ->assertJsonPath('trip.vehicleModel', 'Toyota GPS')
            ->assertJsonPath('trip.vehicleImageUrl', '/taxi-car.svg');

        $this->asActor('employee', [
            'transport:menu:trips' => ['voir', 'modifier'],
        ], $freshDriver)
            ->patchJson('/api/transport/trips/'.$tripId.'/status?companyId=kora', [
                'status' => 'ASSIGNED',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'ASSIGNED');

        $this->assertDatabaseHas('transport_trips', [
            'company_id' => 'kora',
            'driver_id' => $freshDriver,
            'vehicle_id' => 'vehicle-gps',
            'status' => 'ASSIGNED',
        ]);
        $this->assertDatabaseMissing('transport_trips', ['driver_id' => $staleDriver]);
    }

    public function test_public_taxi_quote_uses_a_real_route_and_signed_quote_at_creation(): void
    {
        ModuleCatalog::ensureCompanyAccess('kora');
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-kora-quote',
            'company_id' => 'kora',
            'slug' => 'kora-quote',
            'name' => 'Kora Quote',
            'description' => 'Taxi',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#111827',
            'accent_color' => '#f59e0b',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Http::fake([
            'https://nominatim.openstreetmap.org/*' => Http::response([
                ['lat' => '14.7300', 'lon' => '-17.4500'],
            ]),
            'https://router.project-osrm.org/*' => Http::response([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 4200,
                    'duration' => 900,
                    'geometry' => [
                        'type' => 'LineString',
                        'coordinates' => [
                            [-17.4677, 14.7167],
                            [-17.4500, 14.7300],
                        ],
                    ],
                ]],
            ]),
        ]);

        $quote = $this->postJson('/api/shop/kora-quote/transport/quote', [
            'destination' => 'Point de destination',
            'pickupLatitude' => 14.7167,
            'pickupLongitude' => -17.4677,
        ])->assertOk()
            ->assertJsonPath('distanceKm', 4.2)
            ->assertJsonPath('durationMinutes', 15)
            ->assertJsonPath('fare', 2000);

        $this->postJson('/api/shop/kora-quote/transport/quote', [
            'destination' => 'Paris',
            'pickupLatitude' => 48.8566,
            'pickupLongitude' => 2.3522,
        ])->assertStatus(422)
            ->assertJsonPath('error', 'Le service Taxi est limité à la zone de Dakar.');

        $trip = $this->postJson('/api/shop/kora-quote/transport/trips', [
            'pickup' => 'Plateau',
            'destination' => 'Point de destination',
            'passengerName' => 'Moussa Fall',
            'passengerPhone' => '+221771111111',
            'pickupLatitude' => 14.7167,
            'pickupLongitude' => -17.4677,
            'quoteToken' => $quote->json('quoteToken'),
        ])->assertCreated()
            ->assertJsonPath('trip.routeDistanceKm', 4.2)
            ->assertJsonPath('trip.routeDurationMinutes', 15)
            ->assertJsonPath('trip.fare', 2000);

        $this->assertDatabaseHas('transport_trips', [
            'id' => $trip->json('trip.id'),
            'route_distance_km' => 4.2,
            'route_duration_minutes' => 15,
        ]);
        Http::assertSentCount(2);
    }

    public function test_authenticated_customer_can_view_and_cancel_only_its_own_taxi_history(): void
    {
        ModuleCatalog::ensureCompanyAccess('kora');
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-kora-history',
            'company_id' => 'kora',
            'slug' => 'kora-history',
            'name' => 'Kora History',
            'description' => 'Taxi',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#111827',
            'accent_color' => '#f59e0b',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $customer = (object) [
            'id' => 'customer-taxi-history',
            'company_id' => 'kora',
            'email' => 'taxi-history@example.test',
            'name' => 'Client Taxi',
            'phone' => '+221770000101',
            'status' => 'ACTIF',
        ];
        DB::table('ecommerce_customers')->insert([
            ...get_object_vars($customer),
            'password_hash' => 'not-used-in-this-test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $token = EcommerceCustomerAuth::issueSession($customer);

        $trip = $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $token)
            ->postJson('/api/shop/kora-history/transport/trips', [
                'pickup' => 'Ma position GPS',
                'destination' => 'Plateau',
                'passengerName' => 'Client Taxi',
                'passengerPhone' => '+221770000101',
                'pickupLatitude' => 14.7167,
                'pickupLongitude' => -17.4677,
            ])->assertCreated()
            ->assertJsonPath('trip.status', 'REQUESTED')
            ->assertJsonPath('trip.companyId', 'kora');

        $tripId = $trip->json('trip.id');
        $this->assertDatabaseHas('transport_trips', [
            'id' => $tripId,
            'customer_id' => $customer->id,
        ]);

        $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $token)
            ->getJson('/api/shop/kora-history/transport/history')
            ->assertOk()
            ->assertJsonPath('trips.0.id', $tripId);

        $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $token)
            ->postJson('/api/shop/kora-history/transport/trips/'.$tripId.'/cancel')
            ->assertOk()
            ->assertJsonPath('trip.status', 'CANCELLED')
            ->assertJsonPath('message', 'Votre course a été annulée.');

        $this->assertDatabaseHas('transport_trips', [
            'id' => $tripId,
            'customer_id' => $customer->id,
            'status' => 'CANCELLED',
        ]);

        $otherCustomer = (object) [
            'id' => 'customer-taxi-other',
            'company_id' => 'kora',
            'email' => 'taxi-other@example.test',
            'name' => 'Autre client',
            'phone' => '+221770000102',
            'status' => 'ACTIF',
        ];
        DB::table('ecommerce_customers')->insert([
            ...get_object_vars($otherCustomer),
            'password_hash' => 'not-used-in-this-test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $otherToken = EcommerceCustomerAuth::issueSession($otherCustomer);

        $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $otherToken)
            ->postJson('/api/shop/kora-history/transport/trips/'.$tripId.'/cancel')
            ->assertForbidden();
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

    private function asActor(string $role = 'company_admin', array $permissions = [], ?string $employeeId = null): self
    {
        $user = AuthUser::query()->create([
            'id' => 'transport-'.strtolower($role),
            'email' => 'transport-'.strtolower($role).'@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Gestionnaire Transport',
            'phone' => '',
            'role' => $role,
            'company_id' => 'kora',
            'employee_id' => $role === 'employee' ? ($employeeId ?? 'transport-employee') : null,
            'sector_ids' => [],
            'permissions' => $permissions,
            'status' => 'ACTIF',
        ]);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}