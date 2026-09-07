<?php

namespace Tests\Feature;

use App\Contracts\PaymentProviderInterface;
use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_credentials_are_not_reported_as_missing_and_provider_is_singleton(): void
    {
        Config::set([
            'payments.diamanopay.base_url' => 'https://api.diamanopay.com',
            'payments.diamanopay.access_token' => 'access-token-test',
            'payments.diamanopay.client_id' => null,
            'payments.diamanopay.client_secret' => null,
            'payments.callback_url' => '',
            'payments.webhook_url' => '',
        ]);
        Http::fake([
            'https://api.diamanopay.com/api/charges' => Http::response([
                'chargeId' => 'charge-configured-test',
                'status' => 'PENDING',
                'paymentUrl' => 'https://pay.diamanopay.com/checkout/configured-test',
            ], 201),
        ]);

        $first = $this->app->make(PaymentProviderInterface::class);
        $second = $this->app->make(PaymentProviderInterface::class);
        $result = $first->initialize([
            'public_reference' => 'MAX-CONFIGURED-TEST',
            'amount' => 1000,
            'currency' => 'XOF',
            'description' => 'Configuration stable',
            'payment_method' => 'WAVE',
            'metadata' => [],
        ]);

        $this->assertSame($first, $second);
        $this->assertTrue($result['ok']);
        $this->assertNotSame('DIAMANOPAY_NOT_CONFIGURED', $result['error_code'] ?? null);
    }

    public function test_missing_diamanopay_configuration_is_reported_as_a_failed_payment(): void
    {
        Config::set([
            'payments.diamanopay.base_url' => '',
            'payments.diamanopay.client_id' => null,
            'payments.diamanopay.client_secret' => null,
            'payments.diamanopay.access_token' => null,
            'payments.callback_url' => '',
            'payments.webhook_url' => '',
        ]);
        $request = $this->asActor();

        $request->postJson('/api/payments', [
            'sourceModule' => 'ecommerce',
            'sourceType' => 'ecommerce_order',
            'sourceId' => 'order-unconfigured-test',
            'amount' => 1000,
            'currency' => 'XOF',
            'paymentMethod' => 'WAVE',
            'idempotencyKey' => 'payment-unconfigured-1',
        ])->assertCreated()
            ->assertJsonPath('status', 'FAILED')
            ->assertJsonPath('providerMessage', 'DiamanoPay n’est pas configuré côté serveur.');
    }

    public function test_client_credentials_and_charge_use_the_official_diamanopay_contract(): void
    {
        Config::set([
            'payments.diamanopay.base_url' => 'https://api.diamanopay.com',
            'payments.diamanopay.client_id' => 'client-id-test',
            'payments.diamanopay.client_secret' => 'client-secret-test',
            'payments.diamanopay.access_token' => null,
            'payments.callback_url' => 'https://maximus.test/',
            'payments.webhook_url' => 'https://maximus.test/api/webhooks/diamanopay',
        ]);
        Http::fake([
            'https://api.diamanopay.com/oauth2/token' => Http::response([
                'accessToken' => 'oauth-access-token-test',
            ], 200),
            'https://api.diamanopay.com/api/charges' => Http::response([
                'chargeId' => 'charge-oauth-test',
                'status' => 'PENDING',
                'paymentUrl' => 'https://pay.diamanopay.com/checkout/oauth-test',
            ], 201),
        ]);

        $response = $this->asActor()->postJson('/api/payments', [
            'sourceModule' => 'ecommerce',
            'sourceType' => 'ecommerce_order',
            'sourceId' => 'order-oauth-test',
            'amount' => 1200,
            'currency' => 'XOF',
            'paymentMethod' => 'ORANGE_MONEY',
            'description' => 'Commande OAuth',
            'idempotencyKey' => 'payment-oauth-1',
        ])->assertCreated()
            ->assertJsonPath('status', 'PENDING')
            ->assertJsonPath('checkoutUrl', 'https://pay.diamanopay.com/checkout/oauth-test');

        Http::assertSent(function ($request): bool {
            if ($request->url() !== 'https://api.diamanopay.com/oauth2/token') {
                return false;
            }
            $data = $request->data();
            return $request->method() === 'POST'
                && ($data['grant_type'] ?? null) === 'client_credentials'
                && ($data['client_id'] ?? null) === 'client-id-test'
                && ($data['client_secret'] ?? null) === 'client-secret-test';
        });
        Http::assertSent(function ($request): bool {
            if ($request->url() !== 'https://api.diamanopay.com/api/charges') {
                return false;
            }
            $data = $request->data();
            return $request->method() === 'POST'
                && ($data['amount'] ?? null) === 1200
                && ($data['provider'] ?? null) === 'ORANGE_MONEY'
                && is_string($data['clientReference'] ?? null)
                && ($data['redirectUrl'] ?? null) === 'https://maximus.test/'
                && ($data['webhook'] ?? null) === 'https://maximus.test/api/webhooks/diamanopay';
        });
    }

    public function test_payment_creation_is_idempotent_and_webhook_settles_wallet_once(): void
    {
        $this->configureDiamanoPay();
        $request = $this->asActor();
        $first = $request->postJson('/api/payments', [
            'sourceModule' => 'ecommerce',
            'sourceType' => 'ecommerce_order',
            'sourceId' => 'order-payment-test',
            'amount' => 10000,
            'currency' => 'XOF',
            'paymentMethod' => 'WAVE',
            'description' => 'Commande de test',
            'idempotencyKey' => 'payment-test-1',
        ])->assertCreated()
            ->assertJsonPath('status', 'PENDING');

        $request->postJson('/api/payments', [
            'sourceModule' => 'ecommerce',
            'sourceType' => 'ecommerce_order',
            'sourceId' => 'order-payment-test',
            'amount' => 10000,
            'currency' => 'XOF',
            'paymentMethod' => 'WAVE',
            'description' => 'Commande de test',
            'idempotencyKey' => 'payment-test-1',
        ])->assertCreated()->assertJson($first->json());

        $reference = $first->json('publicReference');
        $raw = json_encode([
            'status' => 'SUCCESS',
            'paymentService' => 'WAVE',
            'transactionId' => 'diama-transaction-1',
            'paymentRequestId' => $first->json('providerTransactionId'),
            'extraData' => ['clientReference' => $reference],
        ], JSON_THROW_ON_ERROR);

        $this->postJson('/api/webhooks/diamanopay', json_decode($raw, true))
            ->assertOk()
            ->assertJsonPath('status', 'PAID');

        $this->postJson('/api/webhooks/diamanopay', json_decode($raw, true))
            ->assertOk()
            ->assertJsonPath('status', 'PAID');

        $this->assertDatabaseHas('wallets', [
            'tenant_id' => 'kora',
            'owner_type' => 'SELLER',
            'owner_id' => 'kora',
            'available_balance' => 10000,
        ]);
        $this->assertDatabaseCount('ledger_entries', 1);
        $this->assertDatabaseCount('payment_events', 1);
    }

    public function test_refund_is_bounded_and_withdrawal_reserves_only_available_balance(): void
    {
        $this->configureDiamanoPay();
        $request = $this->asActor();
        $payment = $request->postJson('/api/payments', [
            'sourceModule' => 'ecommerce',
            'sourceType' => 'ecommerce_order',
            'sourceId' => 'order-refund-test',
            'amount' => 4000,
            'currency' => 'XOF',
            'paymentMethod' => 'WAVE',
            'idempotencyKey' => 'payment-refund-test',
        ])->json();

        $raw = json_encode([
            'status' => 'SUCCESS',
            'paymentService' => 'WAVE',
            'transactionId' => 'diama-transaction-refund',
            'paymentRequestId' => $payment['providerTransactionId'],
            'extraData' => ['clientReference' => $payment['publicReference']],
        ], JSON_THROW_ON_ERROR);
        $this->postJson('/api/webhooks/diamanopay', json_decode($raw, true))
            ->assertOk();

        $request->postJson('/api/payments/'.$payment['id'].'/refunds', [
            'amount' => 5000,
            'reason' => 'Montant volontairement trop élevé',
            'idempotencyKey' => 'refund-too-high',
        ])->assertStatus(422);

        $account = $request->postJson('/api/wallet/payout-accounts', [
            'accountType' => 'MOBILE_MONEY',
            'operator' => 'ORANGE',
            'accountNumber' => '770000000',
            'beneficiaryName' => 'Vendeur Test',
            'country' => 'SN',
        ])->assertCreated()->json();
        DB::table('payout_accounts')->where('id', $account['id'])->update(['status' => 'ACTIVE']);

        $request->postJson('/api/wallet/withdrawals', [
            'payoutAccountId' => $account['id'],
            'amount' => 2500,
            'currency' => 'XOF',
            'idempotencyKey' => 'withdrawal-test-1',
        ])->assertAccepted()->assertJsonPath('amount', 2500);

        $this->assertDatabaseHas('wallets', [
            'tenant_id' => 'kora',
            'owner_id' => 'kora',
            'available_balance' => 1500,
        ]);
    }

    public function test_payment_endpoints_are_tenant_scoped(): void
    {
        $request = $this->asActor();
        $payment = $request->postJson('/api/payments', [
            'sourceModule' => 'finance',
            'sourceType' => 'manual',
            'sourceId' => 'tenant-scoped-payment',
            'amount' => 1000,
            'currency' => 'XOF',
            'idempotencyKey' => 'tenant-scoped-payment-1',
        ])->json();

        $request->getJson('/api/payments/'.$payment['id'].'?companyId=another-company')
            ->assertForbidden();
    }

    private function asActor(): self
    {
        $user = AuthUser::query()->create([
            'id' => 'payment-company-admin',
            'email' => 'payment-company-admin@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administrateur Finance',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }

    private function configureDiamanoPay(): void
    {
        Config::set([
            'payments.diamanopay.base_url' => 'https://api.diamanopay.com',
            'payments.diamanopay.access_token' => 'test-access-token',
            'payments.webhook_url' => 'https://maximus.test/api/webhooks/diamanopay',
            'payments.callback_url' => 'https://maximus.test/',
        ]);
        Http::fake(function ($request) {
            $url = $request->url();
            if (str_ends_with($url, '/api/charges')) {
                return Http::response([
                    'chargeId' => 'charge-test-1',
                    'status' => 'PENDING',
                    'paymentUrl' => 'https://pay.diamanopay.com/checkout/test',
                ], 201);
            }
            if (str_contains($url, '/api/transaction/')) {
                $transactionId = basename(parse_url($url, PHP_URL_PATH));
                return Http::response([
                    'id' => $transactionId,
                    'status' => 'SUCCESS',
                    'transactionType' => 'PAY_IN',
                    'totalAmount' => str_contains($transactionId, 'refund') ? 4000 : 10000,
                ], 200);
            }
            if (str_contains($url, '/api/payout/refund/')) {
                return Http::response([
                    'success' => true,
                    'message' => 'The refund has been processed successfully.',
                ], 200);
            }
            if (str_ends_with($url, '/api/payout')) {
                return Http::response([
                    'success' => true,
                    'transactionId' => 'payout-test-1',
                    'providerTransactionId' => 'payout-test-1',
                ], 201);
            }

            return Http::response([], 404);
        });
    }
}