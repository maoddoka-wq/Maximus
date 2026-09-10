<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\CompanyRegistry;
use App\Support\ModuleCatalog;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EcommerceTest extends TestCase
{
    use RefreshDatabase;

    public function test_ecommerce_requires_a_session_and_company_context(): void
    {
        $this->getJson('/api/ecommerce/bootstrap?companyId=kora')->assertUnauthorized();

        $this->asActor()
            ->getJson('/api/ecommerce/bootstrap?companyId=another-company')
            ->assertForbidden();
    }

    public function test_disabled_ecommerce_module_is_rejected_by_the_server(): void
    {
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'ecommerce')
            ->update(['status' => 'INACTIF']);

        $this->asActor()
            ->getJson('/api/ecommerce/bootstrap?companyId=kora')
            ->assertForbidden()
            ->assertJsonPath('moduleId', 'ecommerce');
    }

    public function test_detailed_catalogue_permissions_allow_reading_but_not_creating(): void
    {
        $request = $this->asActor('employee', [
            'ecommerce:menu:catalogue' => ['voir'],
        ]);

        $request->getJson('/api/ecommerce/bootstrap?companyId=kora')->assertOk();
        $this->assertDatabaseMissing('ecommerce_stores', ['id' => 'ecommerce-store-kora']);

        $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Produit interdit',
            'slug' => 'produit-interdit',
            'sku' => 'FORBIDDEN-01',
            'price' => 1000,
            'stock' => 1,
        ])->assertForbidden();

        $this->assertDatabaseMissing('ecommerce_products', ['sku' => 'FORBIDDEN-01']);
    }

    public function test_categories_are_persistent_and_products_are_linked_to_them(): void
    {
        $request = $this->asActor();
        $category = $request->postJson('/api/ecommerce/categories?companyId=kora', [
            'name' => 'Épicerie fine',
            'description' => 'Produits sélectionnés',
            'sortOrder' => 2,
        ])->assertCreated()
            ->assertJsonPath('name', 'Épicerie fine')
            ->assertJsonPath('slug', 'epicerie-fine')
            ->json();

        $request->getJson('/api/ecommerce/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonPath('categories.0.id', $category['id']);

        $product = $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Coffret dégustation',
            'sku' => 'COFFRET-01',
            'categoryId' => $category['id'],
            'price' => 15000,
            'stock' => 4,
        ])->assertCreated()
            ->assertJsonPath('slug', 'coffret-degustation')
            ->assertJsonPath('categoryId', $category['id'])
            ->assertJsonPath('category', 'Épicerie fine')
            ->json();

        $request->patchJson('/api/ecommerce/categories/'.$category['id'].'?companyId=kora', [
            'name' => 'Épicerie premium',
        ])->assertOk();

        $request->deleteJson('/api/ecommerce/categories/'.$category['id'].'?companyId=kora')
            ->assertOk();

        $this->assertDatabaseHas('ecommerce_products', [
            'id' => $product['id'],
            'category_id' => null,
            'category' => 'Général',
        ]);
        $this->assertDatabaseMissing('ecommerce_categories', ['id' => $category['id']]);
    }

    public function test_product_and_category_slugs_are_generated_and_scoped_to_the_company(): void
    {
        $request = $this->asActor();
        $category = $request->postJson('/api/ecommerce/categories?companyId=kora', [
            'name' => 'Accessoires',
        ])->assertCreated()->assertJsonPath('slug', 'accessoires')->json();

        $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Sac Atlas',
            'sku' => 'ATLAS-01',
            'categoryId' => $category['id'],
            'price' => 12000,
            'stock' => 3,
        ])->assertCreated()->assertJsonPath('slug', 'sac-atlas');

        DB::table('ecommerce_products')->insert([
            'id' => 'other-company-product',
            'company_id' => 'other-company',
            'name' => 'Sac Atlas',
            'slug' => 'sac-atlas',
            'sku' => 'OTHER-ATLAS-01',
            'description' => '',
            'category' => 'Général',
            'price' => 12000,
            'compare_at_price' => null,
            'stock' => 3,
            'image_url' => '',
            'featured' => false,
            'status' => 'DRAFT',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Sac Atlas entreprise',
            'sku' => 'ATLAS-02',
            'slug' => 'sac-atlas',
            'price' => 12000,
            'stock' => 3,
        ])->assertCreated()->assertJsonPath('slug', 'sac-atlas-2');
    }

    public function test_same_store_name_keeps_each_company_isolated_with_a_unique_public_slug(): void
    {
        $first = $this->asActor()
            ->patchJson('/api/ecommerce/store?companyId=kora', [
                'name' => 'Boutique commune',
                'slug' => 'boutique-commune',
                'description' => 'Catalogue de la première entreprise',
                'status' => 'PUBLISHED',
                'currency' => 'XOF',
                'primaryColor' => '#D69E2E',
                'accentColor' => '#172033',
            ])
            ->assertOk()
            ->json();

        CompanyRegistry::ensureActive('other-company', 'Autre entreprise');
        ModuleCatalog::ensureCompanyAccess('other-company');
        $otherUser = AuthUser::query()->create([
            'id' => 'ecommerce-other-company',
            'email' => 'ecommerce-other-company@demo.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Autre boutiquier',
            'role' => 'company_admin',
            'company_id' => 'other-company',
            'employee_id' => null,
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);
        $otherRequest = $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($otherUser));

        $second = $otherRequest
            ->patchJson('/api/ecommerce/store?companyId=other-company', [
                'name' => 'Boutique commune',
                'slug' => 'boutique-commune',
                'description' => 'Catalogue de la deuxième entreprise',
                'status' => 'PUBLISHED',
                'currency' => 'XOF',
                'primaryColor' => '#123456',
                'accentColor' => '#654321',
            ])
            ->assertOk()
            ->assertJsonPath('slug', 'boutique-commune-2')
            ->json();

        $this->assertNotSame($first['id'], $second['id']);
        $this->assertDatabaseHas('ecommerce_stores', [
            'id' => $first['id'],
            'company_id' => 'kora',
            'name' => 'Boutique commune',
            'description' => 'Catalogue de la première entreprise',
            'slug' => 'boutique-commune',
        ]);
        $this->assertDatabaseHas('ecommerce_stores', [
            'id' => $second['id'],
            'company_id' => 'other-company',
            'name' => 'Boutique commune',
            'description' => 'Catalogue de la deuxième entreprise',
            'slug' => 'boutique-commune-2',
        ]);

        $this->getJson('/api/shop/boutique-commune')
            ->assertOk()
            ->assertJsonPath('store.description', 'Catalogue de la première entreprise');
        $this->getJson('/api/shop/boutique-commune-2')
            ->assertOk()
            ->assertJsonPath('store.description', 'Catalogue de la deuxième entreprise');
    }

    public function test_published_shop_recalculates_total_and_decrements_stock_transactionally(): void
    {
        $request = $this->asActor();
        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique KORA',
            'slug' => 'kora-boutique-test',
            'description' => 'Boutique publique',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();

        $product = $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Café local',
            'slug' => 'cafe-local',
            'sku' => 'CAFE-01',
            'description' => 'Café torréfié.',
            'category' => 'Épicerie',
            'price' => 2500,
            'compareAtPrice' => 3000,
            'stock' => 3,
            'status' => 'PUBLISHED',
        ])->assertCreated();

        $this->getJson('/api/shop/kora-boutique-test')
            ->assertOk()
            ->assertJsonPath('products.0.price', 2500)
            ->assertJsonPath('products.0.slug', 'cafe-local')
            ->assertJsonMissingPath('store.id')
            ->assertJsonMissingPath('store.companyId')
            ->assertJsonMissingPath('products.0.id')
            ->assertJsonMissingPath('products.0.companyId');

        $this->postJson('/api/shop/kora-boutique-test/orders', [
            'customerName' => 'Client Test',
            'customerEmail' => 'client@example.test',
            'customerPhone' => '+221700000000',
            'shippingAddress' => 'Dakar, Sénégal',
            'items' => [['productSlug' => $product->json('slug'), 'quantity' => 2]],
        ])->assertCreated()
            ->assertJsonPath('total', 5000);

        $this->assertDatabaseHas('ecommerce_products', [
            'id' => $product->json('id'),
            'stock' => 1,
        ]);
        $this->assertDatabaseCount('ecommerce_orders', 1);
        $this->assertDatabaseCount('ecommerce_order_items', 1);

        $this->postJson('/api/shop/kora-boutique-test/orders', [
            'customerName' => 'Client Test',
            'customerEmail' => 'client@example.test',
            'shippingAddress' => 'Dakar, Sénégal',
            'items' => [['productSlug' => $product->json('slug'), 'quantity' => 2]],
        ])->assertStatus(409);

        $this->assertDatabaseCount('ecommerce_orders', 1);
    }

    public function test_public_order_cannot_use_a_product_from_another_company(): void
    {
        $request = $this->asActor();
        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique KORA',
            'slug' => 'kora-isolation-test',
            'description' => '',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();

        DB::table('ecommerce_products')->insert([
            'id' => 'foreign-product',
            'company_id' => 'other-company',
            'name' => 'Produit autre entreprise',
            'slug' => 'produit-autre',
            'sku' => 'OTHER-01',
            'description' => '',
            'category' => 'Général',
            'price' => 999,
            'compare_at_price' => null,
            'stock' => 10,
            'image_url' => '',
            'featured' => false,
            'status' => 'PUBLISHED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->postJson('/api/shop/kora-isolation-test/orders', [
            'customerName' => 'Client Test',
            'customerEmail' => 'client@example.test',
            'shippingAddress' => 'Dakar, Sénégal',
            'items' => [['productSlug' => 'produit-autre', 'quantity' => 1]],
        ])->assertStatus(400);

        $this->assertDatabaseCount('ecommerce_orders', 0);
    }

    public function test_catalogue_accepts_the_complete_product_form_payload_and_updates_a_product(): void
    {
        $request = $this->asActor();
        $payload = [
            'name' => 'Sacoche Atlas',
            'sku' => 'ATLAS-FORM-01',
            'description' => 'Une sacoche de démonstration.',
            'category' => 'Divers',
            'categoryId' => null,
            'price' => 12500,
            'compareAtPrice' => 15000,
            'stock' => 8,
            'imageUrl' => '',
            'featured' => true,
            'status' => 'PUBLISHED',
        ];

        $product = $request->postJson('/api/ecommerce/products?companyId=kora', $payload)
            ->assertCreated()
            ->assertJsonPath('name', 'Sacoche Atlas')
            ->assertJsonPath('price', 12500)
            ->assertJsonPath('compareAtPrice', 15000)
            ->assertJsonPath('status', 'PUBLISHED')
            ->json();

        $request->patchJson('/api/ecommerce/products/'.$product['id'].'?companyId=kora', [
            ...$payload,
            'name' => 'Sacoche Atlas Premium',
            'sku' => 'ATLAS-FORM-02',
        ])->assertOk()
            ->assertJsonPath('name', 'Sacoche Atlas Premium')
            ->assertJsonPath('sku', 'ATLAS-FORM-02');
    }

    public function test_public_order_is_idempotent_and_order_status_follows_allowed_transitions(): void
    {
        $request = $this->asActor();
        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique commandes',
            'slug' => 'commandes-transition-test',
            'description' => '',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();
        $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Produit transition',
            'slug' => 'produit-transition',
            'sku' => 'TRANSITION-01',
            'price' => 1800,
            'stock' => 4,
            'status' => 'PUBLISHED',
        ])->assertCreated();

        $payload = [
            'customerName' => 'Client Transition',
            'customerEmail' => 'transition@example.test',
            'shippingAddress' => 'Dakar, Sénégal',
            'items' => [['productSlug' => 'produit-transition', 'quantity' => 1]],
        ];
        $first = $this->withHeader('Idempotency-Key', 'checkout-transition-1')
            ->postJson('/api/shop/commandes-transition-test/orders', $payload)
            ->assertCreated()
            ->assertJsonPath('total', 1800);
        $this->withHeader('Idempotency-Key', 'checkout-transition-1')
            ->postJson('/api/shop/commandes-transition-test/orders', $payload)
            ->assertOk()
            ->assertJson($first->json());

        $order = DB::table('ecommerce_orders')->where('reference', $first->json('reference'))->first();
        $this->assertNotNull($order);
        $this->assertDatabaseCount('ecommerce_orders', 1);
        $request->patchJson('/api/ecommerce/orders/'.$order->id.'/status?companyId=kora', ['status' => 'CONFIRMÉE'])
            ->assertOk()
            ->assertJsonPath('status', 'CONFIRMÉE');
        $request->patchJson('/api/ecommerce/orders/'.$order->id.'/status?companyId=kora', ['status' => 'LIVRÉE'])
            ->assertStatus(422);
        $request->patchJson('/api/ecommerce/orders/'.$order->id.'/status?companyId=kora', ['status' => 'ANNULÉE'])
            ->assertOk()
            ->assertJsonPath('status', 'ANNULÉE');
        $this->assertDatabaseHas('ecommerce_products', ['slug' => 'produit-transition', 'stock' => 3]);
    }

    public function test_public_order_by_slug_rejects_an_inactive_company(): void
    {
        CompanyRegistry::ensureActive('kora', 'Entreprise KORA');
        $request = $this->asActor();
        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique inactive',
            'slug' => 'boutique-inactive-test',
            'description' => '',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();
        $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Produit inactif',
            'slug' => 'produit-inactif',
            'sku' => 'INACTIVE-01',
            'price' => 1000,
            'stock' => 2,
            'status' => 'PUBLISHED',
        ])->assertCreated();

        DB::table('companies')->where('id', 'kora')->update(['status' => 'SUSPENDU']);

        $this->getJson('/api/shop/boutique-inactive-test')->assertNotFound();
        $this->postJson('/api/shop/boutique-inactive-test/orders', [
            'customerName' => 'Client Inactif',
            'customerEmail' => 'inactive@example.test',
            'shippingAddress' => 'Dakar',
            'items' => [['productSlug' => 'produit-inactif', 'quantity' => 1]],
        ])->assertNotFound();
    }

    public function test_company_admin_can_upload_and_replace_a_product_image(): void
    {
        Storage::fake('public');
        $request = $this->asActor();
        $product = $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Produit avec photo',
            'slug' => 'produit-photo',
            'sku' => 'PHOTO-01',
            'price' => 1200,
            'stock' => 4,
        ])->assertCreated();

        $first = $request->post('/api/ecommerce/products/'.$product->json('id').'/image?companyId=kora', [
            'image' => UploadedFile::fake()->image('premiere-photo.jpg'),
        ])->assertOk();
        $firstUrl = $first->json('imageUrl');
        $this->assertStringStartsWith('/api/product-images/kora/', $firstUrl);
        $firstPath = 'ecommerce/products/kora/'.basename($firstUrl);
        Storage::disk('public')->assertExists($firstPath);
        $this->getJson($firstUrl)->assertOk();
        Storage::disk('public')->delete($firstPath);
        $this->get($firstUrl)->assertOk()->assertHeader('Content-Type', 'image/jpeg');

        $second = $request->post('/api/ecommerce/products/'.$product->json('id').'/image?companyId=kora', [
            'image' => UploadedFile::fake()->image('seconde-photo.png'),
        ])->assertOk();
        $secondUrl = $second->json('imageUrl');
        $this->assertNotSame($firstUrl, $secondUrl);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists('ecommerce/products/kora/'.basename($secondUrl));
        $this->assertDatabaseHas('ecommerce_products', [
            'id' => $product->json('id'),
            'image_url' => $secondUrl,
        ]);
    }

    public function test_company_admin_can_upload_a_store_logo_without_using_the_company_logo(): void
    {
        Storage::fake('public');
        DB::table('companies')->where('id', 'kora')->update(['profile_photo' => '/api/company-images/kora/entreprise.jpg']);
        $request = $this->asActor();

        $request->getJson('/api/ecommerce/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonPath('store.logoUrl', '');

        $response = $request->post('/api/ecommerce/store/logo?companyId=kora', [
            'image' => UploadedFile::fake()->image('logo-boutique.png'),
        ])->assertOk();

        $logoUrl = $response->json('logoUrl');
        $this->assertStringStartsWith('/api/store-logos/kora/', $logoUrl);
        $this->assertDatabaseHas('ecommerce_stores', [
            'id' => 'ecommerce-store-kora',
            'logo_url' => $logoUrl,
        ]);

        $logoPath = 'ecommerce/stores/kora/'.basename($logoUrl);
        Storage::disk('public')->assertExists($logoPath);
        $this->get($logoUrl)->assertOk()->assertHeader('Content-Type', 'image/png');

        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique Kora',
            'slug' => 'kora-boutique',
            'description' => 'Boutique publique',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();
        $this->getJson('/api/shop/kora-boutique')
            ->assertOk()
            ->assertJsonPath('store.logoUrl', $logoUrl);

        Storage::disk('public')->delete($logoPath);
        $this->get($logoUrl)->assertOk()->assertHeader('Content-Type', 'image/png');
    }

    public function test_public_shop_exposes_all_published_sale_products_including_out_of_stock_items(): void
    {
        $request = $this->asActor();
        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique multi-produits',
            'slug' => 'boutique-multi-produits',
            'description' => 'Plusieurs références publiées',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();

        $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Produit public un',
            'slug' => 'produit-public-un',
            'sku' => 'PUBLIC-01',
            'price' => 1200,
            'stock' => 4,
            'status' => 'PUBLISHED',
        ])->assertCreated();
        $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Produit public deux',
            'slug' => 'produit-public-deux',
            'sku' => 'PUBLIC-02',
            'price' => 2400,
            'stock' => 7,
            'status' => 'PUBLISHED',
        ])->assertCreated();
        $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Produit brouillon',
            'slug' => 'produit-brouillon',
            'sku' => 'PUBLIC-03',
            'price' => 3600,
            'stock' => 7,
            'status' => 'DRAFT',
        ])->assertCreated();
        $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Produit temporairement indisponible',
            'slug' => 'produit-indisponible',
            'sku' => 'PUBLIC-04',
            'price' => 4800,
            'stock' => 0,
            'status' => 'PUBLISHED',
        ])->assertCreated();

        $this->getJson('/api/shop/boutique-multi-produits')
            ->assertOk()
            ->assertJsonCount(3, 'products')
            ->assertJsonFragment(['slug' => 'produit-public-un'])
            ->assertJsonFragment(['slug' => 'produit-public-deux'])
            ->assertJsonFragment(['slug' => 'produit-indisponible', 'stock' => 0])
            ->assertJsonMissing(['slug' => 'produit-brouillon']);
    }

    public function test_company_admin_can_upload_a_rental_image_and_keep_its_category(): void
    {
        Storage::fake('public');
        $request = $this->asActor();
        $category = $request->postJson('/api/ecommerce/categories?companyId=kora', [
            'name' => 'Habitat',
        ])->assertCreated()->json();
        $rental = $request->postJson('/api/ecommerce/rentals?companyId=kora', [
            'name' => 'Maison avec photo',
            'categoryId' => $category['id'],
            'price' => 18000,
            'billingUnit' => 'SEMAINE',
            'availability' => 2,
            'status' => 'PUBLISHED',
        ])->assertCreated()
            ->assertJsonPath('categoryId', $category['id'])
            ->assertJsonPath('category', 'Habitat')
            ->json();

        $response = $request->post('/api/ecommerce/rentals/'.$rental['id'].'/image?companyId=kora', [
            'image' => UploadedFile::fake()->image('maison.jpg'),
        ])->assertOk();

        $imageUrl = $response->json('imageUrl');
        $this->assertStringStartsWith('/api/rental-images/kora/', $imageUrl);
        $this->assertDatabaseHas('ecommerce_rentals', [
            'id' => $rental['id'],
            'category_id' => $category['id'],
            'image_url' => $imageUrl,
        ]);
        $this->getJson($imageUrl)->assertOk()->assertHeader('Content-Type', 'image/jpeg');
    }

    public function test_company_admin_can_register_verify_and_remove_a_custom_domain(): void
    {
        $request = $this->asActor();
        $created = $request->postJson('/api/ecommerce/domains?companyId=kora', [
            'domain' => 'https://boutique.kora.test/',
        ])->assertCreated()
            ->assertJsonPath('domain', 'boutique.kora.test')
            ->assertJsonPath('status', 'PENDING')
            ->assertJsonPath('verificationName', '_maximus-verification.boutique.kora.test');

        $domainId = $created->json('id');
        $request->postJson('/api/ecommerce/domains/'.$domainId.'/verify?companyId=kora')
            ->assertStatus(422)
            ->assertJsonPath('domain.status', 'PENDING');

        $request->deleteJson('/api/ecommerce/domains/'.$domainId.'?companyId=kora')
            ->assertOk()
            ->assertJson(['ok' => true]);
        $this->assertDatabaseMissing('ecommerce_domains', ['id' => $domainId]);
    }

    public function test_active_custom_domain_serves_only_its_published_company_store(): void
    {
        $request = $this->asActor();
        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique domaine KORA',
            'slug' => 'kora-domaine-test',
            'description' => 'Boutique publiée sur son domaine.',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();

        $product = $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Produit domaine',
            'slug' => 'produit-domaine',
            'sku' => 'DOMAIN-01',
            'price' => 1800,
            'stock' => 2,
            'status' => 'PUBLISHED',
        ])->assertCreated();

        DB::table('ecommerce_domains')->insert([
            'id' => 'domain-active-kora',
            'company_id' => 'kora',
            'domain' => 'boutique-active.kora.test',
            'target_host' => 'maximus.test',
            'verification_token' => 'maximus-test-token',
            'status' => 'ACTIVE',
            'last_error' => '',
            'verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('http://boutique-active.kora.test/api/shop-domain')
            ->assertOk()
            ->assertJsonPath('products.0.slug', 'produit-domaine')
            ->assertJsonMissingPath('store.companyId')
            ->assertJsonMissingPath('products.0.id');

        $this->postJson('http://boutique-active.kora.test/api/shop-domain/orders', [
                'customerName' => 'Client Domaine',
                'customerEmail' => 'domain@example.test',
                'shippingAddress' => 'Dakar, Sénégal',
                'items' => [['productSlug' => $product->json('slug'), 'quantity' => 1]],
            ])
            ->assertCreated()
            ->assertJsonPath('total', 1800);

        $this->assertDatabaseHas('ecommerce_products', [
            'id' => $product->json('id'),
            'company_id' => 'kora',
            'stock' => 1,
        ]);

        $this->getJson('http://unknown-domain.test/api/shop-domain')
            ->assertOk()
            ->assertJson(['available' => false]);
    }

    public function test_public_manifests_have_an_isolated_pwa_start_path_per_store(): void
    {
        DB::table('ecommerce_stores')->insert([
            'id' => 'ecommerce-store-kora-manifest',
            'company_id' => 'kora',
            'slug' => 'kora-boutique',
            'name' => 'Boutique Kora',
            'description' => '',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#123456',
            'accent_color' => '#654321',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('ecommerce_stores')->insert([
            'id' => 'ecommerce-store-other',
            'company_id' => 'other-company',
            'slug' => 'autre-boutique',
            'name' => 'Autre boutique',
            'description' => '',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#123456',
            'accent_color' => '#654321',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $first = $this->getJson('/api/shop/kora-boutique/manifest.webmanifest')
            ->assertOk()
            ->json();
        $second = $this->getJson('/api/shop/autre-boutique/manifest.webmanifest')
            ->assertOk()
            ->json();

        $this->assertSame('/client-app/shop/kora-boutique/', $first['id']);
        $this->assertSame($first['id'], $first['start_url']);
        $this->assertSame($first['id'], $first['scope']);
        $this->assertSame('/client-app/shop/autre-boutique/', $second['id']);
        $this->assertNotSame($first['id'], $second['id']);
    }

    public function test_sale_and_rental_products_keep_an_explicit_public_distinction(): void
    {
        $request = $this->asActor();
        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique types',
            'slug' => 'boutique-types',
            'description' => 'Ventes et locations',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();

        $sale = $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Sac à vendre',
            'sku' => 'SALE-01',
            'price' => 5000,
            'stock' => 3,
            'status' => 'PUBLISHED',
            'productType' => 'SALE',
        ])->assertCreated()->assertJsonPath('productType', 'SALE')->json();
        $rental = $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Tente à louer',
            'sku' => 'RENTAL-01',
            'price' => 15000,
            'stock' => 2,
            'category' => 'Événement',
            'status' => 'PUBLISHED',
            'productType' => 'RENTAL',
            'rentalPeriod' => 'JOUR',
        ])->assertCreated()->assertJsonPath('productType', 'RENTAL')->assertJsonPath('rentalPeriod', 'JOUR')->json();

        $this->assertDatabaseHas('ecommerce_products', ['id' => $sale['id'], 'product_type' => 'SALE', 'rental_period' => null]);
        $this->assertDatabaseHas('ecommerce_products', ['id' => $rental['id'], 'product_type' => 'RENTAL', 'rental_period' => 'JOUR']);
        $this->getJson('/api/shop/boutique-types')
            ->assertOk()
            ->assertJsonPath('products.0.slug', $sale['slug'])
            ->assertJsonMissingPath('products.1')
            ->assertJsonFragment(['name' => 'Tente à louer', 'category' => 'Événement', 'billingUnit' => 'JOUR'])
            ->assertJsonFragment(['slug' => $sale['slug'], 'productType' => 'SALE', 'rentalPeriod' => null]);
    }

    public function test_delivery_requests_are_scoped_and_status_can_be_managed_by_the_company(): void
    {
        $request = $this->asActor();
        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique livraison',
            'slug' => 'boutique-livraison',
            'description' => 'Services de livraison',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();

        $created = $this->postJson('/api/shop/boutique-livraison/delivery-requests', [
            'requesterName' => 'Client Livraison',
            'requesterEmail' => 'livraison@example.test',
            'requesterPhone' => '770000000',
            'address' => 'Dakar, Sénégal',
            'serviceType' => 'STANDARD',
            'desiredDate' => now()->addDay()->toDateString(),
            'note' => 'Appeler avant de passer',
        ])->assertCreated()
            ->assertJsonPath('status', 'DEMANDEE')
            ->assertJsonPath('serviceType', 'STANDARD');

        $requestId = $created->json('id');
        $this->assertDatabaseHas('ecommerce_delivery_requests', [
            'id' => $requestId,
            'company_id' => 'kora',
            'requester_email' => 'livraison@example.test',
        ]);

        DB::table('ecommerce_delivery_requests')->insert([
            'id' => 'delivery-other-company',
            'company_id' => 'other-company',
            'reference' => 'LIV-OTHER',
            'requester_name' => 'Autre entreprise',
            'requester_email' => 'other@example.test',
            'requester_phone' => '',
            'address' => 'Autre adresse',
            'service_type' => 'STANDARD',
            'desired_date' => null,
            'note' => '',
            'status' => 'DEMANDEE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $request->getJson('/api/ecommerce/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonPath('deliveryRequests.0.id', $requestId)
            ->assertJsonMissing(['reference' => 'LIV-OTHER']);
        $request->patchJson('/api/ecommerce/delivery-requests/'.$requestId.'/status?companyId=kora', ['status' => 'CONFIRMEE'])
            ->assertOk()
            ->assertJsonPath('status', 'CONFIRMEE');
        $this->assertDatabaseHas('ecommerce_delivery_requests', ['id' => $requestId, 'status' => 'CONFIRMEE']);
    }

    public function test_company_can_manage_delivery_zones_and_public_requests_use_an_active_zone(): void
    {
        $request = $this->asActor();
        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique zones',
            'slug' => 'boutique-zones',
            'description' => 'Livraison par secteur',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();

        $zone = $request->postJson('/api/ecommerce/delivery-zones?companyId=kora', [
            'name' => 'Dakar centre',
            'description' => 'Plateau, Médina et alentours',
            'fee' => 1500,
            'estimatedMinutes' => 90,
            'isActive' => true,
            'sortOrder' => 1,
        ])->assertCreated()
            ->assertJsonPath('name', 'Dakar centre')
            ->assertJsonPath('fee', 1500)
            ->json();

        $zoneId = $zone['id'];
        $request->getJson('/api/ecommerce/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonPath('deliveryZones.0.id', $zoneId);
        $this->getJson('/api/shop/boutique-zones')
            ->assertOk()
            ->assertJsonPath('deliveryZones.0.name', 'Dakar centre')
            ->assertJsonPath('deliveryZones.0.fee', 1500);

        $this->postJson('/api/shop/boutique-zones/delivery-requests', [
            'requesterName' => 'Client Zone',
            'requesterEmail' => 'zone@example.test',
            'address' => 'Plateau, Dakar',
            'serviceType' => 'STANDARD',
        ])->assertStatus(422);

        $created = $this->postJson('/api/shop/boutique-zones/delivery-requests', [
            'requesterName' => 'Client Zone',
            'requesterEmail' => 'zone@example.test',
            'address' => 'Plateau, Dakar',
            'deliveryZoneId' => $zoneId,
            'serviceType' => 'STANDARD',
        ])->assertCreated()
            ->assertJsonPath('deliveryZoneId', $zoneId)
            ->assertJsonPath('deliveryZoneName', 'Dakar centre')
            ->assertJsonPath('deliveryZoneFee', 1500);

        $this->assertDatabaseHas('ecommerce_delivery_requests', [
            'id' => $created->json('id'),
            'delivery_zone_id' => $zoneId,
            'delivery_zone_name' => 'Dakar centre',
            'delivery_zone_fee' => 1500,
        ]);

        $request->patchJson('/api/ecommerce/delivery-zones/'.$zoneId.'?companyId=kora', [
            'isActive' => false,
        ])->assertOk()->assertJsonPath('isActive', false);
        $this->getJson('/api/shop/boutique-zones')
            ->assertOk()
            ->assertJsonCount(0, 'deliveryZones');
        $this->postJson('/api/shop/boutique-zones/delivery-requests', [
            'requesterName' => 'Client Zone',
            'requesterEmail' => 'zone-2@example.test',
            'address' => 'Plateau, Dakar',
            'deliveryZoneId' => $zoneId,
            'serviceType' => 'STANDARD',
        ])->assertStatus(422);
    }

    public function test_public_delivery_service_is_hidden_and_blocked_without_the_company_feature(): void
    {
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'ecommerce')
            ->update(['feature_ids' => json_encode(['location'])]);
        $request = $this->asActor();
        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique sans livraison',
            'slug' => 'boutique-sans-livraison',
            'description' => 'Boutique',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();

        $this->getJson('/api/shop/boutique-sans-livraison')
            ->assertOk()
            ->assertJsonPath('store.enabledFeatures.livraisons', false)
            ->assertJsonPath('store.enabledFeatures.location', true);
        $this->postJson('/api/shop/boutique-sans-livraison/delivery-requests', [
            'requesterName' => 'Client',
            'requesterEmail' => 'client@example.test',
            'address' => 'Dakar',
            'serviceType' => 'STANDARD',
        ])->assertForbidden();
    }

    public function test_rentals_are_autonomous_persistent_and_exposed_only_when_published(): void
    {
        $request = $this->asActor();
        $request->patchJson('/api/ecommerce/store?companyId=kora', [
            'name' => 'Boutique locations',
            'slug' => 'boutique-locations',
            'description' => 'Locations autonomes',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primaryColor' => '#D69E2E',
            'accentColor' => '#172033',
        ])->assertOk();

        $product = $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Maison catalogue',
            'sku' => 'SALE-RENTAL-BOUNDARY',
            'price' => 1000,
            'stock' => 1,
            'status' => 'PUBLISHED',
        ])->assertCreated();
        $rental = $request->postJson('/api/ecommerce/rentals?companyId=kora', [
            'name' => 'Maison autonome',
            'description' => 'Une offre indépendante.',
            'category' => 'Habitat',
            'price' => 25000,
            'billingUnit' => 'SEMAINE',
            'availability' => 2,
            'status' => 'PUBLISHED',
        ])->assertCreated()
            ->assertJsonPath('isAvailable', true)
            ->assertJsonPath('billingUnit', 'SEMAINE')
            ->json();
        $draft = $request->postJson('/api/ecommerce/rentals?companyId=kora', [
            'name' => 'Brouillon privé',
            'price' => 3000,
            'billingUnit' => 'JOUR',
            'availability' => 1,
            'status' => 'DRAFT',
        ])->assertCreated()->json();

        $request->patchJson('/api/ecommerce/rentals/'.$rental['id'].'?companyId=kora', [
            'description' => 'Description modifiée.',
            'price' => 27000,
        ])->assertOk()->assertJsonPath('price', 27000);
        $request->patchJson('/api/ecommerce/rentals/'.$rental['id'].'/availability?companyId=kora', [
            'availability' => 0,
        ])->assertOk()->assertJsonPath('isAvailable', false);

        $request->getJson('/api/ecommerce/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonFragment(['id' => $rental['id'], 'name' => 'Maison autonome', 'availability' => 0])
            ->assertJsonFragment(['id' => $draft['id'], 'status' => 'DRAFT']);
        $this->assertDatabaseHas('ecommerce_rentals', [
            'id' => $rental['id'],
            'company_id' => 'kora',
            'price' => 27000,
            'availability' => 0,
        ]);

        $this->getJson('/api/shop/boutique-locations')
            ->assertOk()
            ->assertJsonCount(1, 'rentals')
            ->assertJsonPath('rentals.0.name', 'Maison autonome')
            ->assertJsonPath('rentals.0.availability', 0)
            ->assertJsonPath('rentals.0.id', $rental['id'])
            ->assertJsonMissingPath('rentals.0.companyId');
    }

    public function test_rentals_are_isolated_by_company_and_archiving_hides_them_publicly(): void
    {
        $request = $this->asActor();
        $rental = $request->postJson('/api/ecommerce/rentals?companyId=kora', [
            'name' => 'Location KORA',
            'price' => 5000,
            'billingUnit' => 'JOUR',
            'availability' => 4,
            'status' => 'PUBLISHED',
        ])->assertCreated()->json();

        DB::table('ecommerce_rentals')->insert([
            'id' => 'rental-other-company',
            'company_id' => 'other-company',
            'name' => 'Location autre entreprise',
            'description' => '',
            'category' => 'Général',
            'price' => 9000,
            'billing_unit' => 'JOUR',
            'availability' => 3,
            'status' => 'PUBLISHED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $request->patchJson('/api/ecommerce/rentals/rental-other-company?companyId=kora', ['price' => 1])
            ->assertNotFound();
        $request->getJson('/api/ecommerce/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonFragment(['id' => $rental['id'], 'name' => 'Location KORA'])
            ->assertJsonMissing(['id' => 'rental-other-company']);

        $request->deleteJson('/api/ecommerce/rentals/'.$rental['id'].'?companyId=kora')
            ->assertOk()
            ->assertJsonPath('status', 'ARCHIVED');
        $this->assertDatabaseHas('ecommerce_rentals', ['id' => $rental['id'], 'status' => 'ARCHIVED']);
    }

    private function asActor(string $role = 'company_admin', array $permissions = []): self
    {
        $user = AuthUser::query()->create([
            'id' => 'ecommerce-'.strtolower($role),
            'email' => 'ecommerce-'.strtolower($role).'@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Gestionnaire E-commerce',
            'role' => $role,
            'company_id' => 'kora',
            'employee_id' => $role === 'employee' ? 'ecommerce-employee' : null,
            'sector_ids' => [],
            'permissions' => $permissions,
            'status' => 'ACTIF',
        ]);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}