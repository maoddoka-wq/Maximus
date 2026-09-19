<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ArchivedPublicAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_tenant_succeeds_but_archived_or_deleted_tenant_is_hidden_on_every_public_selector(): void
    {
        $this->company('public-active');
        $this->company('public-archived', 'ARCHIVÉ', now());
        ModuleCatalog::ensureCompanyAccess('public-active', ['ecommerce', 'transport']);
        // Reproduce a legacy archive whose publication and module rows were not revoked.
        ModuleCatalog::ensureCompanyAccess('public-archived', ['ecommerce', 'transport']);
        $this->store('public-active', 'active-shop');
        $this->store('public-archived', 'archived-shop');
        $this->domain('public-archived', 'archived-shop.example.test');

        $this->getJson('/api/shop/active-shop')->assertOk();

        $tripCount = DB::table('transport_trips')->count();
        foreach ([
            ['GET', '/api/shop/archived-shop'],
            ['POST', '/api/shop/archived-shop/orders'],
            ['GET', '/api/shop/archived-shop/customer/session'],
            ['GET', '/api/shop/archived-shop/customer/orders/old/items/file/download'],
            ['POST', '/api/shop/archived-shop/transport/trips'],
            ['GET', '/api/product-images/public-archived/old.png'],
        ] as [$method, $uri]) {
            $this->json($method, $uri)->assertNotFound()
                ->assertJsonPath('code', 'INSTALLATION_COMPANY_ONLY');
        }
        foreach ([
            ['POST', '/api/shop-domain/orders'],
            ['GET', '/api/shop-domain/customer/session'],
            ['POST', '/api/shop-domain/transport/trips'],
        ] as [$method, $uri]) {
            $this->json($method, 'http://archived-shop.example.test'.$uri)->assertNotFound()
                ->assertJsonPath('code', 'INSTALLATION_COMPANY_ONLY');
        }
        $this->assertSame($tripCount, DB::table('transport_trips')->count());

        config([
            'maximus.deployment_mode' => 'dedicated',
            'maximus.installation_company_id' => 'public-archived',
        ]);
        $this->getJson('/api/shop/archived-shop')->assertNotFound()
            ->assertJsonPath('code', 'INSTALLATION_COMPANY_ONLY');

        config(['maximus.installation_company_id' => 'public-active']);
        $this->getJson('/api/shop/active-shop')->assertOk();
    }

    public function test_signed_payment_webhook_can_reconcile_an_existing_order_after_company_archive(): void
    {
        $this->company('archived-paid-order', 'ARCHIVÉ', now());
        DB::table('ecommerce_orders')->insert([
            'id' => 'archived-order',
            'company_id' => 'archived-paid-order',
            'reference' => 'CMD-ARCHIVED-ORDER',
            'customer_name' => 'Ancien client',
            'customer_email' => 'ancien@example.test',
            'customer_phone' => '',
            'shipping_address' => 'Dakar',
            'note' => '',
            'total' => 5000,
            'status' => 'NOUVELLE',
            'payment_status' => 'PENDING',
            'payment_charge_id' => 'charge-archived-order',
            'payment_checkout_url' => '',
            'payment_failure_reason' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        config(['services.diamanopay.webhook_secret' => 'archived-order-secret']);
        $body = json_encode([
            'data' => ['id' => 'charge-archived-order', 'status' => 'SUCCEEDED'],
        ], JSON_THROW_ON_ERROR);

        $this->call('POST', '/api/payments/diamanopay/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_DIAMANOPAY_SIGNATURE' => hash_hmac('sha256', $body, 'archived-order-secret'),
        ], $body)->assertOk()->assertJsonPath('received', true);

        $this->assertDatabaseHas('ecommerce_orders', [
            'id' => 'archived-order',
            'company_id' => 'archived-paid-order',
            'payment_status' => 'PAID',
        ]);
    }

    private function company(string $id, string $status = 'ACTIF', mixed $deletedAt = null): void
    {
        Company::query()->create([
            'id' => $id,
            'name' => 'Entreprise '.$id,
            'manager' => 'Direction',
            'email' => $id.'@example.test',
            'phone' => '',
            'country' => 'Sénégal',
            'sector' => 'Commerce',
            'status' => $status,
            'requested_modules' => ['ecommerce', 'transport'],
            'requested_module_pack_ids' => [],
            'requested_module_features' => [],
            'requested_module_permissions' => [],
            'deleted_at' => $deletedAt,
        ]);
    }

    private function store(string $companyId, string $slug): void
    {
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-'.$slug,
            'company_id' => $companyId,
            'slug' => $slug,
            'name' => 'Boutique '.$slug,
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

    private function domain(string $companyId, string $domain): void
    {
        DB::table('ecommerce_domains')->insert([
            'id' => 'domain-'.$companyId,
            'company_id' => $companyId,
            'domain' => $domain,
            'target_host' => 'central.example.test',
            'verification_token' => 'legacy-proof',
            'status' => 'ACTIVE',
            'last_error' => '',
            'verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}