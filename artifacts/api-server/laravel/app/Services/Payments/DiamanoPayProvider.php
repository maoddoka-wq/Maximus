<?php

namespace App\Services\Payments;

use App\Contracts\PaymentProviderInterface;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class DiamanoPayProvider implements PaymentProviderInterface
{
    public function initialize(array $payment): array
    {
        if (! $this->configured()) {
            return $this->unavailable();
        }

        $response = $this->client()->post($this->path('payment_path'), [
            'reference' => $payment['public_reference'],
            'amount' => $payment['amount'],
            'currency' => $payment['currency'],
            'description' => $payment['description'],
            'payment_method' => $payment['payment_method'],
            'customer' => $payment['customer'] ?? [],
            'callback_url' => config('payments.callback_url'),
            'metadata' => $payment['metadata'] ?? [],
        ]);

        return $this->normalize($response, [
            'provider_transaction_id',
            'transaction_id',
            'id',
            'reference',
        ]);
    }

    public function verify(string $providerTransactionId, array $context = []): array
    {
        if (! $this->configured()) {
            return $this->unavailable();
        }

        $path = str_replace('{providerTransactionId}', rawurlencode($providerTransactionId), $this->path('verify_path'));
        return $this->normalize($this->client()->get($path), ['provider_transaction_id', 'transaction_id', 'id']);
    }

    public function refund(string $providerTransactionId, int $amount, string $currency, string $reference, string $reason = ''): array
    {
        if (! $this->configured()) {
            return $this->unavailable();
        }

        return $this->normalize($this->client()->post($this->path('refund_path'), [
            'reference' => $reference,
            'provider_transaction_id' => $providerTransactionId,
            'amount' => $amount,
            'currency' => $currency,
            'reason' => $reason,
        ]), ['provider_transaction_id', 'transaction_id', 'id']);
    }

    public function payout(array $withdrawal): array
    {
        if (! $this->configured()) {
            return $this->unavailable();
        }

        return $this->normalize($this->client()->post($this->path('payout_path'), $withdrawal), [
            'provider_reference',
            'provider_transaction_id',
            'transaction_id',
            'id',
        ]);
    }

    public function verifyWebhook(string $payload, ?string $signature): bool
    {
        $secret = (string) config('payments.diamanopay.webhook_secret');
        if ($secret === '' || ! is_string($signature) || $signature === '') {
            return false;
        }

        $provided = str_starts_with($signature, 'sha256=') ? substr($signature, 7) : $signature;
        return hash_equals(hash_hmac('sha256', $payload, $secret), $provided);
    }

    private function configured(): bool
    {
        return (string) config('payments.diamanopay.base_url') !== ''
            && ((string) config('payments.diamanopay.access_token') !== ''
                || ((string) config('payments.diamanopay.client_id') !== '' && (string) config('payments.diamanopay.client_secret') !== ''));
    }

    private function client()
    {
        $client = Http::baseUrl((string) config('payments.diamanopay.base_url'))
            ->acceptJson()
            ->asJson()
            ->timeout((int) config('payments.diamanopay.timeout', 15));

        $token = (string) config('payments.diamanopay.access_token');
        if ($token !== '') {
            return $client->withToken($token);
        }

        $auth = Http::baseUrl((string) config('payments.diamanopay.base_url'))
            ->asForm()
            ->acceptJson()
            ->timeout((int) config('payments.diamanopay.timeout', 15))
            ->withBasicAuth(
                (string) config('payments.diamanopay.client_id'),
                (string) config('payments.diamanopay.client_secret'),
            )
            ->post((string) config('payments.diamanopay.auth_path'), ['grant_type' => 'client_credentials']);
        $auth->throw();

        return $client->withToken((string) ($auth->json('access_token') ?? ''));
    }

    private function path(string $key): string
    {
        return (string) config('payments.diamanopay.'.$key);
    }

    private function normalize(Response $response, array $idKeys): array
    {
        $payload = $response->json();
        $payload = is_array($payload) ? $payload : [];
        $providerTransactionId = null;
        foreach ($idKeys as $key) {
            $candidate = data_get($payload, $key) ?? data_get($payload, 'data.'.$key) ?? data_get($payload, 'payment.'.$key);
            if (is_string($candidate) && trim($candidate) !== '') {
                $providerTransactionId = trim($candidate);
                break;
            }
        }

        $status = strtoupper((string) (data_get($payload, 'status') ?? data_get($payload, 'data.status') ?? 'PENDING'));
        $status = match ($status) {
            'SUCCESS', 'SUCCEEDED', 'COMPLETED', 'PAID' => 'PAID',
            'FAILED', 'ERROR', 'REJECTED' => 'FAILED',
            'CANCELLED', 'CANCELED' => 'CANCELLED',
            'EXPIRED' => 'EXPIRED',
            'PROCESSING' => 'PROCESSING',
            default => 'PENDING',
        };

        return [
            'ok' => $response->successful(),
            'status' => $status,
            'provider_transaction_id' => $providerTransactionId,
            'checkout_url' => data_get($payload, 'checkout_url') ?? data_get($payload, 'data.checkout_url'),
            'message' => $response->successful() ? null : ((string) (data_get($payload, 'message') ?? 'Le prestataire de paiement a refusé la demande.')),
            'raw' => $payload,
        ];
    }

    private function unavailable(): array
    {
        return [
            'ok' => false,
            'status' => 'PENDING',
            'provider_transaction_id' => null,
            'checkout_url' => null,
            'message' => 'DiamanoPay n’est pas encore configuré côté serveur.',
            'raw' => [],
        ];
    }
}