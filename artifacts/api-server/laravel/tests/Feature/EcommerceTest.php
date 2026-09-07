<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\CompanyRegistry;
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
            'slug' => 'coffret-degustation',
            'sku' => 'COFFRET-01',
            'categoryId' => $category['id'],
            'price' => 15000,
            'stock' => 4,
        ])->assertCreated()
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