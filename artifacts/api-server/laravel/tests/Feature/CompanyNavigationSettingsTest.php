<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CompanyNavigationSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Company::query()->create([
            'id' => 'navigation-company',
            'name' => 'Navigation QA',
            'manager' => 'Navigation Manager',
            'email' => 'navigation@example.test',
            'status' => 'ACTIF',
        ]);
        Company::query()->create([
            'id' => 'other-navigation-company',
            'name' => 'Other Navigation QA',
            'manager' => 'Other Manager',
            'email' => 'other-navigation@example.test',
            'status' => 'ACTIF',
        ]);
    }

    public function test_defaults_keep_features_in_menu_and_company_customization_disabled(): void
    {
        $this->signIn('company_admin');
        $this->getJson($this->endpoint())->assertOk()
            ->assertJsonPath('mode', 'menu')
            ->assertJsonPath('customAllowed', false);
        $this->patchJson($this->endpoint(), ['mode' => 'horizontal'])->assertForbidden();
    }

    public function test_maximus_can_choose_mode_without_authorizing_company_edits(): void
    {
        $this->signIn('maximus_admin');
        $this->patchJson($this->endpoint(), ['mode' => 'horizontal'])->assertOk()
            ->assertJsonPath('mode', 'horizontal')
            ->assertJsonPath('customAllowed', false);
        $this->assertDatabaseHas('companies', [
            'id' => 'navigation-company',
            'module_navigation_mode' => 'horizontal',
            'navigation_custom_allowed' => false,
        ]);
    }

    public function test_authorized_company_admin_can_switch_and_revocation_blocks_future_changes(): void
    {
        $this->signIn('maximus_admin');
        $this->patchJson($this->endpoint(), ['customAllowed' => true])->assertOk();
        $this->signIn('company_admin');
        $this->patchJson($this->endpoint(), ['mode' => 'horizontal'])->assertOk();
        $this->patchJson($this->endpoint(), ['mode' => 'menu'])->assertOk();
        $this->patchJson($this->endpoint(), ['mode' => 'horizontal'])->assertOk();
        $this->signIn('maximus_admin');
        $this->patchJson($this->endpoint(), ['customAllowed' => false])->assertOk()
            ->assertJsonPath('mode', 'horizontal');
        $this->signIn('company_admin');
        $this->patchJson($this->endpoint(), ['mode' => 'menu'])->assertForbidden();
        $this->getJson($this->endpoint())->assertJsonPath('customAllowed', false)
            ->assertJsonPath('mode', 'horizontal');
    }

    public function test_company_admin_cannot_grant_or_revoke_its_own_authorization(): void
    {
        $this->signIn('company_admin');
        $this->patchJson($this->endpoint(), ['mode' => 'horizontal', 'customAllowed' => true])->assertForbidden();
        Company::query()->findOrFail('navigation-company')->update(['navigation_custom_allowed' => true]);
        $this->patchJson($this->endpoint(), ['customAllowed' => false])->assertForbidden();
    }

    public function test_maximus_can_issue_a_new_directive_even_when_reasserting_the_same_mode(): void
    {
        $this->signIn('maximus_admin');
        $this->patchJson($this->endpoint(), ['mode' => 'menu'])->assertOk();
        $this->assertSame(1, Company::query()->findOrFail('navigation-company')->navigation_revision);
        $this->patchJson($this->endpoint(), ['mode' => 'menu'])->assertOk();
        $this->assertSame(2, Company::query()->findOrFail('navigation-company')->navigation_revision);
    }

    public function test_dedicated_company_can_choose_a_local_mode_without_advancing_central_revision(): void
    {
        config([
            'maximus.deployment_mode' => 'dedicated',
            'maximus.installation_company_id' => 'navigation-company',
        ]);
        Company::query()->findOrFail('navigation-company')->update([
            'navigation_custom_allowed' => true,
            'navigation_revision' => 3,
        ]);
        $this->signIn('company_admin');
        $this->getJson($this->endpoint())->assertOk();
        $this->patchJson($this->endpoint(), ['mode' => 'horizontal'])->assertOk()
            ->assertJsonPath('mode', 'horizontal');
        $this->assertSame(3, Company::query()->findOrFail('navigation-company')->navigation_revision);
        $this->patchJson($this->endpoint(), ['customAllowed' => true])->assertForbidden();
    }

    public function test_company_admin_cannot_read_or_modify_another_tenant(): void
    {
        $this->signIn('company_admin');
        $this->getJson('/api/companies/other-navigation-company/navigation-settings')->assertForbidden();
        $this->patchJson('/api/companies/other-navigation-company/navigation-settings', [
            'mode' => 'horizontal',
        ])->assertForbidden();
    }

    public function test_staff_cannot_modify_navigation_even_when_the_company_has_authorization(): void
    {
        Company::query()->findOrFail('navigation-company')->update(['navigation_custom_allowed' => true]);
        foreach (['employee', 'sector_manager'] as $role) {
            $this->signIn($role);
            $this->getJson($this->endpoint())->assertForbidden();
            $this->patchJson($this->endpoint(), ['mode' => 'horizontal'])->assertForbidden();
        }
    }

    public function test_unknown_modes_empty_requests_and_invalid_grants_are_rejected(): void
    {
        $this->signIn('maximus_admin');
        foreach ([['mode' => 'unknown'], ['mode' => null], ['mode' => []], ['customAllowed' => 'yes'], []] as $input) {
            $this->patchJson($this->endpoint(), $input)->assertUnprocessable();
        }
        $this->getJson($this->endpoint())->assertJsonPath('mode', 'menu')
            ->assertJsonPath('customAllowed', false);
    }

    public function test_bootstrap_uses_registry_values_not_forged_shared_state_metadata(): void
    {
        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace',
            'payload' => json_encode(['companies' => [[
                'id' => 'navigation-company',
                'name' => 'Navigation QA',
                'moduleNavigationMode' => 'horizontal',
                'navigationCustomAllowed' => true,
            ]]], JSON_THROW_ON_ERROR),
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->signIn('company_admin');
        $this->getJson('/api/app-state/bootstrap')->assertOk()
            ->assertJsonPath('data.companies.0.moduleNavigationMode', 'menu')
            ->assertJsonPath('data.companies.0.navigationCustomAllowed', false);
        $this->patchJson($this->endpoint(), ['mode' => 'horizontal'])->assertForbidden();
    }

    public function test_bootstrap_exports_new_settings_when_company_was_missing_from_state(): void
    {
        Company::query()->findOrFail('navigation-company')->update([
            'module_navigation_mode' => 'horizontal',
            'navigation_custom_allowed' => true,
        ]);
        $this->signIn('company_admin');
        $this->getJson('/api/app-state/bootstrap')->assertOk()
            ->assertJsonPath('data.companies.0.moduleNavigationMode', 'horizontal')
            ->assertJsonPath('data.companies.0.navigationCustomAllowed', true);
    }

    public function test_deleted_and_missing_companies_cannot_be_configured(): void
    {
        $this->signIn('maximus_admin');
        Company::query()->findOrFail('navigation-company')->update(['deleted_at' => now()]);
        $this->getJson($this->endpoint())->assertNotFound();
        $this->patchJson($this->endpoint(), ['mode' => 'horizontal'])->assertNotFound();
        $this->getJson('/api/companies/missing/navigation-settings')->assertNotFound();
    }

    private function endpoint(): string
    {
        return '/api/companies/navigation-company/navigation-settings';
    }

    private function signIn(string $role): void
    {
        $user = AuthUser::query()->create([
            'id' => 'navigation-user-'.uniqid(),
            'email' => uniqid('navigation-', true).'@example.test',
            'display_name' => 'Navigation QA',
            'password_hash' => 'unused-test-hash',
            'role' => $role,
            'company_id' => $role === 'maximus_admin' ? null : 'navigation-company',
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);
        $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}
