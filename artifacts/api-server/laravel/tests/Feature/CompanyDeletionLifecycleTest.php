<?php

namespace Tests\Feature;

use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Models\Company;
use App\Models\CompanyRequest;
use App\Support\CompanyRegistry;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CompanyDeletionLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_company_can_be_archived_and_recreated_with_the_same_email_without_reusing_identity(): void
    {
        $maximusToken = $this->issueMaximusSession();
        $this->postJson('/api/company-requests', $this->requestPayload())->assertCreated();
        $oldCompany = Company::query()->where('email', 'reuse@atelier.test')->firstOrFail();
        $this->approve($maximusToken, $oldCompany->id)->assertOk();
        $oldUser = AuthUser::query()->where('company_id', $oldCompany->id)->firstOrFail();
        $oldToken = MaximusAuth::issueSession($oldUser);

        DB::table('transport_drivers')->insert([
            'id' => 'historical-driver',
            'company_id' => $oldCompany->id,
            'name' => 'Conductrice historique',
            'phone' => '+221700000000',
            'license_number' => 'LIC-HISTORY',
            'status' => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('seller_wallets')->insert([
            'id' => 'historical-wallet',
            'company_id' => $oldCompany->id,
            'currency' => 'XOF',
            'pending_balance' => 1000,
            'available_balance' => 2000,
            'reserved_balance' => 0,
            'total_credited' => 3000,
            'payout_provider' => 'WAVE',
            'payout_mobile' => '+221700000000',
            'payout_name' => 'Atelier',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('ecommerce_domains')->insert([
            'id' => 'historical-domain',
            'company_id' => $oldCompany->id,
            'domain' => 'archive.atelier.test',
            'target_host' => 'shops.maximus.test',
            'verification_token' => 'historical-proof',
            'status' => 'ACTIVE',
            'last_error' => '',
            'verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('maximus_installations')->insert([
            'id' => 'historical-installation',
            'company_id' => $oldCompany->id,
            'mode' => 'dedicated',
            'status' => 'CONNECTED',
            'token_hash' => hash('sha256', 'historical-installation-token'),
            'configuration_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->asMaximus($maximusToken)
            ->patchJson('/api/companies/'.$oldCompany->id.'/deletion-lock', ['locked' => false])
            ->assertOk();
        $this->asMaximus($maximusToken)
            ->deleteJson('/api/companies/'.$oldCompany->id)
            ->assertOk();

        $oldCompany->refresh();
        $oldUser->refresh();
        $this->assertSame('reuse@atelier.test', $oldCompany->email);
        $this->assertSame('ARCHIVÉ', $oldCompany->status);
        $this->assertSame($oldCompany->id, $oldUser->company_id);
        $this->assertSame('SUSPENDU', $oldUser->status);
        $this->assertSame(
            'archived+'.hash('sha256', $oldUser->id).'@identity.invalid',
            $oldUser->email,
        );
        $this->assertDatabaseHas('transport_drivers', ['id' => 'historical-driver', 'company_id' => $oldCompany->id]);
        $this->assertDatabaseHas('seller_wallets', ['id' => 'historical-wallet', 'total_credited' => 3000]);
        $this->assertDatabaseHas('maximus_company_modules', ['company_id' => $oldCompany->id, 'status' => 'SUSPENDU']);
        $this->assertDatabaseHas('ecommerce_domains', ['id' => 'historical-domain', 'status' => 'REVOKED']);
        $this->assertDatabaseHas('maximus_installations', ['id' => 'historical-installation', 'status' => 'REVOKED']);
        $this->assertDatabaseMissing('auth_sessions', ['user_id' => $oldUser->id]);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $oldToken)
            ->getJson('/api/app-state/bootstrap')
            ->assertUnauthorized();

        $this->postJson('/api/company-requests', $this->requestPayload())->assertCreated();
        $newCompany = Company::query()
            ->where('email', 'reuse@atelier.test')
            ->whereNull('deleted_at')
            ->firstOrFail();
        $this->assertNotSame($oldCompany->id, $newCompany->id);
        $this->approve($maximusToken, $newCompany->id)->assertOk();
        $newUser = AuthUser::query()->where('company_id', $newCompany->id)->firstOrFail();
        $this->assertSame('reuse@atelier.test', $newUser->email);
        $this->assertNotSame($oldUser->id, $newUser->id);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $oldToken)
            ->getJson('/api/app-state/bootstrap')
            ->assertUnauthorized();
        $newBootstrap = $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($newUser))
            ->getJson('/api/app-state/bootstrap')
            ->assertOk();
        $this->assertFalse(
            collect($newBootstrap->json('data.companies'))->contains('id', $oldCompany->id),
        );

        $this->postJson('/api/company-requests', $this->requestPayload())->assertStatus(409);
    }

    public function test_approval_retires_a_legacy_archived_owner_but_not_a_suspended_active_owner(): void
    {
        $legacyCompany = $this->archivedCompany('legacy-company', 'reuse@atelier.test');
        $legacyUser = $this->authUser('legacy-owner', 'reuse@atelier.test', $legacyCompany->id, 'SUSPENDU');
        AuthSession::query()->create([
            'id' => 'legacy-stale-session',
            'user_id' => $legacyUser->id,
            'token_hash' => hash('sha256', 'legacy-stale-token'),
            'expires_at' => now()->addHour(),
        ]);

        $maximusToken = $this->issueMaximusSession();
        $this->postJson('/api/company-requests', $this->requestPayload())->assertCreated();
        $companyId = Company::query()->whereNull('deleted_at')->where('email', 'reuse@atelier.test')->value('id');
        $this->approve($maximusToken, (string) $companyId)->assertOk();
        $this->assertSame(
            'archived+'.hash('sha256', $legacyUser->id).'@identity.invalid',
            $legacyUser->fresh()->email,
        );
        $this->assertDatabaseMissing('auth_sessions', ['id' => 'legacy-stale-session']);

        $activeCompany = Company::query()->create([
            'id' => 'active-company',
            'name' => 'Entreprise active',
            'manager' => 'Responsable',
            'email' => 'active-company@trace.test',
            'status' => 'ACTIF',
            'requested_modules' => [],
        ]);
        $suspendedUser = $this->authUser('active-suspended-owner', 'blocked-login@atelier.test', $activeCompany->id, 'SUSPENDU');
        $payload = [...$this->requestPayload(), 'email' => 'blocked-login@atelier.test'];
        $this->postJson('/api/company-requests', $payload)->assertCreated();
        $blockedCompanyId = Company::query()->where('email', 'blocked-login@atelier.test')->value('id');
        $this->approve($maximusToken, (string) $blockedCompanyId)->assertStatus(409);
        $this->assertSame('blocked-login@atelier.test', $suspendedUser->fresh()->email);
        $this->assertDatabaseHas('company_requests', ['company_id' => $blockedCompanyId, 'status' => 'PENDING']);
    }

    public function test_failed_approval_rolls_back_legacy_identity_retirement(): void
    {
        $legacyCompany = $this->archivedCompany('rollback-archive', 'reuse@atelier.test');
        $legacyUser = $this->authUser('rollback-owner', 'reuse@atelier.test', $legacyCompany->id, 'SUSPENDU');
        AuthSession::query()->create([
            'id' => 'rollback-stale-session',
            'user_id' => $legacyUser->id,
            'token_hash' => hash('sha256', 'rollback-stale-token'),
            'expires_at' => now()->addHour(),
        ]);

        $maximusToken = $this->issueMaximusSession();
        $this->postJson('/api/company-requests', $this->requestPayload())->assertCreated();
        $companyId = (string) Company::query()->whereNull('deleted_at')->where('email', 'reuse@atelier.test')->value('id');
        DB::table('maximus_app_states')->updateOrInsert(
            ['scope' => 'workspace'],
            [
                'company_id' => null,
                'payload' => json_encode([
                    'moduleStatuses' => ['commerce' => 'INACTIF'],
                ], JSON_THROW_ON_ERROR),
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $this->approve($maximusToken, $companyId)->assertStatus(409);

        $this->assertSame('reuse@atelier.test', $legacyUser->fresh()->email);
        $this->assertDatabaseHas('auth_sessions', ['id' => 'rollback-stale-session']);
        $this->assertDatabaseHas('company_requests', ['company_id' => $companyId, 'status' => 'PENDING']);
        $this->assertDatabaseHas('companies', ['id' => $companyId, 'status' => 'EN ATTENTE']);
    }

    public function test_ensure_active_never_resurrects_an_archived_company(): void
    {
        $company = $this->archivedCompany('cannot-resurrect', 'cannot-resurrect@trace.test');

        $this->expectException(\LogicException::class);
        CompanyRegistry::ensureActive($company->id, 'Nouveau nom');
    }

    private function approve(string $token, string $companyId)
    {
        return $this->asMaximus($token)->postJson('/api/company-requests/'.$companyId.'/approve');
    }

    private function asMaximus(string $token): static
    {
        return $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, $token);
    }

    private function issueMaximusSession(): string
    {
        $user = AuthUser::query()->create([
            'id' => 'lifecycle-maximus-admin',
            'email' => 'lifecycle-admin@maximus.test',
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);

        return MaximusAuth::issueSession($user);
    }

    private function archivedCompany(string $id, string $email): Company
    {
        return Company::query()->create([
            'id' => $id,
            'name' => 'Entreprise archivée',
            'manager' => 'Responsable historique',
            'email' => $email,
            'status' => 'ARCHIVÉ',
            'requested_modules' => ['commerce'],
            'deleted_at' => now(),
        ]);
    }

    private function authUser(string $id, string $email, string $companyId, string $status): AuthUser
    {
        return AuthUser::query()->create([
            'id' => $id,
            'email' => $email,
            'password_hash' => MaximusPassword::hash('Historical2026!'),
            'display_name' => 'Compte historique',
            'role' => 'company_admin',
            'company_id' => $companyId,
            'sector_ids' => [],
            'status' => $status,
        ]);
    }

    private function requestPayload(): array
    {
        return [
            'name' => 'Atelier Réutilisable',
            'manager' => 'Responsable Atelier',
            'email' => 'reuse@atelier.test',
            'password' => 'Secret2026!',
            'country' => 'Sénégal',
            'sector' => 'Production',
            'requestedModules' => ['commerce'],
            'requestedModuleFeatures' => ['commerce' => ['sales']],
            'requestedModulePermissions' => ['commerce' => ['sales' => ['voir']]],
        ];
    }
}