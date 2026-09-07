<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Models\CompanyRequest;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompanyRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_request_is_persisted_without_plaintext_password(): void
    {
        $response = $this->postJson('/api/company-requests', $this->requestPayload());

        $response
            ->assertCreated()
            ->assertJsonPath('status', 'PENDING');

        $company = Company::query()->where('email', 'owner@atelier.test')->firstOrFail();
        $request = CompanyRequest::query()->where('company_id', $company->id)->firstOrFail();

        $this->assertSame('EN ATTENTE', $company->status);
        $this->assertNotSame('Secret2026!', $request->admin_password_hash);
        $this->assertTrue(MaximusPassword::check('Secret2026!', $request->admin_password_hash));
        $this->assertDatabaseHas('company_requests', [
            'company_id' => $company->id,
            'status' => 'PENDING',
        ]);
    }

    public function test_maximus_can_approve_a_request_and_provision_the_admin_and_modules(): void
    {
        $this->postJson('/api/company-requests', $this->requestPayload())->assertCreated();
        $companyId = Company::query()->where('email', 'owner@atelier.test')->value('id');
        $this->assertNotNull($companyId);
        $token = $this->issueMaximusSession();

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/company-requests/'.$companyId.'/approve')
            ->assertOk()
            ->assertJsonPath('company.status', 'ACTIF')
            ->assertJsonPath('request.status', 'APPROVED');

        $this->assertDatabaseHas('companies', ['id' => $companyId, 'status' => 'ACTIF']);
        $this->assertDatabaseHas('auth_users', [
            'id' => 'company-admin:'.$companyId,
            'company_id' => $companyId,
            'role' => 'company_admin',
            'status' => 'ACTIF',
        ]);
        $this->assertDatabaseHas('maximus_company_modules', [
            'company_id' => $companyId,
            'module_id' => 'commerce',
            'status' => 'ACTIF',
        ]);
    }

    public function test_rejecting_a_request_is_persisted_and_cannot_be_approved_afterward(): void
    {
        $this->postJson('/api/company-requests', $this->requestPayload())->assertCreated();
        $companyId = Company::query()->where('email', 'owner@atelier.test')->value('id');
        $token = $this->issueMaximusSession();

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/company-requests/'.$companyId.'/reject', ['reason' => 'Périmètre incomplet'])
            ->assertOk()
            ->assertJsonPath('company.status', 'REFUSÉ');

        $this->assertDatabaseHas('company_requests', [
            'company_id' => $companyId,
            'status' => 'REJECTED',
            'rejection_reason' => 'Périmètre incomplet',
        ]);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/company-requests/'.$companyId.'/approve')
            ->assertStatus(409);
    }

    public function test_archiving_a_company_revokes_sessions_and_blocks_the_tenant(): void
    {
        $company = Company::query()->create([
            'id' => 'company-to-archive',
            'name' => 'Entreprise à archiver',
            'manager' => 'Responsable',
            'email' => 'archive@atelier.test',
            'status' => 'ACTIF',
            'requested_modules' => ['commerce'],
        ]);
        $user = AuthUser::query()->create([
            'id' => 'company-admin:'.$company->id,
            'email' => $company->email,
            'password_hash' => MaximusPassword::hash('Secret2026!'),
            'display_name' => $company->manager,
            'role' => 'company_admin',
            'company_id' => $company->id,
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($user);

        $adminToken = $this->issueMaximusSession();
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $adminToken)
            ->deleteJson('/api/companies/'.$company->id)
            ->assertOk();

        $this->assertDatabaseHas('companies', ['id' => $company->id, 'status' => 'ARCHIVÉ']);
        $this->assertDatabaseHas('auth_users', ['id' => $user->id, 'status' => 'SUSPENDU']);
        $this->assertDatabaseMissing('auth_sessions', ['user_id' => $user->id]);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->getJson('/api/app-state/bootstrap')
            ->assertUnauthorized();
    }

    private function issueMaximusSession(): string
    {
        $admin = AuthUser::query()->create([
            'id' => 'maximus-admin-'.uniqid(),
            'email' => uniqid('admin-', true).'@maximus.test',
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);

        return MaximusAuth::issueSession($admin);
    }

    private function requestPayload(): array
    {
        return [
            'name' => 'Atelier Exemple',
            'manager' => 'Responsable Atelier',
            'email' => 'owner@atelier.test',
            'password' => 'Secret2026!',
            'country' => 'Sénégal',
            'sector' => 'Production',
            'requestedModules' => ['commerce'],
            'requestedModuleFeatures' => ['commerce' => ['sales']],
            'requestedModulePermissions' => ['commerce' => ['sales' => ['voir', 'créer']]],
        ];
    }
}