<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PayrollTest extends TestCase
{
    use RefreshDatabase;

    public function test_beneficiaries_are_scoped_and_account_numbers_are_encrypted(): void
    {
        $request = $this->asActor();
        $created = $request->postJson('/api/payroll/beneficiaries?companyId=kora', [
            'fullName' => 'Awa Ndiaye',
            'mobile' => '+221770000000',
            'accountNumber' => 'WAVE-ACCOUNT-001',
            'provider' => 'WAVE',
            'monthlySalary' => 250000,
            'paymentDay' => 28,
        ])->assertCreated();

        $id = $created->json('id');
        $this->assertDatabaseMissing('payroll_beneficiaries', ['account_number' => 'WAVE-ACCOUNT-001']);
        $created->assertJsonPath('accountNumberMasked', '••••••••••••-001');
        $request->getJson('/api/payroll/bootstrap?companyId=kora')
            ->assertOk()
            ->assertJsonPath('beneficiaries.0.fullName', 'Awa Ndiaye');

        $this->getJson('/api/payroll/bootstrap?companyId=other-company')->assertForbidden();
        $request->deleteJson('/api/payroll/beneficiaries/'.$id.'?companyId=kora')->assertOk();
        $request->getJson('/api/payroll/bootstrap?companyId=kora')->assertJsonCount(0, 'beneficiaries');
    }

    public function test_batch_lifecycle_is_persisted_and_insufficient_balance_blocks_payout(): void
    {
        $request = $this->asActor();
        $beneficiary = $request->postJson('/api/payroll/beneficiaries?companyId=kora', [
            'fullName' => 'Mamadou Fall',
            'mobile' => '+221770000001',
            'accountNumber' => 'WAVE-ACCOUNT-002',
            'provider' => 'WAVE',
            'monthlySalary' => 180000,
            'paymentDay' => 28,
        ])->json('id');
        $batch = $request->postJson('/api/payroll/batches?companyId=kora', [
            'period' => '2026-09',
            'paymentDate' => '2026-09-30',
            'beneficiaryIds' => [$beneficiary],
        ])->assertCreated()->json('batch.id');

        $request->postJson("/api/payroll/batches/{$batch}/submit?companyId=kora")->assertOk()->assertJsonPath('batch.status', 'PENDING_APPROVAL');
        $request->postJson("/api/payroll/batches/{$batch}/approve?companyId=kora")->assertOk()->assertJsonPath('batch.status', 'APPROVED');
        Config::set('services.diamanopay.access_token', 'test-token');
        Config::set('services.diamanopay.webhook_secret', 'test-secret');
        $request->postJson("/api/payroll/batches/{$batch}/payout?companyId=kora")
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Le solde du portefeuille de paie ne couvre pas cette paie.');
    }

    public function test_topup_is_idempotent_and_webhook_credits_the_wallet_once(): void
    {
        Config::set('services.diamanopay.access_token', 'test-token');
        Config::set('services.diamanopay.webhook_secret', 'test-secret');
        Http::fake([
            'https://api.diamanopay.com/api/charges' => Http::response([
                'data' => ['id' => 'charge-payroll-1', 'checkoutUrl' => 'https://checkout.example/payroll-1'],
            ], 201),
        ]);

        $request = $this->asActor();
        $first = $request->postJson('/api/payroll/wallet/topups?companyId=kora', [
            'amount' => 500000,
            'idempotencyKey' => 'payroll-topup-test',
        ])->assertCreated();
        $request->postJson('/api/payroll/wallet/topups?companyId=kora', [
            'amount' => 500000,
            'idempotencyKey' => 'payroll-topup-test',
        ])->assertCreated()->assertJsonPath('topup.id', $first->json('topup.id'));

        $body = json_encode(['id' => 'charge-payroll-1', 'status' => 'PAID'], JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', $body, 'test-secret');
        $this->call('POST', '/api/payments/diamanopay/webhook', [], [], [], [
            'HTTP_X-Diamanopay-Signature' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertOk();
        $this->call('POST', '/api/payments/diamanopay/webhook', [], [], [], [
            'HTTP_X-Diamanopay-Signature' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertOk();

        $request->getJson('/api/payroll/bootstrap?companyId=kora')
            ->assertJsonPath('wallet.availableBalance', 500000)
            ->assertJsonPath('topups.0.status', 'CONFIRMED');
        $this->assertDatabaseCount('payroll_wallet_ledger', 1);
    }

    public function test_employee_with_canonical_balance_permission_can_create_a_topup(): void
    {
        Config::set('services.diamanopay.access_token', 'test-token');
        Config::set('services.diamanopay.webhook_secret', 'test-secret');
        Http::fake([
            'https://api.diamanopay.com/api/charges' => Http::response([
                'data' => ['id' => 'charge-payroll-canonical', 'checkoutUrl' => 'https://checkout.example/payroll-canonical'],
            ], 201),
        ]);

        $permissions = [
            'paie' => ['voir'],
            'paie:menu:solde-de-paie' => ['voir', 'modifier'],
        ];
        $this->asActor('employee', $permissions)->postJson('/api/payroll/wallet/topups?companyId=kora', [
            'amount' => 100000,
            'idempotencyKey' => 'payroll-canonical-balance',
        ])->assertCreated()
            ->assertJsonPath('topup.status', 'PENDING');
    }

    private function asActor(string $role = 'company_admin', array $permissions = []): self
    {
        $user = AuthUser::query()->create([
            'id' => 'payroll-admin-'.uniqid(),
            'email' => 'payroll-'.uniqid().'@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Responsable Paie',
            'role' => $role,
            'company_id' => 'kora',
            'employee_id' => null,
            'sector_ids' => [],
            'permissions' => $permissions,
            'status' => 'ACTIF',
        ]);

        return $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}