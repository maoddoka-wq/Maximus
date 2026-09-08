<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Services\DiamanoPayService;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SellerWalletTest extends TestCase
{
    use RefreshDatabase;

    public function test_wallet_is_strictly_scoped_to_the_authenticated_company(): void
    {
        DB::table('seller_wallets')->insert([
            ...$this->walletRow('wallet-other', 'other-company', 8000),
        ]);

        $response = $this->asActor()->getJson('/api/ecommerce/wallet?companyId=kora')->assertOk();

        $response->assertJsonPath('wallet.companyId', 'kora');
        $response->assertJsonPath('wallet.availableBalance', 0);
        $response->assertJsonMissing(['companyId' => 'other-company']);
        $this->getJson('/api/ecommerce/wallet?companyId=other-company')->assertForbidden();
    }

    public function test_paid_webhook_credits_once_and_keeps_funds_pending(): void
    {
        $this->configureDiamano();
        $this->createOrder('order-paid-pending', 'kora', 5000, 'charge-pending');

        $payload = ['data' => ['id' => 'charge-pending', 'status' => 'SUCCEEDED']];
        $this->postSignedWebhook($payload)->assertOk();
        $this->postSignedWebhook($payload)->assertOk();

        $this->assertDatabaseHas('ecommerce_orders', [
            'id' => 'order-paid-pending',
            'payment_status' => 'PAID',
        ]);
        $this->assertDatabaseHas('seller_wallets', [
            'company_id' => 'kora',
            'pending_balance' => 5000,
            'available_balance' => 0,
            'total_credited' => 5000,
        ]);
        $this->assertDatabaseCount('seller_wallet_ledger', 1);
    }

    public function test_pending_funds_become_available_after_seven_days(): void
    {
        $this->configureDiamano();
        $this->createOrder('order-matures', 'kora', 7000, 'charge-matures');

        $this->postSignedWebhook(['data' => ['id' => 'charge-matures', 'status' => 'SUCCEEDED']])->assertOk();
        $this->assertDatabaseHas('seller_wallets', ['company_id' => 'kora', 'pending_balance' => 7000, 'available_balance' => 0]);

        $this->travel(8)->days();
        $this->asActor()->getJson('/api/ecommerce/wallet?companyId=kora')
            ->assertOk()
            ->assertJsonPath('wallet.pendingBalance', 0)
            ->assertJsonPath('wallet.availableBalance', 7000);
        $this->assertDatabaseHas('seller_wallet_ledger', [
            'company_id' => 'kora',
            'type' => 'SALE_RELEASE',
        ]);
    }

    public function test_payment_for_an_already_delivered_order_is_available_immediately(): void
    {
        $this->configureDiamano();
        $this->createOrder('order-delivered', 'kora', 4200, 'charge-delivered', 'LIVRÉE');

        $this->postSignedWebhook(['data' => ['id' => 'charge-delivered', 'status' => 'SUCCEEDED']])->assertOk();

        $this->assertDatabaseHas('seller_wallets', [
            'company_id' => 'kora',
            'pending_balance' => 0,
            'available_balance' => 4200,
        ]);
    }

    public function test_failed_payment_webhook_restores_reserved_stock_only_once(): void
    {
        $this->configureDiamano();
        $this->createStore('kora', 'kora-payments');
        DB::table('ecommerce_products')->insert([
            'id' => 'product-failed-payment',
            'company_id' => 'kora',
            'name' => 'Produit paiement échoué',
            'slug' => 'produit-paiement-echoue',
            'sku' => 'FAILED-PAYMENT-01',
            'description' => '',
            'category' => 'Général',
            'price' => 1500,
            'compare_at_price' => null,
            'stock' => 0,
            'image_url' => '',
            'featured' => false,
            'status' => 'PUBLISHED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->createOrder('order-payment-fails', 'kora', 3000, 'charge-fails');
        DB::table('ecommerce_order_items')->insert([
            'id' => 'order-line-payment-fails',
            'order_id' => 'order-payment-fails',
            'product_id' => 'product-failed-payment',
            'product_name' => 'Produit paiement échoué',
            'unit_price' => 1500,
            'quantity' => 2,
            'line_total' => 3000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $payload = ['data' => ['id' => 'charge-fails', 'status' => 'FAILED']];
        $this->postSignedWebhook($payload)->assertOk();
        $this->postSignedWebhook($payload)->assertOk();

        $this->assertDatabaseHas('ecommerce_orders', [
            'id' => 'order-payment-fails',
            'payment_status' => 'FAILED',
        ]);
        $this->assertDatabaseHas('ecommerce_products', [
            'id' => 'product-failed-payment',
            'stock' => 2,
        ]);
    }

    public function test_public_payment_status_returns_only_the_selected_store_order(): void
    {
        $this->createStore('kora', 'kora-payment-status');
        $this->createOrder('order-public-status', 'kora', 2400, 'charge-public-status');

        $this->getJson('/api/shop/kora-payment-status/orders/order-public-status/payment-status')
            ->assertOk()
            ->assertJsonPath('reference', 'CMD-ORDER-PUBLIC-STATUS')
            ->assertJsonPath('total', 2400)
            ->assertJsonPath('paymentStatus', 'PENDING');

        $this->getJson('/api/shop/unknown-payment-status/orders/order-public-status/payment-status')
            ->assertNotFound();
    }

    public function test_withdrawal_rejects_an_insufficient_available_balance(): void
    {
        $this->configureDiamano();
        DB::table('seller_wallets')->insert($this->walletRow('wallet-kora', 'kora', 900));

        $this->asActor()
            ->postJson('/api/ecommerce/wallet/withdrawals?companyId=kora', [
                'amount' => 1000,
                'idempotencyKey' => 'withdrawal-insufficient',
            ])
            ->assertStatus(422)
            ->assertJsonPath('error', 'Le solde disponible est insuffisant.');

        $this->assertDatabaseCount('seller_withdrawals', 0);
    }

    public function test_pending_withdrawal_is_idempotent_and_failed_payout_restores_funds(): void
    {
        $this->configureDiamano();
        Cache::flush();
        DB::table('seller_wallets')->insert([
            ...$this->walletRow('wallet-kora', 'kora', 10000),
            'payout_mobile' => '+221770000000',
            'payout_name' => 'Entreprise KORA',
        ]);
        Http::fake([
            'https://api.diamanopay.com/oauth2/token' => Http::response(['access_token' => 'test-token'], 200),
            'https://api.diamanopay.com/api/payout' => Http::response(['id' => 'payout-1', 'status' => 'PENDING'], 200),
        ]);

        $payload = [
            'amount' => 6000,
            'idempotencyKey' => 'withdrawal-repeatable',
        ];
        $request = $this->asActor();
        $first = $request
            ->postJson('/api/ecommerce/wallet/withdrawals?companyId=kora', $payload)
            ->assertCreated()
            ->assertJsonPath('withdrawal.status', 'PROCESSING');
        $request
            ->postJson('/api/ecommerce/wallet/withdrawals?companyId=kora', $payload)
            ->assertOk()
            ->assertJsonPath('withdrawal.id', $first->json('withdrawal.id'));

        $this->assertDatabaseHas('seller_wallets', [
            'company_id' => 'kora',
            'available_balance' => 4000,
            'reserved_balance' => 6000,
        ]);
        $this->assertDatabaseCount('seller_withdrawals', 1);
        Http::assertSentCount(2);

        $this->postSignedWebhook([
            'data' => ['id' => 'payout-1', 'status' => 'FAILED'],
            'type' => 'payout.updated',
        ])->assertOk();

        $this->assertDatabaseHas('seller_wallets', [
            'company_id' => 'kora',
            'available_balance' => 10000,
            'reserved_balance' => 0,
        ]);
        $this->assertDatabaseHas('seller_withdrawals', [
            'id' => $first->json('withdrawal.id'),
            'status' => 'FAILED',
        ]);
    }

    public function test_successful_payout_consumes_reserved_funds(): void
    {
        $this->configureDiamano();
        Cache::flush();
        DB::table('seller_wallets')->insert([
            ...$this->walletRow('wallet-kora', 'kora', 10000),
            'payout_mobile' => '+221770000000',
            'payout_name' => 'Entreprise KORA',
        ]);
        Http::fake([
            'https://api.diamanopay.com/oauth2/token' => Http::response(['access_token' => 'test-token'], 200),
            'https://api.diamanopay.com/api/payout' => Http::response(['id' => 'payout-success', 'status' => 'SUCCEEDED'], 200),
        ]);

        $this->asActor()
            ->postJson('/api/ecommerce/wallet/withdrawals?companyId=kora', [
                'amount' => 3000,
                'idempotencyKey' => 'withdrawal-success',
            ])
            ->assertCreated()
            ->assertJsonPath('withdrawal.status', 'SUCCEEDED');

        $this->assertDatabaseHas('seller_wallets', [
            'company_id' => 'kora',
            'available_balance' => 7000,
            'reserved_balance' => 0,
        ]);
    }

    public function test_configured_access_token_is_used_before_oauth(): void
    {
        config([
            'services.diamanopay.access_token' => 'static-test-token',
            'services.diamanopay.webhook_secret' => 'test-webhook-secret',
        ]);
        Http::fake([
            'https://api.diamanopay.com/api/charges' => Http::response([
                'id' => 'charge-static-token',
                'checkout_url' => 'https://checkout.example.test/static-token',
            ], 200),
        ]);

        $charge = app(DiamanoPayService::class)->createCharge([
            'amount' => 2500,
            'currency' => 'XOF',
        ], 'order:static-token');

        $this->assertSame('charge-static-token', $charge['id']);
        Http::assertSentCount(1);
        Http::assertSent(fn ($request): bool => $request->url() === 'https://api.diamanopay.com/api/charges');
    }

    public function test_public_payment_sends_the_configured_provider(): void
    {
        $this->createStore('kora', 'kora-charge');
        $this->createOrder('order-charge-provider', 'kora', 2500, '');
        config([
            'services.diamanopay.access_token' => 'static-test-token',
            'services.diamanopay.provider' => 'WAVE',
            'services.diamanopay.webhook_secret' => 'test-webhook-secret',
        ]);
        Http::fake([
            'https://api.diamanopay.com/api/charges' => Http::response([
                'id' => 'charge-provider',
                'checkout_url' => 'https://checkout.example.test/provider',
            ], 200),
        ]);

        $this->postJson('/api/shop/kora-charge/orders/order-charge-provider/payment', [
            'successUrl' => 'https://maximus-erp.onrender.com/boutique/kora-charge/paiement/success',
            'errorUrl' => 'https://maximus-erp.onrender.com/boutique/kora-charge/paiement/error',
        ])->assertCreated();

        Http::assertSent(function ($request): bool {
            return $request->url() === 'https://api.diamanopay.com/api/charges'
                && $request['provider'] === 'WAVE';
        });
    }

    private function configureDiamano(): void
    {
        config([
            'services.diamanopay.access_token' => null,
            'services.diamanopay.client_id' => 'test-client',
            'services.diamanopay.client_secret' => 'test-secret',
            'services.diamanopay.webhook_secret' => 'test-webhook-secret',
        ]);
    }

    private function postSignedWebhook(array $payload)
    {
        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        return $this->call('POST', '/api/payments/diamanopay/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_DIAMANOPAY_SIGNATURE' => hash_hmac('sha256', $body, 'test-webhook-secret'),
        ], $body);
    }

    private function createOrder(string $id, string $companyId, int $total, string $chargeId, string $status = 'NOUVELLE'): void
    {
        DB::table('ecommerce_orders')->insert([
            'id' => $id,
            'company_id' => $companyId,
            'reference' => 'CMD-'.strtoupper($id),
            'customer_name' => 'Client Test',
            'customer_email' => 'client@example.test',
            'customer_phone' => '',
            'shipping_address' => 'Dakar',
            'note' => '',
            'total' => $total,
            'status' => $status,
            'payment_status' => 'PENDING',
            'payment_charge_id' => $chargeId,
            'payment_checkout_url' => 'https://checkout.example.test/'.$chargeId,
            'payment_failure_reason' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createStore(string $companyId, string $slug): void
    {
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-'.$slug,
            'company_id' => $companyId,
            'slug' => $slug,
            'name' => 'Boutique '.$companyId,
            'description' => 'Boutique test',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#D69E2E',
            'accent_color' => '#172033',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function walletRow(string $id, string $companyId, int $available): array
    {
        return [
            'id' => $id,
            'company_id' => $companyId,
            'currency' => 'XOF',
            'pending_balance' => 0,
            'available_balance' => $available,
            'reserved_balance' => 0,
            'total_credited' => $available,
            'payout_provider' => 'WAVE',
            'payout_mobile' => '',
            'payout_name' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function asActor(): self
    {
        $user = AuthUser::query()->create([
            'id' => 'wallet-company-admin',
            'email' => 'wallet-admin@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Gestionnaire financier',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'employee_id' => null,
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}