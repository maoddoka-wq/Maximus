<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Models\CompanyRequest;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
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

    public function test_company_admin_updates_persisted_profile_and_password_without_returning_plaintext(): void
    {
        $this->postJson('/api/company-requests', $this->requestPayload())->assertCreated();
        $companyId = Company::query()->where('email', 'owner@atelier.test')->value('id');
        $maximusToken = $this->issueMaximusSession();

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $maximusToken)
            ->postJson('/api/company-requests/'.$companyId.'/approve')
            ->assertOk();

        $admin = AuthUser::query()->whereKey('company-admin:'.$companyId)->firstOrFail();
        $companyToken = MaximusAuth::issueSession($admin);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $companyToken)
            ->patchJson('/api/companies/'.$companyId, [
                'name' => 'Atelier Renommé',
                'manager' => 'Nouvelle Responsable',
                'email' => 'new-owner@atelier.test',
                'phone' => '+221 77 000 00 00',
                'country' => 'Sénégal',
                'sector' => 'Production',
            ])
            ->assertOk()
            ->assertJsonPath('company.name', 'Atelier Renommé');

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $companyToken)
            ->patchJson('/api/auth/company-password', ['password' => 'NewSecret2026!'])
            ->assertOk();

        $updatedAdmin = AuthUser::query()->findOrFail($admin->id);
        $this->assertTrue(MaximusPassword::check('NewSecret2026!', $updatedAdmin->password_hash));
        $this->assertNotSame('NewSecret2026!', $updatedAdmin->password_hash);
        $this->assertDatabaseHas('companies', [
            'id' => $companyId,
            'name' => 'Atelier Renommé',
            'email' => 'new-owner@atelier.test',
        ]);
    }

    public function test_company_admin_can_persist_branding_and_profile_photo(): void
    {
        $this->postJson('/api/company-requests', $this->requestPayload())->assertCreated();
        $companyId = Company::query()->where('email', 'owner@atelier.test')->value('id');
        $maximusToken = $this->issueMaximusSession();

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $maximusToken)
            ->postJson('/api/company-requests/'.$companyId.'/approve')
            ->assertOk();

        $admin = AuthUser::query()->whereKey('company-admin:'.$companyId)->firstOrFail();
        $companyToken = MaximusAuth::issueSession($admin);
        $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, $companyToken);

        $this->patchJson('/api/companies/'.$companyId, [
            'name' => 'Atelier Exemple',
            'manager' => 'Responsable Atelier',
            'email' => 'owner@atelier.test',
            'phone' => '',
            'country' => 'Sénégal',
            'sector' => 'Production',
            'primaryColor' => '#123456',
            'accentColor' => '#ABCDEF',
            'sidebarColor' => '#101820',
        ])
            ->assertOk()
            ->assertJsonPath('company.primaryColor', '#123456')
            ->assertJsonPath('company.accentColor', '#ABCDEF')
            ->assertJsonPath('company.sidebarColor', '#101820');

        $upload = $this->post('/api/companies/'.$companyId.'/profile-photo', [
            'photo' => UploadedFile::fake()->image('profile.png'),
        ]);
        $upload->assertOk();
        $photoUrl = (string) $upload->json('company.profilePhoto');
        $filename = basename(parse_url($photoUrl, PHP_URL_PATH) ?: '');
        $this->assertNotSame('', $filename);
        $this->assertDatabaseHas('companies', [
            'id' => $companyId,
            'profile_photo' => $photoUrl,
            'profile_photo_mime' => 'image/png',
        ]);
        $this->assertNotEmpty(DB::table('companies')->where('id', $companyId)->value('profile_photo_data'));
        $this->get($photoUrl)->assertOk()->assertHeader('Content-Type', 'image/png');

        $this->deleteJson('/api/companies/'.$companyId.'/profile-photo')
            ->assertOk()
            ->assertJsonPath('company.profilePhoto', null);
        $this->assertDatabaseHas('companies', [
            'id' => $companyId,
            'profile_photo_data' => null,
            'profile_photo_mime' => null,
        ]);
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