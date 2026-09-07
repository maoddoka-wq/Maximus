<?php

namespace App\Services\Payments;

use App\Contracts\PaymentProviderInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentService
{
    public function __construct(
        private readonly PaymentProviderInterface $provider,
        private readonly LedgerService $ledger,
        private readonly CommissionService $commissions,
    ) {
    }

    public function create(array $data): array
    {
        $tenantId = (string) $data['tenant_id'];
        $idempotencyKey = trim((string) ($data['idempotency_key'] ?? ''));
        if ($idempotencyKey !== '') {
            $existing = DB::table('payments')
                ->where('tenant_id', $tenantId)
                ->where('source_type', $data['source_type'])
                ->where('source_id', $data['source_id'])
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return $this->payload($existing);
            }
        }

        $id = 'payment-'.Str::uuid();
        $reference = 'MAX-PAY-'.strtoupper(Str::substr(str_replace('-', '', $id), -12));
        DB::table('payments')->insert([
            'id' => $id,
            'public_reference' => $reference,
            'tenant_id' => $tenantId,
            'customer_id' => $data['customer_id'] ?? null,
            'seller_id' => $data['seller_id'] ?? null,
            'source_module' => $data['source_module'],
            'source_type' => $data['source_type'],
            'source_id' => $data['source_id'],
            'provider' => $data['provider'] ?? config('payments.provider', 'diamanopay'),
            'provider_transaction_id' => null,
            'amount' => (int) $data['amount'],
            'currency' => strtoupper((string) $data['currency']),
            'payment_method' => $data['payment_method'] ?? null,
            'status' => 'PENDING',
            'description' => $data['description'] ?? '',
            'metadata' => json_encode($data['metadata'] ?? [], JSON_THROW_ON_ERROR),
            'idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
            'request_id' => $data['request_id'] ?? null,
            'initiated_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $payment = DB::table('payments')->where('id', $id)->first();
        $providerResult = $this->provider->initialize([
            'public_reference' => $reference,
            'amount' => (int) $payment->amount,
            'currency' => $payment->currency,
            'description' => $payment->description,
            'payment_method' => $payment->payment_method,
            'customer' => $data['customer'] ?? [],
            'metadata' => $data['metadata'] ?? [],
        ]);
        $updates = [
            'status' => $providerResult['status'] === 'PROCESSING' ? 'PROCESSING' : 'PENDING',
            'provider_transaction_id' => $providerResult['provider_transaction_id'],
            'updated_at' => now(),
        ];
        if ($providerResult['status'] === 'FAILED') {
            $updates['status'] = 'FAILED';
            $updates['failed_at'] = now();
        }
        DB::table('payments')->where('id', $id)->update($updates);

        return array_merge($this->payload(DB::table('payments')->where('id', $id)->first()), [
            'checkout_url' => $providerResult['checkout_url'] ?? null,
            'provider_message' => $providerResult['message'] ?? null,
        ]);
    }

    public function confirmFromWebhook(array $payload, string $provider, string $eventId, ?string $signature = null): array
    {
        $providerTransactionId = $this->firstString($payload, ['provider_transaction_id', 'transaction_id', 'payment_id', 'id']);
        $reference = $this->firstString($payload, ['public_reference', 'reference', 'merchant_reference']);
        $status = $this->normalizeStatus($this->firstString($payload, ['status', 'payment_status', 'state']) ?? 'PENDING');
        $payment = $reference
            ? DB::table('payments')->where('public_reference', $reference)->first()
            : ($providerTransactionId ? DB::table('payments')->where('provider_transaction_id', $providerTransactionId)->first() : null);
        if (! $payment) {
            throw new \RuntimeException('PAYMENT_NOT_FOUND');
        }
        if ($providerTransactionId && $payment->provider_transaction_id && $providerTransactionId !== $payment->provider_transaction_id) {
            throw new \RuntimeException('PROVIDER_REFERENCE_MISMATCH');
        }
        if (isset($payload['amount']) && (int) $payload['amount'] !== (int) $payment->amount) {
            throw new \RuntimeException('PAYMENT_AMOUNT_MISMATCH');
        }
        if (isset($payload['currency']) && strtoupper((string) $payload['currency']) !== strtoupper((string) $payment->currency)) {
            throw new \RuntimeException('PAYMENT_CURRENCY_MISMATCH');
        }

        $event = DB::table('payment_events')->where('provider', $provider)->where('provider_event_id', $eventId)->first();
        if ($event && $event->processing_status === 'PROCESSED') {
            return $this->payload($payment);
        }
        if (! $event) {
            DB::table('payment_events')->insert([
                'id' => 'payment-event-'.Str::uuid(),
                'payment_id' => $payment->id,
                'provider' => $provider,
                'event_type' => $status,
                'provider_event_id' => $eventId,
                'payload' => json_encode($payload, JSON_THROW_ON_ERROR),
                'signature' => $signature,
                'processing_status' => 'RECEIVED',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::transaction(function () use ($payment, $status, $providerTransactionId, $payload, $eventId): void {
            $locked = DB::table('payments')->where('id', $payment->id)->lockForUpdate()->first();
            $updates = [
                'status' => $status,
                'provider_transaction_id' => $providerTransactionId ?: $locked->provider_transaction_id,
                'updated_at' => now(),
            ];
            if ($status === 'PAID') {
                $updates['paid_at'] = $locked->paid_at ?? now();
                $sellerId = $locked->seller_id ?: $locked->tenant_id;
                $commission = $this->commissions->settle($locked, $sellerId);
                $this->ledger->settlePayment($locked, $sellerId, $commission);
                if ($locked->source_type === 'ecommerce_order') {
                    DB::table('ecommerce_orders')->where('id', $locked->source_id)->where('company_id', $locked->tenant_id)->update([
                        'payment_id' => $locked->id,
                        'payment_status' => 'PAID',
                        'updated_at' => now(),
                    ]);
                }
            }
            if (in_array($status, ['FAILED', 'CANCELLED', 'EXPIRED'], true)) {
                $updates['failed_at'] = now();
            }
            DB::table('payments')->where('id', $locked->id)->update($updates);
            DB::table('payment_events')
                ->where('provider', $provider)
                ->where('provider_event_id', $eventId)
                ->update(['processing_status' => 'PROCESSED', 'processed_at' => now(), 'updated_at' => now()]);
        });

        return $this->payload(DB::table('payments')->where('id', $payment->id)->first());
    }

    public function getForTenant(string $tenantId, string $id): ?object
    {
        return DB::table('payments')->where('tenant_id', $tenantId)->where('id', $id)->first();
    }

    public function payload(object $payment): array
    {
        return [
            'id' => $payment->id,
            'publicReference' => $payment->public_reference,
            'tenantId' => $payment->tenant_id,
            'customerId' => $payment->customer_id,
            'sellerId' => $payment->seller_id,
            'sourceModule' => $payment->source_module,
            'sourceType' => $payment->source_type,
            'sourceId' => $payment->source_id,
            'provider' => $payment->provider,
            'providerTransactionId' => $payment->provider_transaction_id,
            'amount' => (int) $payment->amount,
            'currency' => $payment->currency,
            'paymentMethod' => $payment->payment_method,
            'status' => $payment->status,
            'description' => $payment->description,
            'metadata' => is_string($payment->metadata) ? (json_decode($payment->metadata, true) ?: []) : ($payment->metadata ?: []),
            'initiatedAt' => $payment->initiated_at,
            'paidAt' => $payment->paid_at,
            'failedAt' => $payment->failed_at,
            'createdAt' => $payment->created_at,
        ];
    }

    private function normalizeStatus(string $status): string
    {
        return match (strtoupper($status)) {
            'SUCCESS', 'SUCCEEDED', 'COMPLETED', 'PAID' => 'PAID',
            'FAILED', 'ERROR', 'REJECTED' => 'FAILED',
            'CANCELLED', 'CANCELED' => 'CANCELLED',
            'EXPIRED' => 'EXPIRED',
            'PROCESSING' => 'PROCESSING',
            default => 'PENDING',
        };
    }

    private function firstString(array $payload, array $keys): ?string
    {
        foreach ($keys as $key) {
            $value = data_get($payload, $key) ?? data_get($payload, 'data.'.$key);
            if (is_scalar($value) && trim((string) $value) !== '') {
                return trim((string) $value);
            }
        }

        return null;
    }
}