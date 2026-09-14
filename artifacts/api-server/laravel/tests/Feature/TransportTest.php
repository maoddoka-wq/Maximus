<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransportTest extends TestCase
{
    use RefreshDatabase;

    public function test_taxi_cycle_is_persisted_and_vehicle_returns_to_available_after_completion(): void
    {
        $request = $this->asActor();
        $driver = $request->postJson('/api/transport/drivers?companyId=kora', [
            'name' => 'Awa Ndiaye',
            'phone' => '+221770000000',
            'licenseNumber' => 'SN-TAXI-001',
        ])->assertCreated();
        $vehicle = $request->postJson('/api/transport/vehicles?companyId=kora', [
            'registration' => 'DK-1234-AA',
            'model' => 'Toyota Corolla',
            'vehicleType' => 'TAXI',
        ])->assertCreated();
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
        $request->postJson('/api/transport/drivers?companyId=another-company', [
            'name' => 'Conducteur Kora',
            'phone' => '+221772222222',
            'licenseNumber' => 'SN-TAXI-002',
        ])->assertForbidden();

        $request->postJson('/api/transport/drivers?companyId=kora', [
            'name' => 'Conducteur Kora',
            'phone' => '+221772222222',
            'licenseNumber' => 'SN-TAXI-002',
        ])->assertCreated();
        $this->assertDatabaseHas('transport_drivers', [
            'company_id' => 'kora',
            'name' => 'Conducteur Kora',
        ]);
        $this->assertDatabaseMissing('transport_drivers', [
            'company_id' => 'another-company',
            'name' => 'Conducteur Kora',
        ]);
    }

    private function asActor(string $role = 'company_admin', array $permissions = []): self
    {
        $user = AuthUser::query()->create([
            'id' => 'transport-'.strtolower($role),
            'email' => 'transport-'.strtolower($role).'@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Gestionnaire Transport',
            'role' => $role,
            'company_id' => 'kora',
            'employee_id' => null,
            'sector_ids' => [],
            'permissions' => $permissions,
            'status' => 'ACTIF',
        ]);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}