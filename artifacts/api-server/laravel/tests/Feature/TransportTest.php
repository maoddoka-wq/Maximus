<?php

namespace Tests\Feature;

use App\Models\AuthUser;
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

    public function test_dispatch_assigns_a_trip_and_requires_the_pickup_code_to_start(): void
    {
        $request = $this->asActor();
        $driver = $request->postJson('/api/transport/drivers?companyId=kora', [
            'employeeId' => $this->createDriverEmployee('dispatch-driver'),
            'licenseNumber' => 'SN-DISPATCH-001',
        ])->assertCreated();
        $request->patchJson('/api/transport/drivers/'.$driver->json('id').'/location?companyId=kora', [
            'latitude' => 0,
            'longitude' => 0,
        ])->assertStatus(422)
            ->assertJsonPath('error', 'La position GPS doit se trouver dans la zone de Dakar.');
        $vehicle = $request->postJson('/api/transport/vehicles?companyId=kora', [
            'registration' => 'DK-DISPATCH-01',
            'model' => 'Toyota Yaris',
            'vehicleType' => 'TAXI',
            'driverId' => $driver->json('id'),
            'imageData' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        ])->assertCreated();
        $trip = $request->postJson('/api/transport/trips?companyId=kora', [
            'pickup' => 'Point E',
            'destination' => 'Plateau',
            'passengerName' => 'Passager Dispatch',
            'passengerPhone' => '+221770000088',
            'fare' => 2500,
        ])->assertCreated()->assertJsonPath('status', 'REQUESTED');

        $request->patchJson('/api/transport/trips/'.$trip->json('id').'/assignment?companyId=kora', [
            'driverId' => $driver->json('id'),
            'vehicleId' => $vehicle->json('id'),
        ])->assertOk()
            ->assertJsonPath('status', 'ASSIGNED')
            ->assertJsonPath('driverId', $driver->json('id'));

        $pickupCode = $request->getJson('/api/transport/bootstrap?companyId=kora')
            ->assertOk()
            ->json('trips.0.pickupCode');
        $this->assertNotEmpty($pickupCode);
        $this->assertDatabaseHas('transport_drivers', [
            'id' => $driver->json('id'),
            'availability' => 'ON_TRIP',
        ]);

        $request->patchJson('/api/transport/trips/'.$trip->json('id').'/status?companyId=kora', [
            'status' => 'IN_PROGRESS',
            'pickupCode' => '0000',
        ])->assertStatus(422)->assertJsonPath('error', 'Le code de prise en charge est incorrect.');

        $request->patchJson('/api/transport/trips/'.$trip->json('id').'/status?companyId=kora', [
            'status' => 'IN_PROGRESS',
            'pickupCode' => $pickupCode,
        ])->assertOk()->assertJsonPath('status', 'IN_PROGRESS');

        $request->patchJson('/api/transport/trips/'.$trip->json('id').'/status?companyId=kora', [
            'status' => 'COMPLETED',
        ])->assertOk();
        $this->assertDatabaseHas('transport_drivers', [
            'id' => $driver->json('id'),
            'availability' => 'AVAILABLE',
        ]);
        $this->assertDatabaseHas('transport_trip_events', [
            'trip_id' => $trip->json('id'),
            'event_type' => 'status_changed',
            'to_status' => 'COMPLETED',
        ]);
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
        Http::fake();
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

    public function test_public_taxi_matches_a_distant_driver_inside_dakar_with_fast_gps_distance_calculation(): void
    {
        config(['services.openrouteservice.api_key' => '']);
        Http::fakeSequence()
            ->push([
                [
                    'lat' => '14.7300',
                    'lon' => '-17.4500',
                    'display_name' => 'Almadies, Dakar, Sénégal',
                    'type' => 'neighbourhood',
                ],
            ])
            ->push([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 42000,
                    'duration' => 3600,
                    'geometry' => [
                        'type' => 'LineString',
                        'coordinates' => [
                            [-17.4677, 14.7167],
                            [-17.4500, 14.7300],
                        ],
                    ],
                ]],
            ])
            ->push([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 43000,
                    'duration' => 3600,
                    'geometry' => [
                        'type' => 'LineString',
                        'coordinates' => [
                            [-17.1500, 14.8500],
                            [-17.4677, 14.7167],
                        ],
                    ],
                ]],
            ]);
        ModuleCatalog::ensureCompanyAccess('kora');
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-kora-distant-taxi',
            'company_id' => 'kora',
            'slug' => 'kora-distant-taxi',
            'name' => 'Kora Taxi Distant',
            'description' => 'Taxi',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#111827',
            'accent_color' => '#f59e0b',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $driverId = 'driver-distant';
        $this->createDriverEmployee($driverId, 'Chauffeur éloigné', '+221770000003');
        DB::table('transport_drivers')->insert([
            'id' => $driverId,
            'company_id' => 'kora',
            'name' => 'Chauffeur éloigné',
            'phone' => '+221770000003',
            'license_number' => 'GPS-DISTANT',
            'employee_id' => $driverId,
            'status' => 'ACTIVE',
            'availability' => 'AVAILABLE',
            'latitude' => 14.8500,
            'longitude' => -17.1500,
            'location_updated_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('transport_vehicles')->insert([
            'id' => 'vehicle-distant',
            'company_id' => 'kora',
            'registration' => 'DK-DISTANT-01',
            'model' => 'Toyota Distant',
            'vehicle_type' => 'TAXI',
            'driver_id' => $driverId,
            'status' => 'AVAILABLE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $trip = $this->postJson('/api/shop/kora-distant-taxi/transport/trips', [
            'pickup' => 'Plateau',
            'destination' => 'Almadies',
            'passengerName' => 'Passager longue distance',
            'passengerPhone' => '+221771111113',
            'pickupLatitude' => 14.7167,
            'pickupLongitude' => -17.4677,
        ])->assertCreated()
            ->assertJsonPath('matched', true)
            ->assertJsonPath('trip.driverId', $driverId)
            ->assertJsonPath('trip.status', 'OFFERED');

        $matchedDistance = (float) $trip->json('trip.matchedDistanceKm');
        $this->assertGreaterThan(20.0, $matchedDistance);
        $this->assertLessThan(40.0, $matchedDistance);
        $this->assertTrue($trip->json('trip.routePending'));
        $this->assertSame(500, $trip->json('trip.fare'));
        Http::assertNothingSent();
        $this->assertDatabaseHas('transport_trips', [
            'id' => $trip->json('trip.id'),
            'driver_id' => $driverId,
            'matched_distance_km' => $matchedDistance,
        ]);

        $deferredTripResponse = $this->getJson('/api/shop/kora-distant-taxi/transport/trips/'.$trip->json('trip.id'));
        $deferredTripResponse
            ->assertOk()
            ->assertJsonPath('trip.routePending', false)
            ->assertJsonPath('trip.routeDistanceKm', 42)
            ->assertJsonPath('trip.pickupRouteDistanceKm', 43)
            ->assertJsonPath('trip.fare', 13100);
        Http::assertSentCount(3);
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
                [
                    'lat' => '14.7300',
                    'lon' => '-17.4500',
                    'display_name' => 'Point de destination, Dakar, Sénégal',
                    'type' => 'place',
                ],
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

        $this->getJson('/api/shop/kora-quote/transport/places?q=Point')
            ->assertOk()
            ->assertJsonPath('places.0.label', 'Point de destination, Dakar')
            ->assertJsonPath('places.0.latitude', 14.73)
            ->assertJsonPath('places.0.longitude', -17.45);

        $quote = $this->postJson('/api/shop/kora-quote/transport/quote', [
            'destination' => 'Point de destination',
            'pickupLatitude' => 14.7167,
            'pickupLongitude' => -17.4677,
            'destinationLatitude' => 14.7300,
            'destinationLongitude' => -17.4500,
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

    public function test_public_taxi_place_search_tries_broader_queries_and_returns_multiple_dakar_matches(): void
    {
        ModuleCatalog::ensureCompanyAccess('kora');
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-kora-places',
            'company_id' => 'kora',
            'slug' => 'kora-places',
            'name' => 'Kora Places',
            'description' => 'Taxi',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#111827',
            'accent_color' => '#f59e0b',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Http::fakeSequence()
            ->push([])
            ->push([
                [
                    'lat' => '14.7116',
                    'lon' => '-17.4687',
                    'display_name' => 'Grand-Dakar, Dakar, Sénégal',
                    'type' => 'neighbourhood',
                ],
                [
                    'lat' => '14.6920',
                    'lon' => '-17.4470',
                    'display_name' => 'Grand Dakar, Dakar, Sénégal',
                    'type' => 'place',
                ],
            ]);

        $this->getJson('/api/shop/kora-places/transport/places?q=Grand%20Dakar')
            ->assertOk()
            ->assertJsonCount(2, 'places')
            ->assertJsonPath('places.0.latitude', 14.7116)
            ->assertJsonPath('places.1.longitude', -17.447);

        Http::assertSentCount(2);
    }

    public function test_public_taxi_place_search_keeps_plateau_available_when_geocoder_returns_no_result(): void
    {
        ModuleCatalog::ensureCompanyAccess('kora');
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-kora-plateau',
            'company_id' => 'kora',
            'slug' => 'kora-plateau',
            'name' => 'Kora Plateau',
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
            'https://nominatim.openstreetmap.org/*' => Http::response([]),
        ]);

        $this->getJson('/api/shop/kora-plateau/transport/places?q=Dakar%20plateau')
            ->assertOk()
            ->assertJsonCount(2, 'places')
            ->assertJsonPath('places.0.label', 'Dakar-Plateau, Dakar')
            ->assertJsonPath('places.0.latitude', 14.667317)
            ->assertJsonPath('places.0.longitude', -17.437966);
    }

    public function test_public_taxi_customer_can_cancel_only_with_the_signed_request_token(): void
    {
        ModuleCatalog::ensureCompanyAccess('kora');
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-kora-cancel',
            'company_id' => 'kora',
            'slug' => 'kora-cancel',
            'name' => 'Kora Cancel',
            'description' => 'Taxi',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#111827',
            'accent_color' => '#f59e0b',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $trip = $this->postJson('/api/shop/kora-cancel/transport/trips', [
            'pickup' => 'Plateau',
            'destination' => 'Fann',
            'passengerName' => 'Client Annulation',
            'passengerPhone' => '+221771234567',
            'pickupLatitude' => 14.7167,
            'pickupLongitude' => -17.4677,
        ])->assertCreated()
            ->assertJsonPath('trip.status', 'REQUESTED')
            ->assertJsonPath('cancelToken', fn ($value) => is_string($value) && $value !== '');

        $this->postJson('/api/shop/kora-cancel/transport/trips/'.$trip->json('trip.id').'/cancel', [
            'cancelToken' => 'invalid-token',
        ])->assertForbidden();

        $this->postJson('/api/shop/kora-cancel/transport/trips/'.$trip->json('trip.id').'/cancel', [
            'cancelToken' => $trip->json('cancelToken'),
        ])->assertOk()
            ->assertJsonPath('trip.status', 'CANCELLED')
            ->assertJsonPath('message', 'Votre demande a été annulée.');

        $this->assertDatabaseHas('transport_trips', [
            'id' => $trip->json('trip.id'),
            'status' => 'CANCELLED',
        ]);
    }

    public function test_public_taxi_share_link_is_read_only_scoped_and_expires(): void
    {
        ModuleCatalog::ensureCompanyAccess('kora');
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-kora-share',
            'company_id' => 'kora',
            'slug' => 'kora-share',
            'name' => 'Kora Share',
            'description' => 'Taxi',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#111827',
            'accent_color' => '#f59e0b',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $trip = $this->postJson('/api/shop/kora-share/transport/trips', [
            'pickup' => 'Entrée principale de l’hôpital',
            'destination' => 'Fann',
            'passengerName' => 'Client Suivi',
            'passengerPhone' => '+221771234567',
            'pickupLatitude' => 14.7167,
            'pickupLongitude' => -17.4677,
        ])->assertCreated()
            ->assertJsonPath('trip.pickup', 'Entrée principale de l’hôpital')
            ->assertJsonPath('trip.pickupCode', fn ($value) => is_string($value) && preg_match('/^\d{4}$/', $value) === 1);

        $tripId = $trip->json('trip.id');
        $share = $this->postJson('/api/shop/kora-share/transport/trips/'.$tripId.'/share', [
            'cancelToken' => $trip->json('cancelToken'),
        ])->assertCreated()
            ->assertJsonPath('shareToken', fn ($value) => is_string($value) && preg_match('/^[a-f0-9]{64}$/', $value) === 1);
        $shareToken = $share->json('shareToken');
        $tokenHash = hash('sha256', $shareToken);

        $this->assertNotSame($trip->json('cancelToken'), $shareToken);
        $this->assertDatabaseHas('transport_trip_shares', [
            'company_id' => 'kora',
            'trip_id' => $tripId,
            'token_hash' => $tokenHash,
        ]);
        $this->assertDatabaseMissing('transport_trip_shares', ['token_hash' => $shareToken]);

        $sharePath = '/api/shop/kora-share/transport/trips/'.$tripId.'/share';
        $sharedTripResponse = $this->getJson($sharePath, ['X-Transport-Share-Token' => $shareToken])
            ->assertOk()
            ->assertJsonPath('trip.pickup', 'Entrée principale de l’hôpital');
        $this->assertStringContainsString(
            'no-store',
            $sharedTripResponse->headers->get('Cache-Control') ?? '',
        );
        $sharedTrip = $sharedTripResponse->json('trip');
        $this->assertArrayNotHasKey('companyId', $sharedTrip);
        $this->assertArrayNotHasKey('passengerName', $sharedTrip);
        $this->assertArrayNotHasKey('passengerPhone', $sharedTrip);
        $this->assertArrayNotHasKey('driverPhone', $sharedTrip);
        $this->assertArrayNotHasKey('pickupCode', $sharedTrip);

        $this->getJson('/api/shop/kora-share/transport/trips/'.$tripId.'/share', [
            'X-Transport-Share-Token' => str_repeat('0', 64),
        ])->assertNotFound();
        $this->getJson('/api/shop/kora-share/transport/trips/another-trip/share', [
            'X-Transport-Share-Token' => $shareToken,
        ])->assertNotFound();
        $this->postJson('/api/shop/kora-share/transport/trips/'.$tripId.'/cancel', [
            'cancelToken' => $shareToken,
        ])->assertForbidden();

        DB::table('transport_trip_shares')
            ->where('token_hash', $tokenHash)
            ->update(['expires_at' => now()->subSecond()]);
        $this->getJson($sharePath, ['X-Transport-Share-Token' => $shareToken])->assertNotFound();
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