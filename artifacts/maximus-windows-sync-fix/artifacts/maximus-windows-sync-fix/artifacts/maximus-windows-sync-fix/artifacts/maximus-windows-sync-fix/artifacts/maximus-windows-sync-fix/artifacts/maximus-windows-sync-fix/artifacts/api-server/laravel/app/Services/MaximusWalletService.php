<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

final class MaximusWalletService
{
    private const WALLET_ID = 'maximus-main-wallet';

    public function __construct(
        private readonly DiamanoPayService $diamanoPay,
        private readonly EcommerceCommissionPolicy $commissionPolicy,
    ) {}

    public function bootstrap(): array
    {
        $wallet = $this->wallet();

        return [
            'wallet' => $this->walletPayload($wallet),
            'withdrawals' => $this->withdrawals(),
            'ledger' => $this->ledger(),
            'commissionPolicy' => $this->commissionPolicy->payload(),
        ];
    }

    public function updatePayoutAccount(string $mobile, string $beneficiaryName): array
    {
        $wallet = $this->wallet();
        DB::table('maximus_wallets')->where('id', $wallet->id)->update([
            'payout_mobile' => trim($mobile),
            'payout_name' => trim($beneficiaryName),
            'updated_at' => now(),
        ]);

        return $this->walletPayload($this->wallet());
    }

    public function creditCommission(string $companyId, string $orderId, array $commission, array $metadata = []): void
    {
        $amount = (int) ($commission['maximusCommission'] ?? 0);
        if ($amount <= 0) {
            return;
        }

        $key = 'sale-commission:'.$orderId;
        $wallet = DB::table('maximus_wallets')->where('id', self::WALLET_ID)->lockForUpdate()->first();
        if (! $wallet) {
            $this->createWallet();
            $wallet = DB::table('maximus_wallets')->where('id', self::WALLET_ID)->lockForUpdate()->first();
        }
        if (! $wallet) {
            throw new RuntimeException('MAXIMUS_WALLET_NOT_FOUND');
        }
        if (DB::table('maximus_wallet_ledger')->where('idempotency_key', $key)->exists()) {
            return;
        }

        DB::table('maximus_wallets')->where('id', self::WALLET_ID)->update([
            'available_balance' => DB::raw('available_balance + '.$amount),
            'total_credited' => DB::raw('total_credited + '.$amount),
            'updated_at' => now(),
        ]);
        $this->ledgerInsert(
            $wallet,
            'SALE_COMMISSION',
            'CREDIT',
            $amount,
            'ORDER',
            $orderId,
            $key,
            [
                ...$metadata,
                'companyId' => $companyId,
                'grossAmount' => (int) ($commission['grossAmount'] ?? 0),
                'providerFee' => (int) ($commission['providerFee'] ?? 0),
                'maximusCommission' => $amount,
                'sellerNet' => (int) ($commission['sellerNet'] ?? 0),
            ],
        );
    }

    public function reverseCommission(string $companyId, string $orderId): void
    {
        $credit = DB::table('maximus_wallet_ledger')
            ->where('reference_type', 'ORDER')
            ->where('reference_id', $orderId)
            ->where('type', 'SALE_COMMISSION')
            ->whereNull('reversed_at')
            ->lockForUpdate()
            ->first();
        if (! $credit) {
            return;
        }

        $wallet = DB::table('maximus_wallets')->where('id', self::WALLET_ID)->lockForUpdate()->first();
        if (! $wallet || (int) $wallet->available_balance < (int) $credit->amount) {
            throw new RuntimeException('MAXIMUS_COMMISSION_NOT_AVAILABLE_FOR_REVERSAL');
        }

        DB::table('maximus_wallets')->where('id', self::WALLET_ID)->update([
            'available_balance' => DB::raw('available_balance - '.(int) $credit->amount),
            'updated_at' => now(),
        ]);
        DB::table('maximus_wallet_ledger')->where('id', $credit->id)->update([
            'reversed_at' => now(),
            'updated_at' => now(),
        ]);
        $this->ledgerInsert(
            $wallet,
            'SALE_COMMISSION_REVERSAL',
            'DEBIT',
            (int) $credit->amount,
            'ORDER',
            $orderId,
            'sale-commission-reversal:'.$orderId,
            ['companyId' => $companyId],
        );
    }

    public function requestWithdrawal(array $input, string $idempotencyKey): object
    {
        $amount = (int) $input['amount'];
        $createdFresh = false;

        $created = DB::transaction(function () use ($amount, $input, $idempotencyKey, &$createdFresh): object {
            $wallet = DB::table('maximus_wallets')->where('id', self::WALLET_ID)->lockForUpdate()->first();
            $existing = $idempotencyKey === ''
                ? null
                : DB::table('maximus_withdrawals')->where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                if ((int) $existing->amount !== $amount) {
                    throw new RuntimeException('IDEMPOTENCY_CONFLICT');
                }

                return $existing;
            }
            if (! $wallet || (int) $wallet->available_balance < $amount) {
                throw new RuntimeException('MAXIMUS_SOLDE_INSUFFISANT');
            }

            $mobile = trim((string) $input['mobile']);
            $name = trim((string) $input['beneficiaryName']);
            $id = 'maximus-withdrawal-'.Str::uuid();
            DB::table('maximus_withdrawals')->insert([
                'id' => $id,
                'wallet_id' => $wallet->id,
                'amount' => $amount,
                'fee' => 0,
                'net_amount' => $amount,
                'provider' => 'WAVE',
                'mobile' => $mobile,
                'beneficiary_name' => $name,
                'status' => 'PROCESSING',
                'provider_payout_id' => null,
                'idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                'failure_reason' => '',
                'requested_at' => now(),
                'processed_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $createdFresh = true;
            DB::table('maximus_wallets')->where('id', $wallet->id)->update([
                'available_balance' => DB::raw('available_balance - '.$amount),
                'reserved_balance' => DB::raw('reserved_balance + '.$amount),
                'updated_at' => now(),
            ]);
            $this->ledgerInsert($wallet, 'WITHDRAWAL_RESERVED', 'DEBIT', $amount, 'MAXIMUS', $id, 'maximus-withdrawal:'.$id.':reserve');

            return DB::table('maximus_withdrawals')->where('id', $id)->first();
        });

        if (! $createdFresh) {
            return $created;
        }

        try {
            $response = $this->diamanoPay->payout([
                'amount' => (int) $created->amount,
                'provider' => $created->provider,
                'mobile' => $created->mobile,
                'name' => $created->beneficiary_name,
            ], 'maximus-withdrawal:'.$created->id);
            $this->applyProviderStatus($created->id, $response);
        } catch (Throwable $error) {
            $this->failWithdrawal($created->id, 'Le retrait DiamanoPay a échoué.');
        }

        return DB::table('maximus_withdrawals')->where('id', $created->id)->first();
    }

    public function applyProviderStatus(string $withdrawalId, array $providerResponse): void
    {
        $data = is_array($providerResponse['data'] ?? null)
            ? array_merge($providerResponse, $providerResponse['data'])
            : $providerResponse;
        $status = strtoupper(trim((string) ($data['status'] ?? $data['state'] ?? 'PENDING')));
        $providerId = trim((string) ($data['id'] ?? $data['payout_id'] ?? $data['payoutId'] ?? ''));
        $success = in_array($status, ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'COMPLETED', 'SETTLED', 'PAID'], true);
        $failure = in_array($status, ['FAILED', 'CANCELLED', 'CANCELED', 'DECLINED', 'REJECTED', 'EXPIRED', 'ERROR', 'DENIED'], true);

        DB::transaction(function () use ($withdrawalId, $providerId, $success, $failure, $status): void {
            $withdrawal = DB::table('maximus_withdrawals')->where('id', $withdrawalId)->lockForUpdate()->first();
            if (! $withdrawal || $withdrawal->status !== 'PROCESSING') {
                return;
            }
            $wallet = DB::table('maximus_wallets')->where('id', self::WALLET_ID)->lockForUpdate()->first();
            if (! $wallet) {
                throw new RuntimeException('MAXIMUS_WALLET_NOT_FOUND');
            }

            if ($success) {
                DB::table('maximus_wallets')->where('id', $wallet->id)->update([
                    'reserved_balance' => DB::raw('reserved_balance - '.(int) $withdrawal->amount),
                    'updated_at' => now(),
                ]);
                $this->ledgerInsert($wallet, 'WITHDRAWAL_PAID', 'DEBIT', (int) $withdrawal->amount, 'MAXIMUS', $withdrawal->id, 'maximus-withdrawal:'.$withdrawal->id.':paid');
                DB::table('maximus_withdrawals')->where('id', $withdrawal->id)->update([
                    'status' => 'SUCCEEDED',
                    'provider_payout_id' => $providerId !== '' ? $providerId : $withdrawal->provider_payout_id,
                    'processed_at' => now(),
                    'updated_at' => now(),
                ]);

                return;
            }

            if ($failure) {
                $this->restoreWithdrawal($wallet, $withdrawal);
                DB::table('maximus_withdrawals')->where('id', $withdrawal->id)->update([
                    'status' => 'FAILED',
                    'provider_payout_id' => $providerId !== '' ? $providerId : $withdrawal->provider_payout_id,
                    'failure_reason' => 'Le retrait DiamanoPay a échoué ('.$status.').',
                    'processed_at' => now(),
                    'updated_at' => now(),
                ]);

                return;
            }

            DB::table('maximus_withdrawals')->where('id', $withdrawal->id)->update([
                'provider_payout_id' => $providerId !== '' ? $providerId : $withdrawal->provider_payout_id,
                'updated_at' => now(),
            ]);
        });
    }

    public function withdrawalByProviderId(string $providerId): ?object
    {
        return DB::table('maximus_withdrawals')->where('provider_payout_id', $providerId)->first();
    }

    private function failWithdrawal(string $withdrawalId, string $reason): void
    {
        DB::transaction(function () use ($withdrawalId, $reason): void {
            $withdrawal = DB::table('maximus_withdrawals')->where('id', $withdrawalId)->lockForUpdate()->first();
            if (! $withdrawal || $withdrawal->status !== 'PROCESSING') {
                return;
            }
            $wallet = DB::table('maximus_wallets')->where('id', self::WALLET_ID)->lockForUpdate()->first();
            if (! $wallet) {
                return;
            }
            $this->restoreWithdrawal($wallet, $withdrawal);
            DB::table('maximus_withdrawals')->where('id', $withdrawal->id)->update([
                'status' => 'FAILED',
                'failure_reason' => $reason,
                'processed_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    private function restoreWithdrawal(object $wallet, object $withdrawal): void
    {
        $amount = (int) $withdrawal->amount;
        DB::table('maximus_wallets')->where('id', $wallet->id)->update([
            'reserved_balance' => DB::raw('reserved_balance - '.$amount),
            'available_balance' => DB::raw('available_balance + '.$amount),
            'updated_at' => now(),
        ]);
        $this->ledgerInsert($wallet, 'WITHDRAWAL_RELEASED', 'DEBIT', $amount, 'MAXIMUS', $withdrawal->id, 'maximus-withdrawal:'.$withdrawal->id.':release');
    }

    private function ledgerInsert(object $wallet, string $type, string $direction, int $amount, string $referenceType, string $referenceId, string $idempotencyKey, array $metadata = []): void
    {
        if (DB::table('maximus_wallet_ledger')->where('idempotency_key', $idempotencyKey)->exists()) {
            return;
        }
        DB::table('maximus_wallet_ledger')->insert([
            'id' => 'maximus-ledger-'.Str::uuid(),
            'wallet_id' => $wallet->id,
            'type' => $type,
            'direction' => $direction,
            'amount' => $amount,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'idempotency_key' => $idempotencyKey,
            'metadata' => $metadata !== [] ? json_encode($metadata, JSON_THROW_ON_ERROR) : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createWallet(): void
    {
        DB::table('maximus_wallets')->insertOrIgnore([
            'id' => self::WALLET_ID,
            'currency' => 'XOF',
            'available_balance' => 0,
            'reserved_balance' => 0,
            'total_credited' => 0,
            'payout_mobile' => '',
            'payout_name' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function wallet(): object
    {
        $wallet = DB::table('maximus_wallets')->where('id', self::WALLET_ID)->first();
        if ($wallet) {
            return $wallet;
        }

        $this->createWallet();

        return DB::table('maximus_wallets')->where('id', self::WALLET_ID)->first();
    }

    private function walletPayload(object $wallet): array
    {
        return [
            'currency' => $wallet->currency,
            'availableBalance' => (int) $wallet->available_balance,
            'reservedBalance' => (int) $wallet->reserved_balance,
            'totalCredited' => (int) $wallet->total_credited,
            'payoutProvider' => 'WAVE',
            'payoutMobile' => $wallet->payout_mobile,
            'payoutName' => $wallet->payout_name,
        ];
    }

    private function withdrawals(): array
    {
        return DB::table('maximus_withdrawals')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (object $row): array => [
                'id' => $row->id,
                'amount' => (int) $row->amount,
                'fee' => (int) $row->fee,
                'netAmount' => (int) $row->net_amount,
                'totalDebit' => (int) $row->amount + (int) $row->fee,
                'provider' => $row->provider,
                'mobile' => $row->mobile,
                'beneficiaryName' => $row->beneficiary_name,
                'status' => $row->status,
                'providerPayoutId' => $row->provider_payout_id,
                'failureReason' => $row->failure_reason,
                'requestedAt' => $row->requested_at,
                'processedAt' => $row->processed_at,
            ])
            ->all();
    }

    private function ledger(): array
    {
        return DB::table('maximus_wallet_ledger')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (object $row): array => [
                'id' => $row->id,
                'type' => $row->type,
                'direction' => $row->direction,
                'amount' => (int) $row->amount,
                'referenceType' => $row->reference_type,
                'referenceId' => $row->reference_id,
                'createdAt' => $row->created_at,
            ])
            ->all();
    }
}
