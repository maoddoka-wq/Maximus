<?php

namespace Tests\Feature;

use App\Models\AmicaleRecord;
use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AmicaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_members_and_receipts_are_persisted_and_company_scoped(): void
    {
        $admin = $this->asActor('amicale-admin');
        $member = $admin->postJson('/api/amicales/members?companyId=kora', [
            'name' => 'Aminata Diop',
            'studentIdentifier' => ' u-2026-01 ',
            'faculty' => 'Sciences',
            'joinedAt' => '2026-10-08',
        ])
            ->assertCreated()
            ->assertJsonPath('member.studentIdentifier', 'U-2026-01');

        $this->assertStringStartsWith('MEM-', $member->json('member.reference'));
        $memberId = $member->json('member.id');
        $admin->postJson('/api/amicales/contributions?companyId=kora', [
            'memberId' => $memberId,
            'period' => '2026-2027',
            'amount' => 5000,
            'paidOn' => '2026-10-08',
            'method' => 'MOBILE_MONEY',
        ])
            ->assertCreated()
            ->assertJsonPath('contribution.memberName', 'Aminata Diop')
            ->assertJsonPath('contribution.amount', 5000);

        $admin->patchJson('/api/amicales/members/'.$memberId.'?companyId=kora', [
            'name' => 'Aminata Ndiaye',
        ])->assertOk();
        $admin->postJson('/api/amicales/members/'.$memberId.'/archive?companyId=kora')
            ->assertOk()
            ->assertJsonPath('member.status', 'ARCHIVED');
        $admin->postJson('/api/amicales/contributions?companyId=kora', [
            'memberId' => $memberId,
            'period' => '2027-2028',
            'amount' => 5000,
            'paidOn' => '2027-10-08',
            'method' => 'CASH',
        ])->assertUnprocessable();

        $admin->getJson('/api/amicales/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonCount(1, 'members')
            ->assertJsonCount(1, 'contributions')
            ->assertJsonPath('members.0.status', 'ARCHIVED')
            ->assertJsonPath('contributions.0.memberName', 'Aminata Diop');

        $admin->getJson('/api/amicales/bootstrap?companyId=another-company')
            ->assertForbidden();

        $this->assertDatabaseCount('amicale_records', 2);
        $this->assertDatabaseHas('amicale_record_history', [
            'record_id' => $memberId,
            'action' => 'member.create',
        ]);
    }

    public function test_expenses_need_a_distinct_approver_and_follow_valid_transitions(): void
    {
        $author = $this->asActor('expense-author');
        $expense = $author->postJson('/api/amicales/expenses?companyId=kora', [
            'title' => 'Location de salle',
            'category' => 'Événement',
            'amount' => 75000,
            'expenseDate' => '2026-10-10',
            'vendor' => 'Centre étudiant',
        ])
            ->assertCreated()
            ->assertJsonPath('expense.status', 'PENDING');
        $expenseId = $expense->json('expense.id');

        $author->postJson('/api/amicales/expenses/'.$expenseId.'/decision?companyId=kora', [
            'status' => 'APPROVED',
        ])->assertForbidden();

        $approver = $this->asActor('expense-approver');
        $approver->postJson('/api/amicales/expenses/'.$expenseId.'/decision?companyId=kora', [
            'status' => 'APPROVED',
            'decisionNote' => 'Budget confirmé',
        ])
            ->assertOk()
            ->assertJsonPath('expense.status', 'APPROVED')
            ->assertJsonPath('expense.decisionNote', 'Budget confirmé');

        $approver->postJson('/api/amicales/expenses/'.$expenseId.'/paid?companyId=kora')
            ->assertOk()
            ->assertJsonPath('expense.status', 'PAID');

        $this->assertSame('PAID', AmicaleRecord::query()->whereKey($expenseId)->value('status'));
        $this->assertDatabaseHas('amicale_record_history', [
            'record_id' => $expenseId,
            'action' => 'expense.paid',
        ]);
    }

    public function test_feature_permissions_limit_records_returned_and_mutations(): void
    {
        $admin = $this->asActor('scope-admin');
        $admin->postJson('/api/amicales/members?companyId=kora', [
            'name' => 'Membre visible',
        ])->assertCreated();
        $admin->postJson('/api/amicales/expenses?companyId=kora', [
            'title' => 'Dépense privée',
            'category' => 'Frais',
            'amount' => 10000,
            'expenseDate' => '2026-10-08',
        ])->assertCreated();

        $memberManager = $this->asActor('member-manager', 'employee', [
            'amicales:menu:membres' => ['voir', 'créer', 'modifier'],
        ]);
        $memberManager->getJson('/api/amicales/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonCount(1, 'members')
            ->assertJsonCount(0, 'expenses');

        $memberManager->postJson('/api/amicales/expenses?companyId=kora', [
            'title' => 'Dépense non autorisée',
            'category' => 'Frais',
            'amount' => 10000,
            'expenseDate' => '2026-10-08',
        ])->assertForbidden();
    }

    public function test_activities_and_announcements_are_persisted_with_valid_counts(): void
    {
        $admin = $this->asActor('activities-admin');
        $activity = $admin->postJson('/api/amicales/activities?companyId=kora', [
            'title' => 'Journée d’accueil',
            'eventDate' => '2026-10-15',
            'location' => 'Campus',
            'participantCount' => 40,
            'attendeeCount' => 32,
        ])
            ->assertCreated()
            ->assertJsonPath('activity.status', 'PLANNED');

        $admin->patchJson('/api/amicales/activities/'.$activity->json('activity.id').'?companyId=kora', [
            'participantCount' => 30,
            'attendeeCount' => 32,
        ])->assertUnprocessable();

        $admin->postJson('/api/amicales/announcements?companyId=kora', [
            'title' => 'Réunion générale',
            'body' => 'Rendez-vous à 16 h.',
            'status' => 'PUBLISHED',
        ])
            ->assertCreated()
            ->assertJsonPath('announcement.status', 'PUBLISHED')
            ->assertJsonPath('announcement.body', 'Rendez-vous à 16 h.');

        $admin->getJson('/api/amicales/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonCount(1, 'activities')
            ->assertJsonCount(1, 'announcements');
    }

    private function asActor(
        string $id,
        string $role = 'company_admin',
        array $permissions = [],
    ): self {
        $user = AuthUser::query()->create([
            'id' => $id,
            'email' => $id.'@kora.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => $id,
            'role' => $role,
            'company_id' => 'kora',
            'employee_id' => $role === 'employee' ? $id : null,
            'sector_ids' => [],
            'permissions' => $permissions,
            'status' => 'ACTIF',
        ]);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}
