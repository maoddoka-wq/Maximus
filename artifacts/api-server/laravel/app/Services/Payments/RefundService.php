<?php

namespace App\Services\Payments;

use App\Contracts\PaymentProviderInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RefundService
{
    public function __construct(
        private readonly PaymentProviderInterface $provider,
        private readonly LedgerService $ledger,
    ) {
    }

    public function request(object $payment, int $amount, string $reason, string $idempotencyKey): array
    {
        if (! in_array($payment->status, ['PAID', 'PARTIALLY_REFUNDED'], true)) {
            throw new \RuntimeException('PAYMENT_NOT_REFUNDABLE');
        }
        $existing = DB::table('refunds')
            ->where('tenant_id', $payment->tenant_id)
            ->where('payment_id', $payment->id)
            ->where('idempotency_key', $idempotencyKey)
            ->first();
        if ($existing) {
            return $this->payload($existing);
        }
        $refunded = (int) DB::table('refunds')
            ->where('payment_id', $payment->id)
            ->whereIn('status', ['REQUESTED', 'PROCESSING', 'COMPLETED'])
            ->sum('amount');
        if ($amount <= 0 || $amount > ((int) $payment->amount - $refunded)) {
            throw new \RuntimeException('REFUND_AMOUNT_EXCEEDED');
        }

        $id = 'refund-'.Str::uuid();
        DB::table('refunds')->insert([
            'id' => $id,
            'tenant_id' => $payment->tenant_id,
            'payment_id' => $payment->id,
            'amount' => $amount,
            'refund_type' => $amount === (int) $payment->amount ? 'FULL' : 'PARTIAL',
            'reason' => trim($reason),
            'provider_reference' => null,
            'status' => 'REQUESTED',
            'idempotency_key' => $idempotencyKey,
            'metadata' => json_encode([], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $providerResult = $this->provider->refund(
            (string) $payment->provider_transaction_id,
            $amount,
            (string) $payment->currency,
            'MAX-REF-'.$id,
            $reason,
        );
        $updates = [
            'provider_reference' => $providerResult['provider_transaction_id'] ?? null,
            'status' => $providerResult['status'] === 'PAID' ? 'COMPLETED' : ($providerResult['status'] === 'PROCESSING' ? 'PROCESSING' : 'REQUESTED'),
            'updated_at' => now(),
        ];
        if ($updates['status'] === 'COMPLETED') {
            $updates['completed_at'] = now();
            $this->settleLedger($payment, $id, $amount);
            DB::table('payments')->where('id', $payment->id)->update([
                'status' => $amount + $refunded === (int) $payment->amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                'updated_at' => now(),
            ]);
        }
        DB::table('refunds')->where('id', $id)->update($updates);

        return $this->payload(DB::table('refunds')->where('id', $id)->first());
    }

    private function settleLedger(object $payment, string $refundId, int $amount): void
    {
        $sellerId = $payment->seller_id ?: $payment->tenant_id;
        $wallet = $this->ledger->wallet($payment->tenant_id, 'SELLER', $sellerId, $payment->currency);
        $this->ledger->post([
            'tenant_id' => $payment->tenant_id,
            'wallet_id' => $wallet->id,
            'payment_id' => $payment->id,
            'transaction_id' => $refundId,
            'type' => 'REFUND_DEBIT',
            'direction' => 'DEBIT',
            'amount' => $amount,
            'currency' => $payment->currency,
            'reference' => 'REFUND:'.$refundId.':DEBIT',
            'description' => 'Remboursement '.$payment->public_reference,
        ]);
    }

    private function payload(object $refund): array
    {
        return [
            'id' => $refund->id,
            'paymentId' => $refund->payment_id,
            'amount' => (int) $refund->amount,
            'type' => $refund->refund_type,
            'reason' => $refund->reason,
            'providerReference' => $refund->provider_reference,
            'status' => $refund->status,
            'createdAt' => $refund->created_at,
            'completedAt' => $refund->completed_at,
        ];
    }
}