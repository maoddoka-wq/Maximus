<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
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
            ->assertJsonPath('store.status', 'DRAFT')
            ->assertJsonPath('store.homepageEnabled', true);

        $this->patchJson('/api/company-public-site?companyId='.$company->id, [
            'name' => 'Atelier Acme',
            'slug' => 'atelier-acme-public',
            'status' => 'PUBLISHED',
            'description' => 'Une présentation indépendante du module E-commerce.',
            'primaryColor' => '#123456',
            'accentColor' => '#ABCDEF',
            'homepageEnabled' => false,
            'bannerEnabled' => false,
        ])
            ->assertOk()
            ->assertJsonPath('store.name', 'Atelier Acme')
            ->assertJsonPath('store.slug', 'atelier-acme-public')
            ->assertJsonPath('store.status', 'PUBLISHED')
            ->assertJsonPath('store.description', 'Une présentation indépendante du module E-commerce.')
            ->assertJsonPath('store.primaryColor', '#123456')
            ->assertJsonPath('store.accentColor', '#ABCDEF')
            ->assertJsonPath('store.homepageEnabled', true)
            ->assertJsonPath('store.bannerEnabled', true);

        $this->assertDatabaseMissing('maximus_company_modules', [
            'company_id' => $company->id,
            'module_id' => 'ecommerce',
        ]);
        $this->getJson('/api/shop/atelier-acme-public')->assertNotFound();

        $maximusAdmin = $this->createActor('public-site-maximus-admin', 'maximus_admin', null);
        $this->authenticate($maximusAdmin)
            ->getJson('/api/companies/'.$company->id.'/public-site-access')
            ->assertOk()
            ->assertJsonPath('enabled', false)
            ->assertJsonPath('homepageEnabled', true)
            ->assertJsonPath('bannerEnabled', true);

        $this->patchJson('/api/companies/'.$company->id.'/public-site-access', [
            'enabled' => true,
            'homepageEnabled' => false,
            'bannerEnabled' => true,
        ])
            ->assertOk()
            ->assertJsonPath('enabled', true)
            ->assertJsonPath('homepageEnabled', false)
            ->assertJsonPath('bannerEnabled', true);
        $this->assertDatabaseHas('company_public_site_access', [
            'company_id' => $company->id,
            'enabled' => true,
            'homepage_enabled' => false,
            'banner_enabled' => true,
        ]);
        $this->getJson('/api/shop/atelier-acme-public')->assertOk();
        $this->getJson('/api/shop/atelier-acme-public')
            ->assertOk()
            ->assertJsonPath('store.homepageEnabled', false)
            ->assertJsonPath('store.bannerEnabled', true)
            ->assertJsonPath('store.primaryColor', '#123456');

        $this->patchJson('/api/companies/'.$company->id.'/public-site-access', ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('enabled', false);
        $this->getJson('/api/shop/atelier-acme-public')->assertNotFound();
    }

    public function test_company_admin_can_manage_homepage_banner_without_ecommerce(): void
    {
        $company = $this->createCompany('public-site-banner');
        $companyAdmin = $this->createActor('public-site-banner-admin', 'company_admin', $company->id);
        $request = $this->authenticate($companyAdmin);

        $uploaded = $request->post('/api/company-public-site/hero-images?companyId='.$company->id, [
            'images' => [
                UploadedFile::fake()->image('homepage-banner.jpg'),
            ],
        ])->assertOk()
            ->assertJsonCount(1, 'store.heroImages');

        $uploadedStore = $uploaded->json('store');
        $publicSlug = 'public-site-banner-shop';
        $request->patchJson('/api/company-public-site?companyId='.$company->id, [
            'name' => $uploadedStore['name'],
            'slug' => $publicSlug,
            'status' => 'PUBLISHED',
            'description' => $uploadedStore['description'],
            'primaryColor' => $uploadedStore['primaryColor'],
            'accentColor' => $uploadedStore['accentColor'],
        ])->assertOk();

        $maximusAdmin = $this->createActor('public-site-banner-maximus', 'maximus_admin', null);
        $this->authenticate($maximusAdmin)
            ->patchJson('/api/companies/'.$company->id.'/public-site-access', [
                'enabled' => true,
                'homepageEnabled' => true,
                'bannerEnabled' => false,
            ])
            ->assertOk()
            ->assertJsonPath('homepageEnabled', true)
            ->assertJsonPath('bannerEnabled', false);

        $heroUrl = $uploaded->json('store.heroImages.0');
        $this->getJson('/api/shop/'.$publicSlug)
            ->assertOk()
            ->assertJsonPath('store.homepageEnabled', true)
            ->assertJsonPath('store.bannerEnabled', false)
            ->assertJsonPath('store.heroImages.0', $heroUrl);
        $this->get($heroUrl)->assertOk();
        $this->authenticate($companyAdmin)
            ->getJson('/api/company-public-site?companyId='.$company->id)
            ->assertOk()
            ->assertJsonPath('store.heroImages.0', $heroUrl);

        $this->authenticate($maximusAdmin)
            ->patchJson('/api/companies/'.$company->id.'/public-site-access', ['bannerEnabled' => true])
            ->assertOk()
            ->assertJsonPath('bannerEnabled', true);
        $this->getJson('/api/shop/'.$publicSlug)
            ->assertOk()
            ->assertJsonPath('store.bannerEnabled', true)
            ->assertJsonPath('store.heroImages.0', $heroUrl);

        $imageId = basename($uploaded->json('store.heroImages.0'));
        $this->authenticate($companyAdmin)
            ->deleteJson('/api/company-public-site/hero-images/'.$imageId.'?companyId='.$company->id)
            ->assertOk()
            ->assertJsonCount(0, 'store.heroImages');

        $this->assertDatabaseMissing('maximus_company_modules', [
            'company_id' => $company->id,
            'module_id' => 'ecommerce',
        ]);
    }

    public function test_company_admin_cannot_grant_maximus_public_site_access(): void
    {
        $company = $this->createCompany('public-site-locked');
        $companyAdmin = $this->createActor('public-site-locked-admin', 'company_admin', $company->id);

        $this->authenticate($companyAdmin)
            ->patchJson('/api/companies/'.$company->id.'/public-site-access', ['enabled' => true])
            ->assertForbidden();
    }

    public function test_company_admin_can_manage_public_site_domains_without_ecommerce(): void
    {
        $company = $this->createCompany('public-site-domain-acme');
        $companyAdmin = $this->createActor('public-site-domain-admin', 'company_admin', $company->id);
        $request = $this->authenticate($companyAdmin);

        $request->getJson('/api/company-public-site/domains?companyId='.$company->id)
            ->assertOk()
            ->assertJsonCount(0, 'domains');

        $created = $request->postJson('/api/company-public-site/domains?companyId='.$company->id, [
            'domain' => 'site.public-site-domain.test',
        ])->assertCreated()
            ->assertJsonPath('domain', 'site.public-site-domain.test')
            ->assertJsonPath('status', 'PENDING');
        $domainId = $created->json('id');

        $request->getJson('/api/company-public-site/domains?companyId='.$company->id)
            ->assertOk()
            ->assertJsonCount(1, 'domains')
            ->assertJsonPath('domains.0.id', $domainId);

        $request->postJson('/api/company-public-site/domains/'.$domainId.'/verify?companyId='.$company->id)
            ->assertStatus(422)
            ->assertJsonPath('domain.status', 'PENDING');

        $request->deleteJson('/api/company-public-site/domains/'.$domainId.'?companyId='.$company->id)
            ->assertOk()
            ->assertJson(['ok' => true]);
        $this->assertDatabaseHas('ecommerce_domains', [
            'id' => $domainId,
            'company_id' => $company->id,
            'status' => 'ARCHIVED',
        ]);
        $this->assertDatabaseMissing('maximus_company_modules', [
            'company_id' => $company->id,
            'module_id' => 'ecommerce',
        ]);
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