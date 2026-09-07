<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_creation_is_idempotent_and_webhook_settles_wallet_once(): void
    {
        $request = $this->asActor();
        $first = $request->postJson('/api/payments', [
            'sourceModule' => 'ecommerce',
            'sourceType' => 'ecommerce_order',
            'sourceId' => 'order-payment-test',
            'amount' => 10000,
            'currency' => 'XOF',
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
            'description' => 'Commande de test',
            'idempotencyKey' => 'payment-test-1',
        ])->assertCreated()->assertJson($first->json());

        $reference = $first->json('publicReference');
        $raw = json_encode([
            'event_id' => 'event-payment-test-1',
            'id' => 'diama-transaction-1',
            'reference' => $reference,
            'amount' => 10000,
            'currency' => 'XOF',
            'status' => 'SUCCESS',
        ], JSON_THROW_ON_ERROR);
        Config::set('payments.diamanopay.webhook_secret', 'payment-test-secret');
        $signature = hash_hmac('sha256', $raw, 'payment-test-secret');

        $this->withHeader('X-DiamanoPay-Signature', $signature)
            ->withHeader('X-DiamanoPay-Event-Id', 'event-payment-test-1')
            ->postJson('/api/webhooks/diamanopay', json_decode($raw, true))
            ->assertOk()
            ->assertJsonPath('status', 'PAID');

        $this->withHeader('X-DiamanoPay-Signature', $signature)
            ->withHeader('X-DiamanoPay-Event-Id', 'event-payment-test-1')
            ->postJson('/api/webhooks/diamanopay', json_decode($raw, true))
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
        $request = $this->asActor();
        $payment = $request->postJson('/api/payments', [
            'sourceModule' => 'ecommerce',
            'sourceType' => 'ecommerce_order',
            'sourceId' => 'order-refund-test',
            'amount' => 4000,
            'currency' => 'XOF',
            'idempotencyKey' => 'payment-refund-test',
        ])->json();

        $raw = json_encode([
            'event_id' => 'event-refund-test',
            'id' => 'diama-transaction-refund',
            'reference' => $payment['publicReference'],
            'amount' => 4000,
            'currency' => 'XOF',
            'status' => 'PAID',
        ], JSON_THROW_ON_ERROR);
        Config::set('payments.diamanopay.webhook_secret', 'payment-test-secret');
        $this->withHeader('X-DiamanoPay-Signature', hash_hmac('sha256', $raw, 'payment-test-secret'))
            ->withHeader('X-DiamanoPay-Event-Id', 'event-refund-test')
            ->postJson('/api/webhooks/diamanopay', json_decode($raw, true))
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
}