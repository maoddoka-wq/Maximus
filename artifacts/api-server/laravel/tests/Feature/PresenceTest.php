<?php

namespace Tests\Feature;

use App\Models\PresenceItem;
use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PresenceTest extends TestCase
{
    use RefreshDatabase;

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
            'actor' => 'RH Kora',
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
        $this->assertDatabaseHas('presence_items', [
            'type' => 'history',
            'payload' => json_encode([
                'action' => 'schedule.delete',
                'itemId' => 'presence-kora-1',
                'oldValue' => ['shift' => 'matin'],
                'employeeId' => null,
                'workDate' => null,
            ]),
        ]);
    }

    public function test_presence_rejects_a_company_different_from_the_actor(): void
    {
        $this->asActor()
            ->getJson('/api/presence/bootstrap?companyId=another-company')
            ->assertForbidden();
    }

    private function asActor(): self
    {
        $user = AuthUser::query()->create([
            'id' => 'presence-admin',
            'email' => 'presence-admin@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'RH Kora',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($user);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token);
    }
}