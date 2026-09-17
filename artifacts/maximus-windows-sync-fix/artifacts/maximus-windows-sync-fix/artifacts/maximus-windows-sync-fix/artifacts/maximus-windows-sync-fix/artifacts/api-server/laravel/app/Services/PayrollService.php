<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

final class PayrollService
{
    public function __construct(private readonly DiamanoPayService $diamanoPay) {}

    public function bootstrap(string $companyId): array
    {
        $wallet = $this->wallet($companyId);

        return [
            'wallet' => $this->walletPayload($wallet),
            'beneficiaries' => DB::table('payroll_beneficiaries')
                ->where('company_id', $companyId)
                ->where('active', true)
                ->orderBy('full_name')
                ->get()
                ->map(fn (object $row): array => $this->beneficiary($row))
                ->values()
                ->all(),
            'batches' => DB::table('payroll_batches')
                ->where('company_id', $companyId)
                ->orderByDesc('payment_date')
                ->orderByDesc('created_at')
                ->limit(100)
                ->get()
                ->map(fn (object $row): array => $this->batch($row))
                ->values()
                ->all(),
            'items' => DB::table('payroll_batch_items')
                ->where('company_id', $companyId)
                ->orderByDesc('created_at')
                ->limit(500)
                ->get()
                ->map(fn (object $row): array => $this->item($row))
                ->values()
                ->all(),
            'topups' => DB::table('payroll_topups')
                ->where('company_id', $companyId)
                ->orderByDesc('created_at')
                ->limit(50)
                ->get()
                ->map(fn (object $row): array => $this->topup($row))
                ->values()
                ->all(),
        ];
    }

    public function createTopup(string $companyId, int $amount, string $idempotencyKey, string $webhookUrl): array
    {
        if (! $this->diamanoPay->isConfigured()) {
            throw new RuntimeException('DIAMANOPAY_NOT_CONFIGURED');
        }

        $wallet = $this->wallet($companyId);
        $existing = $idempotencyKey === ''
            ? null
            : DB::table('payroll_topups')->where('company_id', $companyId)->where('idempotency_key', $idempotencyKey)->first();
        if ($existing && $existing->checkout_url) {
            return $this->topup($existing);
        }

        $id = $existing?->id ?? 'payroll-topup-'.Str::uuid();
        if (! $existing) {
            DB::table('payroll_topups')->insert([
                'id' => $id,
                'company_id' => $companyId,
                'wallet_id' => $wallet->id,
                'amount' => $amount,
                'status' => 'PENDING',
                'provider' => strtoupper((string) config('services.diamanopay.provider', 'WAVE')),
                'provider_charge_id' => null,
                'checkout_url' => null,
                'idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                'failure_reason' => '',
                'confirmed_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        try {
            $charge = $this->diamanoPay->createCharge([
                'amount' => $amount,
                'currency' => 'XOF',
                'provider' => strtoupper((string) config('services.diamanopay.provider', 'WAVE')),
                'description' => 'Recharge portefeuille paie '.$companyId,
                'clientReference' => $id,
                'webhook' => $webhookUrl,
                'feeOnCustomer' => false,
            ], $idempotencyKey !== '' ? $idempotencyKey : 'payroll-topup:'.$id);
            $data = is_array($charge['data'] ?? null) ? array_merge($charge, $charge['data']) : $charge;
            $providerId = trim((string) ($data['id'] ?? $data['charge_id'] ?? $data['chargeId'] ?? ''));
            $checkoutUrl = trim((string) ($data['checkout_url'] ?? $data['checkoutUrl'] ?? $data['payment_url'] ?? $data['paymentUrl'] ?? ''));
            if ($providerId === '' || $checkoutUrl === '') {
                throw new RuntimeException('INVALID_DIAMANOPAY_CHECKOUT');
            }
            DB::table('payroll_topups')->where('id', $id)->update([
                'provider_charge_id' => $providerId,
                'checkout_url' => $checkoutUrl,
                'updated_at' => now(),
            ]);
        } catch (Throwable $error) {
            DB::table('payroll_topups')->where('id', $id)->update([
                'status' => 'FAILED',
                'failure_reason' => 'Le checkout de recharge n’a pas pu être créé.',
                'updated_at' => now(),
            ]);
            throw $error;
        }

        return $this->topup(DB::table('payroll_topups')->where('id', $id)->first());
    }

    public function applyTopupStatus(string $providerId, array $providerResponse): bool
    {
        $topup = DB::table('payroll_topups')->where('provider_charge_id', $providerId)->first();
        if (! $topup) {
            return false;
        }
        $data = is_array($providerResponse['data'] ?? null)
            ? array_merge($providerResponse, $providerResponse['data'])
            : $providerResponse;
        $status = strtoupper(trim((string) ($data['status'] ?? $data['state'] ?? 'PENDING')));
        $success = in_array($status, ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'COMPLETED', 'SETTLED', 'PAID'], true);
        $failure = in_array($status, ['FAILED', 'CANCELLED', 'CANCELED', 'DECLINED', 'REJECTED', 'EXPIRED', 'ERROR', 'DENIED'], true);

        DB::transaction(function () use ($topup, $success, $failure, $status): void {
            $locked = DB::table('payroll_topups')->where('id', $topup->id)->lockForUpdate()->first();
            if (! $locked || $locked->status === 'CONFIRMED' || $locked->status === 'FAILED') {
                return;
            }
            if ($success) {
                $wallet = DB::table('payroll_wallets')->where('id', $locked->wallet_id)->lockForUpdate()->first();
                if (! $wallet) {
                    throw new RuntimeException('PAYROLL_WALLET_NOT_FOUND');
                }
                $key = 'topup:'.$locked->id;
                if (! DB::table('payroll_wallet_ledger')->where('idempotency_key', $key)->exists()) {
                    DB::table('payroll_wallets')->where('id', $wallet->id)->update([
                        'available_balance' => DB::raw('available_balance + '.(int) $locked->amount),
                        'total_funded' => DB::raw('total_funded + '.(int) $locked->amount),
                        'updated_at' => now(),
                    ]);
                    $this->ledger($wallet, $locked->company_id, 'TOPUP_CONFIRMED', 'CREDIT', (int) $locked->amount, 'TOPUP', $locked->id, $key);
                }
                DB::table('payroll_topups')->where('id', $locked->id)->update(['status' => 'CONFIRMED', 'confirmed_at' => now(), 'updated_at' => now()]);
            } elseif ($failure) {
                DB::table('payroll_topups')->where('id', $locked->id)->update([
                    'status' => 'FAILED',
                    'failure_reason' => 'DiamanoPay a refusé la recharge ('.$status.').',
                    'updated_at' => now(),
                ]);
            }
        });

        return true;
    }

    public function payoutBatch(string $companyId, string $batchId): object
    {
        $batch = DB::transaction(function () use ($companyId, $batchId): object {
            $batch = DB::table('payroll_batches')->where('id', $batchId)->where('company_id', $companyId)->lockForUpdate()->first();
            if (! $batch) {
                throw new RuntimeException('PAYROLL_BATCH_NOT_FOUND');
            }
            if ($batch->status !== 'APPROVED') {
                throw new RuntimeException('PAYROLL_BATCH_NOT_APPROVED');
            }
            $wallet = DB::table('payroll_wallets')->where('company_id', $companyId)->lockForUpdate()->first();
            if (! $wallet || (int) $wallet->available_balance < (int) $batch->total_amount) {
                throw new RuntimeException('PAYROLL_SOLDE_INSUFFISANT');
            }
            DB::table('payroll_wallets')->where('id', $wallet->id)->update([
                'available_balance' => DB::raw('available_balance - '.(int) $batch->total_amount),
                'reserved_balance' => DB::raw('reserved_balance + '.(int) $batch->total_amount),
                'updated_at' => now(),
            ]);
            DB::table('payroll_batches')->where('id', $batch->id)->update(['status' => 'PROCESSING', 'updated_at' => now()]);
            DB::table('payroll_batch_items')->where('batch_id', $batch->id)->where('status', 'PENDING')->update(['status' => 'PROCESSING', 'updated_at' => now()]);

            return DB::table('payroll_batches')->where('id', $batch->id)->first();
        });

        $items = DB::table('payroll_batch_items')->where('batch_id', $batch->id)->where('status', 'PROCESSING')->get();
        foreach ($items as $item) {
            try {
                $response = $this->diamanoPay->payout([
                    'amount' => (int) $item->amount,
                    'provider' => $item->provider,
                    'mobile' => $item->mobile,
                    'name' => $item->beneficiary_name,
                    'accountNumber' => $this->decryptAccount($item->account_number),
                ], $item->idempotency_key);
                $this->applyPayoutStatus($item->id, $response);
            } catch (Throwable $error) {
                $this->applyPayoutStatus($item->id, ['status' => 'FAILED']);
            }
        }

        return DB::table('payroll_batches')->where('id', $batch->id)->first();
    }

    public function applyPayoutStatus(string $itemId, array $providerResponse): void
    {
        $data = is_array($providerResponse['data'] ?? null) ? array_merge($providerResponse, $providerResponse['data']) : $providerResponse;
        $status = strtoupper(trim((string) ($data['status'] ?? $data['state'] ?? 'PENDING')));
        $providerId = trim((string) ($data['id'] ?? $data['payout_id'] ?? $data['payoutId'] ?? ''));
        $success = in_array($status, ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'COMPLETED', 'SETTLED', 'PAID'], true);
        $failure = in_array($status, ['FAILED', 'CANCELLED', 'CANCELED', 'DECLINED', 'REJECTED', 'EXPIRED', 'ERROR', 'DENIED'], true);

        DB::transaction(function () use ($itemId, $providerId, $success, $failure, $status): void {
            $item = DB::table('payroll_batch_items')->where('id', $itemId)->lockForUpdate()->first();
            if (! $item || $item->status !== 'PROCESSING') {
                return;
            }
            if (! $success && ! $failure) {
                DB::table('payroll_batch_items')->where('id', $item->id)->update([
                    'provider_payout_id' => $providerId !== '' ? $providerId : $item->provider_payout_id,
                    'updated_at' => now(),
                ]);
                return;
            }
            $wallet = DB::table('payroll_wallets')->where('company_id', $item->company_id)->lockForUpdate()->first();
            if (! $wallet) {
                throw new RuntimeException('PAYROLL_WALLET_NOT_FOUND');
            }
            $batch = DB::table('payroll_batches')->where('id', $item->batch_id)->lockForUpdate()->first();
            if ($success) {
                DB::table('payroll_wallets')->where('id', $wallet->id)->update([
                    'reserved_balance' => DB::raw('reserved_balance - '.(int) $item->amount),
                    'updated_at' => now(),
                ]);
                $this->ledger($wallet, $item->company_id, 'SALARY_PAID', 'DEBIT', (int) $item->amount, 'PAYROLL_ITEM', $item->id, 'payout:'.$item->id);
                DB::table('payroll_batch_items')->where('id', $item->id)->update([
                    'status' => 'SUCCEEDED',
                    'provider_payout_id' => $providerId !== '' ? $providerId : $item->provider_payout_id,
                    'processed_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($failure) {
                DB::table('payroll_wallets')->where('id', $wallet->id)->update([
                    'reserved_balance' => DB::raw('reserved_balance - '.(int) $item->amount),
                    'available_balance' => DB::raw('available_balance + '.(int) $item->amount),
                    'updated_at' => now(),
                ]);
                $this->ledger($wallet, $item->company_id, 'SALARY_RELEASED', 'CREDIT', (int) $item->amount, 'PAYROLL_ITEM', $item->id, 'release:'.$item->id);
                DB::table('payroll_batch_items')->where('id', $item->id)->update([
                    'status' => 'FAILED',
                    'provider_payout_id' => $providerId !== '' ? $providerId : $item->provider_payout_id,
                    'failure_reason' => 'Le virement a échoué ('.$status.').',
                    'processed_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->refreshBatchStatus($batch);
        });
    }

    public function itemByProviderId(string $providerId): ?object
    {
        return DB::table('payroll_batch_items')->where('provider_payout_id', $providerId)->first();
    }

    public function updateBatchStatus(string $companyId, string $batchId, string $status, string $actor): object
    {
        $allowed = [
            'submit' => ['DRAFT', 'PENDING_APPROVAL'],
            'approve' => ['PENDING_APPROVAL', 'APPROVED'],
        ];
        $batch = DB::table('payroll_batches')->where('id', $batchId)->where('company_id', $companyId)->first();
        if (! $batch) {
            throw new RuntimeException('PAYROLL_BATCH_NOT_FOUND');
        }
        if (! in_array($batch->status, $allowed[$status] ?? [], true)) {
            throw new RuntimeException('PAYROLL_INVALID_TRANSITION');
        }
        $changes = ['status' => $allowed[$status][1], 'updated_at' => now()];
        if ($status === 'approve') {
            $changes['approved_by'] = $actor;
            $changes['approved_at'] = now();
        }
        DB::table('payroll_batches')->where('id', $batch->id)->update($changes);

        return DB::table('payroll_batches')->where('id', $batch->id)->first();
    }

    public function refreshBatchStatus(?object $batch): void
    {
        if (! $batch) {
            return;
        }
        $statuses = DB::table('payroll_batch_items')->where('batch_id', $batch->id)->pluck('status')->all();
        if (collect($statuses)->contains('PROCESSING')) {
            return;
        }
        $next = collect($statuses)->every(fn (string $status): bool => $status === 'SUCCEEDED')
            ? 'COMPLETED'
            : (collect($statuses)->contains('SUCCEEDED') ? 'PARTIAL' : 'FAILED');
        DB::table('payroll_batches')->where('id', $batch->id)->update([
            'status' => $next,
            'processed_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function wallet(string $companyId): object
    {
        $id = 'payroll-wallet-'.$companyId;
        DB::table('payroll_wallets')->insertOrIgnore([
            'id' => $id,
            'company_id' => $companyId,
            'currency' => 'XOF',
            'available_balance' => 0,
            'reserved_balance' => 0,
            'total_funded' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('payroll_wallets')->where('id', $id)->first();
    }

    private function ledger(object $wallet, string $companyId, string $type, string $direction, int $amount, string $referenceType, string $referenceId, string $key): void
    {
        if (DB::table('payroll_wallet_ledger')->where('company_id', $companyId)->where('idempotency_key', $key)->exists()) {
            return;
        }
        DB::table('payroll_wallet_ledger')->insert([
            'id' => 'payroll-ledger-'.Str::uuid(),
            'wallet_id' => $wallet->id,
            'company_id' => $companyId,
            'type' => $type,
            'direction' => $direction,
            'amount' => $amount,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'idempotency_key' => $key,
            'metadata' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function walletPayload(object $row): array
    {
        return [
            'currency' => $row->currency,
            'availableBalance' => (int) $row->available_balance,
            'reservedBalance' => (int) $row->reserved_balance,
            'totalFunded' => (int) $row->total_funded,
        ];
    }

    private function beneficiary(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'employeeId' => $row->employee_id,
            'fullName' => $row->full_name,
            'mobile' => $row->mobile,
            'accountNumberMasked' => $this->mask($this->decryptAccount($row->account_number)),
            'provider' => $row->provider,
            'monthlySalary' => (int) $row->monthly_salary,
            'paymentDay' => (int) $row->payment_day,
            'active' => (bool) $row->active,
            'createdAt' => $row->created_at,
            'updatedAt' => $row->updated_at,
        ];
    }

    private function batch(object $row): array
    {
        $itemQuery = DB::table('payroll_batch_items')->where('batch_id', $row->id);
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'period' => $row->period,
            'paymentDate' => $row->payment_date,
            'totalAmount' => (int) $row->total_amount,
            'status' => $row->status,
            'itemCount' => (int) $itemQuery->count(),
            'paidCount' => (int) (clone $itemQuery)->where('status', 'SUCCEEDED')->count(),
            'failedCount' => (int) (clone $itemQuery)->where('status', 'FAILED')->count(),
            'createdBy' => $row->created_by,
            'approvedBy' => $row->approved_by,
            'approvedAt' => $row->approved_at,
            'processedAt' => $row->processed_at,
            'createdAt' => $row->created_at,
        ];
    }

    private function item(object $row): array
    {
        return [
            'id' => $row->id,
            'batchId' => $row->batch_id,
            'companyId' => $row->company_id,
            'beneficiaryId' => $row->beneficiary_id,
            'beneficiaryName' => $row->beneficiary_name,
            'mobile' => $row->mobile,
            'amount' => (int) $row->amount,
            'status' => $row->status,
            'providerPayoutId' => $row->provider_payout_id,
            'failureReason' => $row->failure_reason,
            'processedAt' => $row->processed_at,
        ];
    }

    private function topup(object $row): array
    {
        return [
            'id' => $row->id,
            'amount' => (int) $row->amount,
            'status' => $row->status,
            'provider' => $row->provider,
            'providerChargeId' => $row->provider_charge_id,
            'checkoutUrl' => $row->checkout_url,
            'failureReason' => $row->failure_reason,
            'confirmedAt' => $row->confirmed_at,
            'createdAt' => $row->created_at,
        ];
    }

    private function mask(string $value): string
    {
        $value = trim($value);
        return strlen($value) <= 4 ? str_repeat('•', strlen($value)) : str_repeat('•', max(0, strlen($value) - 4)).substr($value, -4);
    }

    private function decryptAccount(string $value): string
    {
        try {
            return Crypt::decryptString($value);
        } catch (Throwable) {
            // Keep old records readable during the transparent migration.
            return $value;
        }
    }
}