<?php

namespace Tests\Feature;

use App\Support\CompanyRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicImmobilierBootstrapTest extends TestCase
{
    use RefreshDatabase;

    public function test_immobilier_bootstrap_is_gated_by_public_site_activation_without_authentication(): void
    {
        $this->publishedStore('immobilier-gate');
        $this->publishedListing('listing-gate', 'kora', 'Publiee', 'PUBLISHED');

        $this->getJson('/api/shop/immobilier-gate/immobilier/bootstrap')
            ->assertNotFound()
            ->assertJsonPath('code', 'PUBLIC_SITE_MODULE_UNAVAILABLE');
    }

    public function test_immobilier_bootstrap_has_slug_domain_parity_and_excludes_unpublished_or_foreign_listings(): void
    {
        $this->publishedStore('immobilier-public');
        $this->publishedListing('listing-public', 'kora', 'Annonce publique', 'PUBLISHED');
        $this->publishedListing('listing-draft', 'kora', 'Brouillon', 'DRAFT');
        CompanyRegistry::ensureActive('other-company', 'Autre entreprise');
        $this->publishedListing('listing-foreign', 'other-company', 'Annonce étrangère', 'PUBLISHED');
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => 'kora'],
            [
                'maximus_enabled' => true,
                'company_enabled' => true,
                'module_ids' => json_encode(['immobilier']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $slug = $this->getJson('/api/shop/immobilier-public/immobilier/bootstrap')
            ->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('company.name', (string) DB::table('companies')->where('id', 'kora')->value('name'))
            ->assertJsonCount(1, 'listings')
            ->assertJsonPath('listings.0.id', 'listing-public');

        DB::table('ecommerce_domains')->insert([
            'id' => 'domain-immobilier-public',
            'company_id' => 'kora',
            'domain' => 'immobilier-kora.example.test',
            'target_host' => 'central.example.test',
            'verification_token' => 'token',
            'status' => 'ACTIVE',
            'last_error' => '',
            'verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('http://immobilier-kora.example.test/api/shop-domain/immobilier/bootstrap')
            ->assertOk()
            ->assertJson($slug->json());
    }

    public function test_immobilier_bootstrap_returns_unavailable_for_an_inactive_tenant(): void
    {
        $this->publishedStore('immobilier-inactive');
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => 'kora'],
            [
                'maximus_enabled' => true,
                'company_enabled' => true,
                'module_ids' => json_encode(['immobilier']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
        DB::table('companies')->where('id', 'kora')->update(['status' => 'SUSPENDU']);

        $this->getJson('/api/shop/immobilier-inactive/immobilier/bootstrap')
            ->assertNotFound()
            ->assertJsonPath('code', 'PUBLIC_SITE_MODULE_UNAVAILABLE');
    }

    public function test_immobilier_gallery_image_is_served_only_for_a_published_listing_on_an_enabled_site(): void
    {
        $this->publishedStore('immobilier-gallery');
        $this->publishedListing('listing-gallery', 'kora', 'Annonce avec photo', 'PUBLISHED');
        DB::table('ecommerce_gallery_images')->insert([
            'id' => 'gallery-immobilier-public',
            'company_id' => 'kora',
            'owner_type' => 'immobilier_listing',
            'owner_id' => 'listing-gallery',
            'collection' => 'gallery',
            'image_data' => base64_encode('image-publique'),
            'image_mime' => 'image/png',
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->get('/api/gallery-images/kora/gallery-immobilier-public')->assertNotFound();

        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => 'kora'],
            [
                'maximus_enabled' => true,
                'company_enabled' => true,
                'module_ids' => json_encode(['immobilier']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $this->get('/api/gallery-images/kora/gallery-immobilier-public')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertContent('image-publique');
    }

    public function test_neutral_slug_bootstrap_returns_unavailable_for_unknown_or_unpublished_slugs(): void
    {
        $this->getJson('/api/public-site/bootstrap/unknown-public-site')
            ->assertOk()
            ->assertJson(['available' => false]);

        $this->publishedStore('draft-public-site');
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => 'kora'],
            [
                'maximus_enabled' => true,
                'company_enabled' => false,
                'module_ids' => json_encode([], JSON_UNESCAPED_UNICODE),
                'public_name' => 'Site en préparation',
                'public_slug' => 'draft-public-site',
                'public_description' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $this->getJson('/api/public-site/bootstrap/draft-public-site')
            ->assertOk()
            ->assertJson(['available' => false]);
    }

    public function test_neutral_slug_and_domain_bootstraps_have_the_same_modules_and_safe_company_fields(): void
    {
        $this->publishedStore('neutral-public-site');
        DB::table('ecommerce_gallery_images')->insert([
            'id' => 'gallery-site-public-hero',
            'company_id' => 'kora',
            'owner_type' => 'company_site',
            'owner_id' => 'kora',
            'collection' => 'hero',
            'image_data' => base64_encode('bannière'),
            'image_mime' => 'image/png',
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => 'kora'],
            [
                'maximus_enabled' => true,
                'company_enabled' => true,
                'module_ids' => json_encode(['immobilier']),
                'public_name' => 'Site public KORA',
                'public_slug' => 'neutral-public-site',
                'public_description' => 'Présentation commune de l’entreprise.',
                'logo_url' => '/api/store-logos/kora/logo-site-public.png',
                'primary_color' => '#123456',
                'accent_color' => '#654321',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
        DB::table('ecommerce_domains')->insert([
            'id' => 'domain-neutral-public-site',
            'company_id' => 'kora',
            'domain' => 'neutral-kora.example.test',
            'target_host' => 'central.example.test',
            'verification_token' => 'token',
            'status' => 'ACTIVE',
            'last_error' => '',
            'verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $slug = $this->getJson('/api/public-site/bootstrap/neutral-public-site')
            ->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('storeSlug', 'neutral-public-site')
            ->assertJsonPath('company.currency', 'XOF')
            ->assertJsonMissingPath('company.id')
            ->assertJsonPath('brand.name', 'Site public KORA')
            ->assertJsonPath('brand.description', 'Présentation commune de l’entreprise.')
            ->assertJsonPath('brand.logoUrl', '/api/store-logos/kora/logo-site-public.png')
            ->assertJsonPath('brand.primaryColor', '#123456')
            ->assertJsonPath('brand.accentColor', '#654321')
            ->assertJsonPath('brand.heroImages.0', '/api/gallery-images/kora/gallery-site-public-hero')
            ->json();
        $domain = $this->getJson('http://neutral-kora.example.test/api/public-site/bootstrap')
            ->assertOk()
            ->assertJsonPath('available', true)
            ->json();

        $this->assertSame($slug['modules'], $domain['modules']);
        $this->assertSame($slug['company']['name'], $domain['company']['name']);
        $this->assertSame($slug['company']['currency'], $domain['company']['currency']);
        $this->assertSame($slug['brand'], $domain['brand']);
        $this->assertSame($slug['storeSlug'], $domain['storeSlug']);

        $slugManifest = $this->getJson('/api/public-site/manifest.webmanifest/neutral-public-site')
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('Vary', 'Host')
            ->assertJsonPath('name', 'Site public KORA')
            ->assertJsonPath('short_name', 'Site public KORA')
            ->assertJsonPath('description', 'Présentation commune de l’entreprise.')
            ->assertJsonPath('id', '/client-app/site/neutral-public-site/')
            ->assertJsonPath('start_url', '/client-app/site/neutral-public-site/')
            ->assertJsonPath('scope', '/client-app/site/neutral-public-site/')
            ->assertJsonPath('background_color', '#123456')
            ->assertJsonPath('theme_color', '#654321')
            ->assertJsonPath('icons.0.src', '/api/store-logos/kora/logo-site-public.png')
            ->json();
        $domainManifest = $this->getJson('http://neutral-kora.example.test/api/public-site/manifest.webmanifest')
            ->assertOk()
            ->assertJsonPath('name', 'Site public KORA')
            ->assertJsonPath('id', '/client-app/site/')
            ->assertJsonPath('start_url', '/client-app/site/')
            ->assertJsonPath('scope', '/client-app/site/')
            ->json();

        $this->assertSame($slugManifest['name'], $domainManifest['name']);
        $this->assertSame($slugManifest['theme_color'], $domainManifest['theme_color']);
    }

    public function test_company_site_bootstrap_keeps_the_public_site_slug_separate_from_the_published_store_slug(): void
    {
        $this->publishedStore('actual-public-store');
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => 'kora'],
            [
                'maximus_enabled' => true,
                'company_enabled' => true,
                'module_ids' => json_encode(['ecommerce']),
                'public_name' => 'Marque KORA',
                'public_slug' => 'company-public-brand',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $this->getJson('/api/public-site/bootstrap/company-public-brand')
            ->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('brand.slug', 'company-public-brand')
            ->assertJsonPath('storeSlug', 'actual-public-store');
        $this->getJson('/api/public-site/manifest.webmanifest/company-public-brand')
            ->assertOk()
            ->assertJsonPath('scope', '/client-app/site/company-public-brand/');
    }

    public function test_neutral_bootstrap_omits_store_slug_when_no_public_module_is_selected(): void
    {
        $this->publishedStore('site-without-public-module');
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => 'kora'],
            [
                'maximus_enabled' => true,
                'company_enabled' => true,
                'module_ids' => json_encode([]),
                'public_slug' => 'site-without-public-module',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $this->getJson('/api/public-site/bootstrap/site-without-public-module')
            ->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonMissingPath('storeSlug');
    }

    public function test_site_brand_assets_are_available_when_ecommerce_is_not_a_published_section(): void
    {
        $this->publishedStore('public-brand-assets');
        DB::table('ecommerce_gallery_images')->insert([
            'id' => 'gallery-brand-only',
            'company_id' => 'kora',
            'owner_type' => 'company_site',
            'owner_id' => 'kora',
            'collection' => 'hero',
            'image_data' => base64_encode('visuel-site'),
            'image_mime' => 'image/png',
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => 'kora'],
            [
                'maximus_enabled' => true,
                'company_enabled' => true,
                'module_ids' => json_encode(['immobilier']),
                'public_name' => 'Site public KORA',
                'public_slug' => 'public-brand-assets',
                'public_description' => '',
                'logo_url' => '/api/store-logos/kora/company-logo.png',
                'logo_data' => base64_encode('logo-entreprise'),
                'logo_mime' => 'image/png',
                'primary_color' => '#123456',
                'accent_color' => '#654321',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $this->get('/api/store-logos/kora/company-logo.png')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertContent('logo-entreprise');
        $this->get('/api/gallery-images/kora/gallery-brand-only')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertContent('visuel-site');
    }

    private function publishedStore(string $slug): void
    {
        CompanyRegistry::ensureActive('kora', 'Entreprise KORA');
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-'.$slug,
            'company_id' => 'kora',
            'slug' => $slug,
            'name' => 'Boutique KORA',
            'description' => '',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#D69E2E',
            'accent_color' => '#172033',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function publishedListing(string $id, string $companyId, string $title, string $status): void
    {
        DB::table('immobilier_listings')->insert([
            'id' => $id,
            'company_id' => $companyId,
            'title' => $title,
            'slug' => $id,
            'property_type' => 'APPARTEMENT',
            'transaction_type' => 'SALE',
            'status' => $status,
            'description' => 'Description',
            'city' => 'Dakar',
            'neighborhood' => 'Plateau',
            'address' => '',
            'price' => 1000,
            'area_m2' => 50,
            'bedrooms' => 2,
            'bathrooms' => 1,
            'furnished' => false,
            'featured' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}