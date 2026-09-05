<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\ControlAuditEntry;
use App\Models\ControlEvent;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_control_routes_require_a_maximus_session(): void
    {
        $this->getJson('/api/control/bootstrap?companyId=kora')
            ->assertUnauthorized();
    }

    public function test_company_admin_can_create_and_update_a_task_with_audit_traces(): void
    {
        $request = $this->asActor([
            'id' => 'admin-kora',
            'email' => 'admin@kora.demo',
            'display_name' => 'Admin Kora',
            'role' => 'company_admin',
            'company_id' => 'kora',
        ]);

        $created = $request->postJson('/api/control/tasks', [
            'companyId' => 'kora',
            'sectorId' => 'logistique',
            'title' => 'Contrôler la réception',
            'description' => 'Vérifier les quantités avant validation.',
            'moduleId' => 'stock',
            'assigneeEmployeeId' => 'employee-1',
            'assigneeName' => 'Employé 1',
            'createdBy' => 'Valeur fournie par le client',
            'priority' => 'HAUTE',
            'requiresApproval' => true,
        ]);

        $created
            ->assertCreated()
            ->assertJsonPath('companyId', 'kora')
            ->assertJsonPath('createdBy', 'Admin Kora')
            ->assertJsonPath('status', 'À FAIRE');

        $taskId = $created->json('id');
        $this->assertDatabaseCount('control_tasks', 1);
        $this->assertDatabaseCount('control_events', 1);
        $this->assertDatabaseCount('control_audit_entries', 1);

        $updated = $request->patchJson('/api/control/tasks/'.$taskId.'/status', [
            'companyId' => 'kora',
            'status' => 'VALIDÉ',
        ]);

        $updated
            ->assertOk()
            ->assertJsonPath('id', $taskId)
            ->assertJsonPath('status', 'VALIDÉ');

        $this->assertDatabaseCount('control_events', 2);
        $this->assertDatabaseCount('control_audit_entries', 2);
        $this->assertDatabaseHas('control_events', [
            'entity_id' => $taskId,
            'type' => 'APPROVAL_GRANTED',
        ]);
    }

    public function test_employee_cannot_create_a_control_task(): void
    {
        $request = $this->asActor([
            'id' => 'employee-1',
            'email' => 'employee@kora.demo',
            'display_name' => 'Employé 1',
            'role' => 'employee',
            'company_id' => 'kora',
            'employee_id' => 'employee-1',
        ]);

        $request->postJson('/api/control/tasks', [
            'companyId' => 'kora',
            'title' => 'Tentative non autorisée',
            'description' => 'Cette création doit être refusée.',
            'createdBy' => 'Employé 1',
        ])->assertForbidden();
    }

    public function test_bootstrap_returns_only_tasks_in_the_actor_scope(): void
    {
        $request = $this->asActor([
            'id' => 'employee-1',
            'email' => 'employee@kora.demo',
            'display_name' => 'Employé 1',
            'role' => 'employee',
            'company_id' => 'kora',
            'employee_id' => 'employee-1',
        ]);

        \App\Models\ControlTask::query()->create([
            'id' => 'task-visible',
            'company_id' => 'kora',
            'title' => 'Visible',
            'description' => 'Visible pour cet employé.',
            'created_by' => 'Admin Kora',
            'status' => 'À FAIRE',
            'priority' => 'NORMALE',
            'requires_approval' => false,
            'assignee_employee_id' => 'employee-1',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        \App\Models\ControlTask::query()->create([
            'id' => 'task-hidden',
            'company_id' => 'kora',
            'title' => 'Cachée',
            'description' => 'Hors périmètre.',
            'created_by' => 'Admin Kora',
            'status' => 'À FAIRE',
            'priority' => 'NORMALE',
            'requires_approval' => false,
            'assignee_employee_id' => 'employee-2',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $request->getJson('/api/control/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonCount(1, 'tasks')
            ->assertJsonPath('tasks.0.id', 'task-visible');
    }

    private function asActor(array $attributes): self
    {
        $user = AuthUser::query()->create(array_merge([
            'password_hash' => 'not-used-in-this-test',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ], $attributes));
        $token = MaximusAuth::issueSession($user);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token);
    }
}