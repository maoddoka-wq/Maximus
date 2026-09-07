<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\PresenceItem;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PresenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        ModuleCatalog::ensureCompanyAccess('kora');
    }

    public function test_presence_items_are_persisted_with_a_history_record(): void
    {
        $request = $this->asActor();
        $created = $request->postJson('/api/presence/items', [
            'companyId' => 'kora',
            'type' => 'leave',
            'employeeId' => 'employee-1',
            'workDate' => '2026-09-05',
            'status' => 'EN ATTENTE',
            'payload' => ['reason' => 'Congé annuel', 'days' => 2],
            'actor' => 'Usurpateur côté navigateur',
        ]);

        $created
            ->assertCreated()
            ->assertJsonPath('companyId', 'kora')
            ->assertJsonPath('type', 'leave')
            ->assertJsonPath('payload.reason', 'Congé annuel');

        $this->assertDatabaseCount('presence_items', 2);
        $this->assertDatabaseHas('presence_items', [
            'type' => 'history',
            'created_by' => 'RH Kora',
        ]);

        $request->getJson('/api/presence/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonCount(2, 'items');
    }

    public function test_clocking_enforces_the_daily_sequence_and_records_pause_duration(): void
    {
        $request = $this->asActor();
        $base = [
            'companyId' => 'kora',
            'employeeId' => 'employee-1',
            'workDate' => '2026-09-05',
            'actor' => 'Employé 1',
        ];

        $request->postJson('/api/presence/clock', $base + [
            'action' => 'exit',
            'now' => '2026-09-05T08:00:00Z',
        ])->assertStatus(409);

        $arrival = $request->postJson('/api/presence/clock', $base + [
            'action' => 'arrival',
            'expectedStart' => '08:00',
            'now' => '2026-09-05T08:15:00Z',
        ]);
        $arrival->assertCreated()->assertJsonPath('payload.arrival', '08:15');
        $this->assertSame(5, $arrival->json('payload.lateMinutes'));

        $request->postJson('/api/presence/clock', $base + [
            'action' => 'pauseStart',
            'now' => '2026-09-05T12:00:00Z',
        ])->assertOk()->assertJsonPath('payload.status', 'En pause');

        $pauseEnd = $request->postJson('/api/presence/clock', $base + [
            'action' => 'pauseEnd',
            'now' => '2026-09-05T12:30:00Z',
        ]);
        $pauseEnd->assertOk()->assertJsonPath('payload.pauseMinutes', 30);

        $request->postJson('/api/presence/clock', $base + [
            'action' => 'arrival',
            'now' => '2026-09-05T13:00:00Z',
        ])->assertStatus(409);

        $this->assertSame(3, PresenceItem::query()->where('type', 'history')->count());
    }

    public function test_update_and_delete_are_limited_to_the_company_in_the_request(): void
    {
        $request = $this->asActor();
        $item = PresenceItem::query()->create([
            'id' => 'presence-kora-1',
            'company_id' => 'kora',
            'type' => 'schedule',
            'status' => 'ACTIF',
            'payload' => ['shift' => 'matin'],
            'created_by' => 'Admin',
            'updated_by' => 'Admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $request->patchJson('/api/presence/items/'.$item->id, [
            'companyId' => 'autre-entreprise',
            'payload' => ['shift' => 'soir'],
        ])->assertForbidden();

        $request->deleteJson('/api/presence/items/'.$item->id, [
            'companyId' => 'kora',
            'actor' => 'Admin',
        ])->assertOk()->assertJson(['ok' => true]);

        $this->assertDatabaseMissing('presence_items', ['id' => $item->id]);
        $history = PresenceItem::query()
            ->where('type', 'history')
            ->latest('created_at')
            ->firstOrFail();
        $this->assertSame('schedule.delete', $history->payload['action']);
        $this->assertSame('presence-kora-1', $history->payload['itemId']);
        $this->assertSame(['shift' => 'matin'], $history->payload['oldValue']);
        $this->assertNull($history->payload['employeeId']);
        $this->assertNull($history->payload['workDate']);
    }

    public function test_presence_rejects_a_company_different_from_the_actor(): void
    {
        $this->asActor()
            ->getJson('/api/presence/bootstrap?companyId=another-company')
            ->assertForbidden();
    }

    public function test_presence_rejects_removed_legacy_item_types(): void
    {
        $this->asActor()
            ->postJson('/api/presence/items', [
                'companyId' => 'kora',
                'type' => 'planning',
                'status' => 'ACTIF',
                'payload' => [],
            ])
            ->assertUnprocessable();
    }

    public function test_presence_history_is_server_managed(): void
    {
        $request = $this->asActor();

        $request->postJson('/api/presence/items', [
            'companyId' => 'kora',
            'type' => 'history',
            'status' => 'ACTIF',
            'payload' => ['action' => 'forged'],
        ])->assertUnprocessable();

        PresenceItem::query()->create([
            'id' => 'history-protected',
            'company_id' => 'kora',
            'type' => 'history',
            'status' => 'ACTIF',
            'payload' => ['action' => 'clock.arrival'],
            'created_by' => 'Serveur',
            'updated_by' => 'Serveur',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $request->patchJson('/api/presence/items/history-protected', [
            'companyId' => 'kora',
            'payload' => ['action' => 'forged.update'],
        ])->assertForbidden();

        $request->deleteJson('/api/presence/items/history-protected', [
            'companyId' => 'kora',
        ])->assertForbidden();
    }

    public function test_presence_api_enforces_detailed_permissions_and_employee_scope(): void
    {
        $request = $this->asActor('employee', 'presence-employee', ['presences' => ['voir', 'créer']]);

        $request->getJson('/api/presence/bootstrap?companyId=kora')
            ->assertOk();

        $request->postJson('/api/presence/clock', [
            'companyId' => 'kora',
            'employeeId' => 'another-employee',
            'workDate' => '2026-09-05',
            'action' => 'arrival',
            'now' => '2026-09-05T08:00:00Z',
        ])->assertForbidden();

        $request->postJson('/api/presence/items', [
            'companyId' => 'kora',
            'type' => 'schedule',
            'employeeId' => 'presence-employee',
            'status' => 'ACTIF',
            'payload' => ['shift' => 'matin'],
        ])->assertCreated();
    }

    private function asActor(string $role = 'company_admin', string $employeeId = 'presence-admin', array $permissions = []): self
    {
        $user = AuthUser::query()->create([
            'id' => 'presence-admin',
            'email' => 'presence-admin@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'RH Kora',
            'role' => $role,
            'company_id' => 'kora',
            'employee_id' => $role === 'employee' ? $employeeId : null,
            'sector_ids' => [],
            'permissions' => $permissions,
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($user);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token);
    }
}
