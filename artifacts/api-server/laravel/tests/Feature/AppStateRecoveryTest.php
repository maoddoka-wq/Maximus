<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AppStateRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_catalog_exposes_only_the_published_catalog(): void
    {
        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace',
            'payload' => json_encode([
                'catalogVersion' => 4,
                'sectorPresets' => [[
                    'id' => 'batiment',
                    'name' => 'Bâtiment',
                    'moduleIds' => ['commerce'],
                    'modulePackIds' => ['commerce' => ['commerce-gestion']],
                ]],
                'moduleOverrides' => ['commerce' => ['name' => 'Ventes']],
                'catalogDraft' => [
                    'sectorPresets' => [['id' => 'draft', 'name' => 'Brouillon']],
                ],
                'companies' => [['id' => 'private-company', 'name' => 'Ne pas exposer']],
            ], JSON_THROW_ON_ERROR),
            'version' => 8,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('/api/registration-catalog')
            ->assertOk()
            ->assertJsonPath('version', 8)
            ->assertJsonPath('catalog.catalogVersion', 4)
            ->assertJsonPath('catalog.sectorPresets.0.name', 'Bâtiment')
            ->assertJsonPath('catalog.moduleOverrides.commerce.name', 'Ventes')
            ->assertJsonMissingPath('catalog.catalogDraft')
            ->assertJsonMissingPath('catalog.companies');
    }

    public function test_saved_and_published_sector_becomes_available_to_public_registration_catalog(): void
    {
        $admin = AuthUser::query()->create([
            'id' => 'catalog-publication-admin',
            'email' => 'catalog.publication.admin@example.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);
        $request = $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($admin));
        $sector = [
            'id' => 'construction',
            'name' => 'Construction',
            'moduleIds' => ['ecommerce'],
            'modulePackIds' => ['ecommerce' => ['ecommerce-catalogue']],
        ];

        $request
            ->putJson('/api/app-state', [
                'version' => 0,
                'data' => [
                    'catalogVersion' => 1,
                    'sectorPresets' => [],
                    'catalogDraft' => [
                        'catalogVersion' => 1,
                        'sectorPresets' => [$sector],
                        'moduleOverrides' => [],
                        'moduleStatuses' => [],
                        'removedModules' => [],
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('version', 1);

        $request
            ->getJson('/api/registration-catalog')
            ->assertOk()
            ->assertJsonCount(0, 'catalog.sectorPresets');

        $request
            ->putJson('/api/app-state', [
                'version' => 1,
                'data' => [
                    'catalogVersion' => 2,
                    'sectorPresets' => [$sector],
                    'moduleOverrides' => [],
                    'moduleStatuses' => [],
                    'removedModules' => [],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('version', 2);

        $this->getJson('/api/registration-catalog')
            ->assertOk()
            ->assertJsonPath('catalog.catalogVersion', 2)
            ->assertJsonPath('catalog.sectorPresets.0.id', 'construction')
            ->assertJsonPath('catalog.sectorPresets.0.name', 'Construction');
    }

    public function test_bootstrap_recovers_company_and_employee_modules_when_state_is_missing(): void
    {
        ModuleCatalog::ensureCompanyAccess('recovery-company', ['stocks']);
        $user = AuthUser::query()->create([
            'id' => 'recovery-employee',
            'email' => 'recovery.employee@example.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Employé Récupéré',
            'role' => 'employee',
            'company_id' => 'recovery-company',
            'employee_id' => 'recovery-employee',
            'sector_ids' => ['recovery-unit'],
            'permissions' => [
                'stocks' => ['voir'],
                'stocks:products' => ['voir'],
            ],
            'status' => 'ACTIF',
        ]);
        $admin = AuthUser::query()->create([
            'id' => 'recovery-admin',
            'email' => 'recovery.admin@example.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Admin Récupérée',
            'role' => 'company_admin',
            'company_id' => 'recovery-company',
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);

        $request = $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user))
        ;
        $bootstrap = $request
            ->getJson('/api/app-state/bootstrap')
            ->assertOk()
            ->assertJsonPath('version', 1)
            ->assertJsonPath('data.companies.0.id', 'recovery-company')
            ->assertJsonPath('data.companies.0.allowedModules.0', 'stocks')
            ->assertJsonPath('data.employees.0.id', 'recovery-employee')
            ->assertJsonPath('data.roles.0.modulePermissions.stocks.0', 'voir');

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($admin))
            ->putJson('/api/app-state', [
                'version' => $bootstrap->json('version'),
                'data' => [
                    'companies' => [[
                        'id' => 'recovery-company',
                        'name' => 'Entreprise récupérée',
                    ]],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('version', 2);

        $this->assertDatabaseHas('maximus_app_states', ['scope' => 'workspace']);
        $this->assertNotNull(DB::table('maximus_app_states')->where('scope', 'workspace')->value('payload'));
    }

    public function test_maximus_bootstrap_discards_records_for_companies_absent_from_the_registry(): void
    {
        Company::query()->create([
            'id' => 'active-company',
            'name' => 'Entreprise active',
            'manager' => 'Responsable',
            'email' => 'active@example.test',
            'status' => 'ACTIF',
        ]);
        Company::query()->create([
            'id' => 'archived-company',
            'name' => 'Entreprise archivée',
            'manager' => 'Ancienne responsable',
            'email' => 'archived@example.test',
            'status' => 'ARCHIVÉ',
            'deleted_at' => now(),
        ]);
        $admin = AuthUser::query()->create([
            'id' => 'registry-admin',
            'email' => 'registry.admin@example.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);

        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace',
            'payload' => json_encode([
                'companies' => [
                    ['id' => 'active-company', 'name' => 'Entreprise active'],
                    ['id' => 'archived-company', 'name' => 'Entreprise archivée'],
                ],
                'employees' => [
                    ['id' => 'active-employee', 'companyId' => 'active-company'],
                    ['id' => 'archived-employee', 'companyId' => 'archived-company'],
                ],
            ], JSON_THROW_ON_ERROR),
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($admin))
            ->getJson('/api/app-state/bootstrap')
            ->assertOk();

        $this->assertSame(['active-company'], collect($response->json('data.companies'))->pluck('id')->all());
        $this->assertSame(['active-employee'], collect($response->json('data.employees'))->pluck('id')->all());
    }

    public function test_bootstrap_refreshes_company_branding_from_the_registry_over_stale_shared_state(): void
    {
        $company = Company::query()->create([
            'id' => 'branded-company',
            'name' => 'Entreprise avec logo',
            'manager' => 'Responsable',
            'email' => 'branded@example.test',
            'status' => 'ACTIF',
            'profile_photo' => '/api/company-profile-images/branded-company/current.png',
            'profile_photo_data' => base64_encode('persisted logo'),
            'profile_photo_mime' => 'image/png',
            'primary_color' => '#123456',
            'accent_color' => '#ABCDEF',
            'sidebar_color' => '#101820',
        ]);
        $user = AuthUser::query()->create([
            'id' => 'branded-company-admin',
            'email' => $company->email,
            'password_hash' => 'not-used-in-this-test',
            'display_name' => $company->manager,
            'role' => 'company_admin',
            'company_id' => $company->id,
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);

        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace',
            'payload' => json_encode([
                'companies' => [[
                    'id' => $company->id,
                    'name' => $company->name,
                    'profilePhoto' => null,
                    'primaryColor' => null,
                    'accentColor' => null,
                    'sidebarColor' => null,
                ]],
            ], JSON_THROW_ON_ERROR),
            'version' => 7,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user))
            ->getJson('/api/app-state/bootstrap')
            ->assertOk()
            ->assertJsonPath('version', 7)
            ->assertJsonPath('data.companies.0.profilePhoto', $company->profile_photo)
            ->assertJsonPath('data.companies.0.primaryColor', '#123456')
            ->assertJsonPath('data.companies.0.accentColor', '#ABCDEF')
            ->assertJsonPath('data.companies.0.sidebarColor', '#101820');
    }

    public function test_maximus_bootstrap_does_not_publish_pending_requests_as_companies(): void
    {
        Company::query()->create([
            'id' => 'pending-company',
            'name' => 'Demande en attente',
            'manager' => 'Responsable',
            'email' => 'pending@example.test',
            'status' => 'EN ATTENTE',
        ]);
        Company::query()->create([
            'id' => 'active-company',
            'name' => 'Entreprise active',
            'manager' => 'Responsable',
            'email' => 'active@example.test',
            'status' => 'ACTIF',
        ]);
        $admin = AuthUser::query()->create([
            'id' => 'pending-filter-admin',
            'email' => 'pending.filter.admin@example.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);

        $response = $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($admin))
            ->getJson('/api/app-state/bootstrap')
            ->assertOk();

        $this->assertSame(['active-company'], collect($response->json('data.companies'))->pluck('id')->all());
    }
}