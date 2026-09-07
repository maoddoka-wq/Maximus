<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LedgerService
{
    public function wallet(string $tenantId, string $ownerType, string $ownerId, string $currency): object
    {
        $wallet = DB::table('wallets')
            ->where('tenant_id', $tenantId)
            ->where('owner_type', $ownerType)
            ->where('owner_id', $ownerId)
            ->where('currency', $currency)
            ->lockForUpdate()
            ->first();
        if ($wallet) {
            return $wallet;
        }

        $id = 'wallet-'.Str::uuid();
        DB::table('wallets')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'owner_type' => $ownerType,
            'owner_id' => $ownerId,
            'currency' => $currency,
            'available_balance' => 0,
            'pending_balance' => 0,
            'withdrawn_balance' => 0,
            'status' => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('wallets')->where('id', $id)->lockForUpdate()->first();
    }

    public function post(array $entry): object
    {
        $existing = DB::table('ledger_entries')
            ->where('tenant_id', $entry['tenant_id'])
            ->where('reference', $entry['reference'])
            ->first();
        if ($existing) {
            return $existing;
        }

        $wallet = DB::table('wallets')->where('id', $entry['wallet_id'])->lockForUpdate()->first();
        if (! $wallet || $wallet->tenant_id !== $entry['tenant_id']) {
            throw new \RuntimeException('WALLET_NOT_FOUND');
        }

        $amount = (int) $entry['amount'];
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Ledger amount must be positive.');
        }

        $available = (int) $wallet->available_balance;
        if ($entry['direction'] === 'DEBIT' && $available < $amount) {
            throw new \RuntimeException('INSUFFICIENT_WALLET_BALANCE');
        }

        $delta = $entry['direction'] === 'CREDIT' ? $amount : -$amount;
        DB::table('wallets')->where('id', $wallet->id)->update([
            'available_balance' => $available + $delta,
            'updated_at' => now(),
        ]);

        $id = 'ledger-'.Str::uuid();
        DB::table('ledger_entries')->insert([
            'id' => $id,
            'tenant_id' => $entry['tenant_id'],
            'wallet_id' => $wallet->id,
            'payment_id' => $entry['payment_id'] ?? null,
            'transaction_id' => $entry['transaction_id'] ?? null,
            'type' => $entry['type'],
            'direction' => $entry['direction'],
            'amount' => $amount,
            'currency' => $entry['currency'],
            'reference' => $entry['reference'],
            'description' => $entry['description'] ?? '',
            'status' => $entry['status'] ?? 'POSTED',
            'metadata' => isset($entry['metadata']) ? json_encode($entry['metadata'], JSON_THROW_ON_ERROR) : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('ledger_entries')->where('id', $id)->first();
    }

    public function settlePayment(object $payment, string $sellerId, ?object $commission): void
    {
        $sellerWallet = $this->wallet($payment->tenant_id, 'SELLER', $sellerId, $payment->currency);
        $this->post([
            'tenant_id' => $payment->tenant_id,
            'wallet_id' => $sellerWallet->id,
            'payment_id' => $payment->id,
            'transaction_id' => $payment->id,
            'type' => 'PAYMENT_CREDIT',
            'direction' => 'CREDIT',
            'amount' => (int) $payment->amount,
            'currency' => $payment->currency,
            'reference' => 'PAYMENT:'.$payment->id.':GROSS',
            'description' => 'Encaissement confirmé '.$payment->public_reference,
        ]);

        if (! $commission || (int) $commission->commission_amount <= 0) {
            return;
        }

        $this->post([
            'tenant_id' => $payment->tenant_id,
            'wallet_id' => $sellerWallet->id,
            'payment_id' => $payment->id,
            'transaction_id' => $payment->id,
            'type' => 'COMMISSION_DEBIT',
            'direction' => 'DEBIT',
            'amount' => (int) $commission->commission_amount,
            'currency' => $payment->currency,
            'reference' => 'PAYMENT:'.$payment->id.':COMMISSION:DEBIT',
            'description' => 'Commission MAXIMUS '.$payment->public_reference,
        ]);

        $maximusWallet = $this->wallet($payment->tenant_id, 'MAXIMUS', 'maximus', $payment->currency);
        $this->post([
            'tenant_id' => $payment->tenant_id,
            'wallet_id' => $maximusWallet->id,
            'payment_id' => $payment->id,
            'transaction_id' => $payment->id,
            'type' => 'COMMISSION_CREDIT',
            'direction' => 'CREDIT',
            'amount' => (int) $commission->commission_amount,
            'currency' => $payment->currency,
            'reference' => 'PAYMENT:'.$payment->id.':COMMISSION:CREDIT',
            'description' => 'Commission MAXIMUS '.$payment->public_reference,
        ]);
    }
}