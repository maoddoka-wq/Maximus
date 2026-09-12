<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicRegistrationSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_is_enabled_by_default_and_catalog_exposes_the_state(): void
    {
        $this->getJson('/api/registration-catalog')
            ->assertOk()
            ->assertJsonPath('catalog.registrationEnabled', true);
    }

    public function test_only_maximus_can_change_public_registration_and_the_setting_persists(): void
    {
        $this->getJson('/api/platform-settings/public-registration')->assertUnauthorized();
        $this->putJson('/api/platform-settings/public-registration', ['enabled' => false])->assertUnauthorized();

        $this->asMaximusAdmin()
            ->getJson('/api/platform-settings/public-registration')
            ->assertOk()
            ->assertJsonPath('enabled', true);

        $this->putJson('/api/platform-settings/public-registration', ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('enabled', false);

        $this->assertDatabaseHas('maximus_platform_settings', [
            'key' => 'public_registration_enabled',
        ]);

        $this->getJson('/api/registration-catalog')
            ->assertOk()
            ->assertJsonPath('catalog.registrationEnabled', false);
    }

    public function test_public_company_requests_are_rejected_when_registration_is_disabled(): void
    {
        $this->asMaximusAdmin()
            ->putJson('/api/platform-settings/public-registration', ['enabled' => false])
            ->assertOk();

        $this->postJson('/api/company-requests', [
            'name' => 'Entreprise fermée',
            'manager' => 'Responsable',
            'email' => 'fermee@example.test',
            'password' => 'Secret2026!',
            'requestedModules' => ['commerce'],
        ])
            ->assertForbidden()
            ->assertJsonPath('code', 'PUBLIC_REGISTRATION_DISABLED');

        $this->assertDatabaseMissing('companies', ['email' => 'fermee@example.test']);
    }

    public function test_onboarding_drafts_are_rejected_when_registration_is_disabled(): void
    {
        $this->asMaximusAdmin()
            ->putJson('/api/platform-settings/public-registration', ['enabled' => false])
            ->assertOk();

        $this->postJson('/api/onboarding/drafts', [
            'description' => 'Nous sommes une entreprise dont la demande doit rester bloquée.',
        ])
            ->assertForbidden()
            ->assertJsonPath('code', 'PUBLIC_REGISTRATION_DISABLED');

        $this->assertDatabaseCount('onboarding_drafts', 0);
    }

    private function asMaximusAdmin(): self
    {
        $user = AuthUser::query()->updateOrCreate(['id' => 'registration-maximus-admin'], [
            'id' => 'registration-maximus-admin',
            'email' => 'registration-admin@maximus.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'company_id' => null,
            'employee_id' => null,
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}