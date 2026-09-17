<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class InstallationContextTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'maximus.deployment_mode' => 'dedicated',
            'maximus.installation_company_id' => 'dedicated-company',
            'maximus.installation_login_slug' => 'dedicated-company',
        ]);
        $this->createCompany();
    }

    public function test_dedicated_profile_exposes_only_the_configured_company(): void
    {
        $this->getJson('/api/installation')
            ->assertOk()
            ->assertJsonPath('mode', 'dedicated')
            ->assertJsonPath('companyOnly', true)
            ->assertJsonPath('ready', true)
            ->assertJsonPath('adminLoginEnabled', false)
            ->assertJsonPath('registrationEnabled', false)
            ->assertJsonPath('company.id', 'dedicated-company')
            ->assertJsonPath('company.name', 'Entreprise dédiée');
    }

    public function test_dedicated_login_accepts_the_company_admin_but_not_a_global_admin(): void
    {
        AuthUser::query()->create($this->userRow(
            'dedicated-admin',
            'admin@dedicated.test',
            'company_admin',
            'dedicated-company',
        ));
        AuthUser::query()->create($this->userRow(
            'global-admin',
            'global@maximus.test',
            'maximus_admin',
            null,
        ));

        $this->postJson('/api/auth/login', [
            'email' => 'admin@dedicated.test',
            'password' => 'Admin123!',
        ])->assertOk()->assertJsonPath('user.role', 'company_admin');

        $this->postJson('/api/auth/login', [
            'email' => 'global@maximus.test',
            'password' => 'Admin123!',
        ])->assertUnauthorized();
    }

    public function test_dedicated_installation_refuses_central_routes_even_with_a_company_session(): void
    {
        $user = AuthUser::query()->create($this->userRow(
            'dedicated-admin',
            'admin@dedicated.test',
            'company_admin',
            'dedicated-company',
        ));
        $token = MaximusAuth::issueSession($user);

        $this->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->getJson('/api/platform-settings/public-registration')
            ->assertNotFound()
            ->assertJsonPath('code', 'CENTRAL_INSTALLATION_ONLY');

        $this->getJson('/api/registration-catalog')
            ->assertNotFound()
            ->assertJsonPath('code', 'CENTRAL_INSTALLATION_ONLY');
    }

    public function test_dedicated_public_routes_refuse_other_company_stores_and_assets(): void
    {
        DB::table('ecommerce_stores')->insert([
            [
                'id' => 'store-dedicated',
                'company_id' => 'dedicated-company',
                'slug' => 'dedicated-store',
                'name' => 'Boutique dédiée',
                'description' => '',
                'status' => 'PUBLISHED',
                'currency' => 'XOF',
                'primary_color' => '#D69E2E',
                'accent_color' => '#172033',
                'logo_url' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 'store-other',
                'company_id' => 'other-company',
                'slug' => 'other-store',
                'name' => 'Boutique autre entreprise',
                'description' => '',
                'status' => 'PUBLISHED',
                'currency' => 'XOF',
                'primary_color' => '#D69E2E',
                'accent_color' => '#172033',
                'logo_url' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $this->getJson('/api/shop/other-store')
            ->assertNotFound()
            ->assertJsonPath('code', 'INSTALLATION_COMPANY_ONLY');
        $this->getJson('/api/shop/other-store/transport/settings')
            ->assertNotFound()
            ->assertJsonPath('code', 'INSTALLATION_COMPANY_ONLY');
        $this->getJson('/api/product-images/other-company/private.png')
            ->assertNotFound()
            ->assertJsonPath('code', 'INSTALLATION_COMPANY_ONLY');
        $this->getJson('/api/company-profile-images/other-company/profile.png')
            ->assertNotFound()
            ->assertJsonPath('code', 'INSTALLATION_COMPANY_ONLY');
    }

    private function createCompany(): void
    {
        Company::query()->create([
            'id' => 'dedicated-company',
            'name' => 'Entreprise dédiée',
            'manager' => 'Direction dédiée',
            'email' => 'contact@dedicated.test',
            'phone' => '',
            'country' => 'Sénégal',
            'sector' => 'Commerce',
            'status' => 'ACTIF',
            'requested_modules' => ['commerce'],
            'requested_module_pack_ids' => [],
            'requested_module_features' => [],
            'requested_module_permissions' => [],
            'login_custom_allowed' => false,
            'login_mode' => 'MAXIMUS',
            'login_slug' => 'dedicated-company',
            'deleted_at' => null,
        ]);
    }

    /** @return array<string, mixed> */
    private function userRow(string $id, string $email, string $role, ?string $companyId): array
    {
        return [
            'id' => $id,
            'email' => $email,
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => $role === 'maximus_admin' ? 'Administration MAXIMUS' : 'Administrateur entreprise',
            'phone' => '',
            'role' => $role,
            'company_id' => $companyId,
            'employee_id' => null,
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ];
    }
}