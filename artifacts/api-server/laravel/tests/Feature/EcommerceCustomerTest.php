<?php

namespace Tests\Feature;

use App\Support\EcommerceCustomerAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class EcommerceCustomerTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_registration_session_and_order_are_persisted(): void
    {
        $this->createStore('kora', 'kora-client');
        $productId = $this->createProduct('kora', 'cafe-client', 2500, 3);

        $registered = $this->postJson('/api/shop/kora-client/customer/register', [
            'name' => 'Client KORA',
            'email' => 'client@example.test',
            'phone' => '+221700000000',
            'password' => 'motdepasse-solide',
        ])->assertCreated()
            ->assertJsonPath('customer.email', 'client@example.test');

        $cookie = $registered->getCookie(EcommerceCustomerAuth::COOKIE, false)->getValue();
        $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $cookie)
            ->getJson('/api/shop/kora-client/customer/bootstrap')
            ->assertOk()
            ->assertJsonPath('customer.name', 'Client KORA')
            ->assertJsonPath('addresses', []);

        $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $cookie)
            ->postJson('/api/shop/kora-client/orders', [
                'customerName' => 'Nom fourni au checkout',
                'customerEmail' => 'checkout@example.test',
                'shippingAddress' => 'Dakar, Sénégal',
                'items' => [['productSlug' => 'cafe-client', 'quantity' => 1]],
            ])
            ->assertCreated();

        $customer = DB::table('ecommerce_customers')->where('email', 'client@example.test')->first();
        $this->assertNotNull($customer);
        $this->assertDatabaseHas('ecommerce_orders', [
            'company_id' => 'kora',
            'customer_id' => $customer->id,
        ]);
        $this->assertDatabaseHas('ecommerce_products', ['id' => $productId, 'stock' => 2]);
    }

    public function test_customer_session_cannot_cross_store_or_customer_boundaries(): void
    {
        $this->createStore('kora', 'kora-client');
        $this->createStore('other-company', 'other-client');
        $this->createProduct('kora', 'kora-product', 1000, 2);

        $customerA = $this->createCustomer('customer-a', 'kora', 'a@example.test');
        $customerB = $this->createCustomer('customer-b', 'kora', 'b@example.test');
        $customerToken = EcommerceCustomerAuth::issueSession($customerA);

        $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $customerToken)
            ->getJson('/api/shop/other-client/customer/bootstrap')
            ->assertUnauthorized();

        $orderId = 'order-customer-a';
        DB::table('ecommerce_orders')->insert([
            'id' => $orderId,
            'company_id' => 'kora',
            'customer_id' => $customerA->id,
            'reference' => 'CMD-CLIENTA',
            'customer_name' => $customerA->name,
            'customer_email' => $customerA->email,
            'customer_phone' => '',
            'shipping_address' => 'Dakar',
            'note' => '',
            'total' => 1000,
            'status' => 'NOUVELLE',
            'payment_status' => 'À CONFIRMER',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $otherToken = EcommerceCustomerAuth::issueSession($customerB);
        $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $otherToken)
            ->getJson('/api/shop/kora-client/customer/orders/'.$orderId)
            ->assertNotFound();
    }

    private function createStore(string $companyId, string $slug): void
    {
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-'.$companyId,
            'company_id' => $companyId,
            'slug' => $slug,
            'name' => 'Boutique '.$companyId,
            'description' => 'Boutique de test',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#D69E2E',
            'accent_color' => '#172033',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createProduct(string $companyId, string $slug, int $price, int $stock): string
    {
        $id = 'product-'.Str::uuid();
        DB::table('ecommerce_products')->insert([
            'id' => $id,
            'company_id' => $companyId,
            'name' => 'Produit '.$slug,
            'slug' => $slug,
            'sku' => strtoupper($slug),
            'description' => '',
            'category' => 'Général',
            'price' => $price,
            'compare_at_price' => null,
            'stock' => $stock,
            'image_url' => '',
            'featured' => false,
            'status' => 'PUBLISHED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function createCustomer(string $id, string $companyId, string $email): object
    {
        DB::table('ecommerce_customers')->insert([
            'id' => $id,
            'company_id' => $companyId,
            'email' => $email,
            'name' => 'Client '.$id,
            'phone' => '',
            'password_hash' => MaximusPassword::hash('motdepasse-solide'),
            'status' => 'ACTIF',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('ecommerce_customers')->where('id', $id)->first();
    }
}