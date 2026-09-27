<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicSiteAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_company_admin_can_manage_public_identity_without_ecommerce_and_maximus_controls_access_separately(): void
    {
        $company = $this->createCompany('public-site-acme');
        $companyAdmin = $this->createActor('public-site-company-admin', 'company_admin', $company->id);
        $this->authenticate($companyAdmin)
            ->getJson('/api/company-public-site?companyId='.$company->id)
            ->assertOk()
            ->assertJsonPath('store.status', 'DRAFT');

        $this->patchJson('/api/company-public-site?companyId='.$company->id, [
            'name' => 'Atelier Acme',
            'slug' => 'atelier-acme-public',
            'status' => 'PUBLISHED',
        ])
            ->assertOk()
            ->assertJsonPath('store.name', 'Atelier Acme')
            ->assertJsonPath('store.slug', 'atelier-acme-public')
            ->assertJsonPath('store.status', 'PUBLISHED');

        $this->assertDatabaseMissing('maximus_company_modules', [
            'company_id' => $company->id,
            'module_id' => 'ecommerce',
        ]);
        $this->getJson('/api/shop/atelier-acme-public')->assertNotFound();

        $maximusAdmin = $this->createActor('public-site-maximus-admin', 'maximus_admin', null);
        $this->authenticate($maximusAdmin)
            ->getJson('/api/companies/'.$company->id.'/public-site-access')
            ->assertOk()
            ->assertJsonPath('enabled', false);

        $this->patchJson('/api/companies/'.$company->id.'/public-site-access', ['enabled' => true])
            ->assertOk()
            ->assertJsonPath('enabled', true);
        $this->assertDatabaseHas('company_public_site_access', [
            'company_id' => $company->id,
            'enabled' => true,
        ]);
        $this->getJson('/api/shop/atelier-acme-public')->assertOk();

        $this->patchJson('/api/companies/'.$company->id.'/public-site-access', ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('enabled', false);
        $this->getJson('/api/shop/atelier-acme-public')->assertNotFound();
    }

    public function test_company_admin_cannot_grant_maximus_public_site_access(): void
    {
        $company = $this->createCompany('public-site-locked');
        $companyAdmin = $this->createActor('public-site-locked-admin', 'company_admin', $company->id);

        $this->authenticate($companyAdmin)
            ->patchJson('/api/companies/'.$company->id.'/public-site-access', ['enabled' => true])
            ->assertForbidden();
    }

    private function createCompany(string $id): Company
    {
        return Company::query()->create([
            'id' => $id,
            'name' => 'Entreprise '.str_replace('-', ' ', $id),
            'manager' => 'Responsable',
            'email' => $id.'@maximus.test',
            'status' => 'ACTIF',
            'requested_modules' => [],
        ]);
    }

    private function createActor(string $id, string $role, ?string $companyId): AuthUser
    {
        return AuthUser::query()->create([
            'id' => $id,
            'email' => $id.'@maximus.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => $role === 'maximus_admin' ? 'Administration MAXIMUS' : 'Administrateur entreprise',
            'role' => $role,
            'company_id' => $companyId,
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);
    }

    private function authenticate(AuthUser $user): self
    {
        return $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}