<?php

namespace App\Services\Payments;

use App\Contracts\PaymentProviderInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
        try {
            $providerResult = $this->provider->initialize([
                'public_reference' => $reference,
                'amount' => (int) $payment->amount,
                'currency' => $payment->currency,
                'description' => $payment->description,
                'payment_method' => $payment->payment_method,
                'customer' => $data['customer'] ?? [],
                'metadata' => $data['metadata'] ?? [],
            ]);
        } catch (\Throwable $exception) {
            report($exception);
            Log::error('[DIAMANOPAY] Create charge exception', [
                'reference' => $reference,
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);
            $providerResult = [
                'ok' => false,
                'status' => 'FAILED',
                'provider_transaction_id' => null,
                'provider_request_id' => null,
                'checkout_url' => null,
                'message' => 'DiamanoPay n’a pas pu créer le paiement.',
                'error_code' => 'DIAMANOPAY_CREATE_FAILED',
            ];
        }
        $providerStatus = $providerResult['status'] ?? 'FAILED';
        $updates = [
            'status' => match ($providerStatus) {
                'PROCESSING' => 'PROCESSING',
                'PAID' => 'PAID',
                'FAILED' => 'FAILED',
                'CANCELLED' => 'CANCELLED',
                'EXPIRED' => 'EXPIRED',
                default => 'PENDING',
            },
            'provider_transaction_id' => $providerResult['provider_transaction_id'],
            'metadata' => json_encode(array_merge($data['metadata'] ?? [], [
                'checkout_url' => $providerResult['checkout_url'] ?? null,
                'provider_message' => $providerResult['message'] ?? null,
                'provider_charge_id' => $providerResult['provider_request_id'] ?? $providerResult['provider_transaction_id'] ?? null,
            ]), JSON_THROW_ON_ERROR),
            'updated_at' => now(),
        ];
        if (in_array($providerStatus, ['FAILED', 'CANCELLED', 'EXPIRED'], true)) {
            $updates['status'] = 'FAILED';
            $updates['failed_at'] = now();
        }
        DB::table('payments')->where('id', $id)->update($updates);
        Log::info('[DIAMANOPAY] Final payment status', [
            'reference' => $reference,
            'payment_id' => $id,
            'status' => $updates['status'],
        ]);

        return $this->payload(DB::table('payments')->where('id', $id)->first());
    }

    public function confirmFromWebhook(array $payload, string $provider, string $eventId, ?string $signature = null): array
    {
        $providerTransactionId = $this->firstString($payload, ['transactionId', 'provider_transaction_id', 'transaction_id', 'payment_id', 'id']);
        $providerRequestId = $this->firstString($payload, ['paymentRequestId', 'payment_request_id']);
        $reference = $this->firstString($payload, ['clientReference', 'public_reference', 'reference', 'merchant_reference']);
        $reference ??= $this->firstString($payload, ['extraData.clientReference', 'extraData.publicReference']);
        $status = $this->normalizeStatus($this->firstString($payload, ['status', 'payment_status', 'state']) ?? 'PENDING');
        Log::info('[DIAMANOPAY] Webhook received', [
            'status' => $status,
            'transaction_id' => $providerTransactionId,
            'payment_request_id' => $providerRequestId,
        ]);
        $payment = $reference
            ? DB::table('payments')->where('public_reference', $reference)->first()
            : null;
        $payment ??= $providerTransactionId
            ? DB::table('payments')->where('provider_transaction_id', $providerTransactionId)->first()
            : null;
        $payment ??= $providerRequestId
            ? DB::table('payments')->where('provider_transaction_id', $providerRequestId)->first()
            : null;
        if (! $payment) {
            throw new \RuntimeException('PAYMENT_NOT_FOUND');
        }
        if (! $providerTransactionId) {
            throw new \RuntimeException('PROVIDER_REFERENCE_MISSING');
        }
        if ($providerTransactionId && $payment->provider_transaction_id && $providerTransactionId !== $payment->provider_transaction_id && $providerRequestId !== $payment->provider_transaction_id) {
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
        $verification = $this->provider->verify($providerTransactionId, [
            'expected_amount' => (int) $payment->amount,
            'expected_reference' => (string) $payment->public_reference,
        ]);
        if (! ($verification['verified'] ?? false)) {
            throw new \RuntimeException('PAYMENT_PROVIDER_VERIFICATION_FAILED');
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

        DB::transaction(function () use ($payment, $status, $providerTransactionId, $payload, $eventId, $provider): void {
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
        Log::info('[DIAMANOPAY] Final payment status', [
            'payment_id' => $payment->id,
            'reference' => $payment->public_reference,
            'status' => $status,
        ]);

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
            'checkoutUrl' => is_string($payment->metadata) ? (json_decode($payment->metadata, true)['checkout_url'] ?? null) : ($payment->metadata['checkout_url'] ?? null),
            'providerMessage' => is_string($payment->metadata) ? (json_decode($payment->metadata, true)['provider_message'] ?? null) : ($payment->metadata['provider_message'] ?? null),
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