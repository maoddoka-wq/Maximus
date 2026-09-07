<?php

namespace App\Services\Payments;

use App\Contracts\PaymentProviderInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class WithdrawalService
{
    public function __construct(
        private readonly PaymentProviderInterface $provider,
        private readonly LedgerService $ledger,
    ) {
    }

    public function createPayoutAccount(array $data): array
    {
        $id = 'payout-account-'.Str::uuid();
        DB::table('payout_accounts')->insert([
            'id' => $id,
            'tenant_id' => $data['tenant_id'],
            'seller_id' => $data['seller_id'],
            'provider' => $data['provider'] ?? 'diamanopay',
            'account_type' => $data['account_type'],
            'operator' => $data['operator'] ?? null,
            'account_number_encrypted' => Crypt::encryptString($data['account_number']),
            'beneficiary_name' => trim($data['beneficiary_name']),
            'country' => strtoupper($data['country']),
            'status' => 'PENDING_VERIFICATION',
            'verified_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->accountPayload(DB::table('payout_accounts')->where('id', $id)->first());
    }

    public function request(array $data): array
    {
        $idempotencyKey = trim($data['idempotency_key']);
        $existing = DB::table('withdrawals')
            ->where('tenant_id', $data['tenant_id'])
            ->where('seller_id', $data['seller_id'])
            ->where('idempotency_key', $idempotencyKey)
            ->first();
        if ($existing) {
            return $this->payload($existing);
        }

        $account = DB::table('payout_accounts')
            ->where('id', $data['payout_account_id'])
            ->where('tenant_id', $data['tenant_id'])
            ->where('seller_id', $data['seller_id'])
            ->where('status', 'ACTIVE')
            ->first();
        if (! $account) {
            throw new \RuntimeException('PAYOUT_ACCOUNT_NOT_AVAILABLE');
        }

        $id = 'withdrawal-'.Str::uuid();
        $wallet = DB::transaction(function () use ($data, $account, $id, $idempotencyKey): object {
            $wallet = $this->ledger->wallet($data['tenant_id'], 'SELLER', $data['seller_id'], $data['currency']);
            if ((int) $wallet->available_balance < (int) $data['amount']) {
                throw new \RuntimeException('INSUFFICIENT_WALLET_BALANCE');
            }
            DB::table('withdrawals')->insert([
                'id' => $id,
                'tenant_id' => $data['tenant_id'],
                'seller_id' => $data['seller_id'],
                'wallet_id' => $wallet->id,
                'payout_account_id' => $account->id,
                'amount' => (int) $data['amount'],
                'fees' => (int) ($data['fees'] ?? 0),
                'net_amount' => (int) $data['amount'] - (int) ($data['fees'] ?? 0),
                'currency' => $data['currency'],
                'provider' => 'diamanopay',
                'provider_reference' => null,
                'status' => 'REQUESTED',
                'idempotency_key' => $idempotencyKey,
                'requested_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->ledger->post([
                'tenant_id' => $data['tenant_id'],
                'wallet_id' => $wallet->id,
                'transaction_id' => $id,
                'type' => 'WITHDRAWAL_DEBIT',
                'direction' => 'DEBIT',
                'amount' => (int) $data['amount'],
                'currency' => $data['currency'],
                'reference' => 'WITHDRAWAL:'.$id.':RESERVATION',
                'description' => 'Réservation du retrait '.$id,
            ]);

            return $wallet;
        });

        $providerResult = $this->provider->payout([
            'reference' => 'MAX-WDR-'.$id,
            'amount' => (int) $data['amount'],
            'net_amount' => (int) $data['amount'] - (int) ($data['fees'] ?? 0),
            'currency' => $data['currency'],
            'account_type' => $account->account_type,
            'operator' => $account->operator,
            'account_number' => Crypt::decryptString($account->account_number_encrypted),
            'beneficiary_name' => $account->beneficiary_name,
        ]);
        $status = $providerResult['status'] === 'PAID' ? 'COMPLETED' : ($providerResult['status'] === 'FAILED' ? 'FAILED' : 'PROCESSING');
        DB::table('withdrawals')->where('id', $id)->update([
            'provider_reference' => $providerResult['provider_transaction_id'] ?? null,
            'status' => $status,
            'failure_reason' => $status === 'FAILED' ? ($providerResult['message'] ?? 'Échec du prestataire.') : null,
            'processed_at' => $status === 'COMPLETED' ? now() : null,
            'updated_at' => now(),
        ]);
        if ($status === 'COMPLETED') {
            DB::table('wallets')->where('id', $wallet->id)->increment('withdrawn_balance', (int) $data['amount']);
        }
        if ($status === 'FAILED') {
            $this->ledger->post([
                'tenant_id' => $data['tenant_id'],
                'wallet_id' => $wallet->id,
                'transaction_id' => $id,
                'type' => 'WITHDRAWAL_REVERSAL',
                'direction' => 'CREDIT',
                'amount' => (int) $data['amount'],
                'currency' => $data['currency'],
                'reference' => 'WITHDRAWAL:'.$id.':REVERSAL',
                'description' => 'Restitution du retrait refusé '.$id,
            ]);
        }

        return $this->payload(DB::table('withdrawals')->where('id', $id)->first());
    }

    public function accountPayload(object $account): array
    {
        $number = Crypt::decryptString($account->account_number_encrypted);
        return [
            'id' => $account->id,
            'sellerId' => $account->seller_id,
            'provider' => $account->provider,
            'accountType' => $account->account_type,
            'operator' => $account->operator,
            'maskedAccountNumber' => str_repeat('•', max(0, strlen($number) - 4)).substr($number, -4),
            'beneficiaryName' => $account->beneficiary_name,
            'country' => $account->country,
            'status' => $account->status,
            'verifiedAt' => $account->verified_at,
        ];
    }

    private function payload(object $withdrawal): array
    {
        return [
            'id' => $withdrawal->id,
            'sellerId' => $withdrawal->seller_id,
            'walletId' => $withdrawal->wallet_id,
            'payoutAccountId' => $withdrawal->payout_account_id,
            'amount' => (int) $withdrawal->amount,
            'fees' => (int) $withdrawal->fees,
            'netAmount' => (int) $withdrawal->net_amount,
            'currency' => $withdrawal->currency,
            'providerReference' => $withdrawal->provider_reference,
            'status' => $withdrawal->status,
            'failureReason' => $withdrawal->failure_reason,
            'requestedAt' => $withdrawal->requested_at,
            'processedAt' => $withdrawal->processed_at,
        ];
    }
}