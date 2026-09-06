<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

        $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Produit interdit',
            'slug' => 'produit-interdit',
            'sku' => 'FORBIDDEN-01',
            'price' => 1000,
            'stock' => 1,
        ])->assertForbidden();

        $this->assertDatabaseMissing('ecommerce_products', ['sku' => 'FORBIDDEN-01']);
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
            ->assertJsonMissingPath('store.company_id');

        $this->postJson('/api/shop/kora-boutique-test/orders', [
            'customerName' => 'Client Test',
            'customerEmail' => 'client@example.test',
            'customerPhone' => '+221700000000',
            'shippingAddress' => 'Dakar, Sénégal',
            'items' => [['productId' => $product->json('id'), 'quantity' => 2]],
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
            'items' => [['productId' => $product->json('id'), 'quantity' => 2]],
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
            'items' => [['productId' => 'foreign-product', 'quantity' => 1]],
        ])->assertStatus(400);

        $this->assertDatabaseCount('ecommerce_orders', 0);
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