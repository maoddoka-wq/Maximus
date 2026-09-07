<?php

namespace App\Services\Payments;

use App\Contracts\PaymentProviderInterface;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DiamanoPayProvider implements PaymentProviderInterface
{
    public function initialize(array $payment): array
    {
        if (! $this->configured()) {
            return $this->unavailable();
        }

        $provider = $this->providerName($payment['payment_method'] ?? null);
        if ($provider === null) {
            return [
                'ok' => false,
                'status' => 'FAILED',
                'provider_transaction_id' => null,
                'provider_request_id' => null,
                'checkout_url' => null,
                'message' => 'Le moyen de paiement doit être WAVE ou ORANGE_MONEY.',
                'raw' => [],
            ];
        }

        Log::info('[DIAMANOPAY] Create charge started', [
            'reference' => $payment['public_reference'],
            'amount' => (int) $payment['amount'],
            'provider' => $provider,
        ]);
        $response = $this->client()->post($this->path('payment_path'), [
            'amount' => $payment['amount'],
            'provider' => $provider,
            'description' => $payment['description'],
            'clientReference' => $payment['public_reference'],
            'redirectUrl' => config('payments.callback_url'),
            'webhook' => config('payments.webhook_url'),
            'feeOnCustomer' => false,
            'extraData' => array_merge([
                'currency' => $payment['currency'],
            ], $payment['metadata'] ?? []),
        ]);
        Log::info('[DIAMANOPAY] Create charge HTTP status', [
            'status' => $response->status(),
            'reference' => $payment['public_reference'],
        ]);

        $result = $this->normalize($response, ['chargeId'], true);
        Log::info('[DIAMANOPAY] Create charge response', [
            'status' => $result['status'],
            'charge_id' => $result['provider_transaction_id'],
            'payment_url_present' => is_string($result['checkout_url']) && $result['checkout_url'] !== '',
            'message' => $result['message'],
        ]);
        if ($result['ok'] && (! is_string($result['checkout_url']) || $result['checkout_url'] === '')) {
            Log::error('[DIAMANOPAY] Checkout URL missing', [
                'reference' => $payment['public_reference'],
                'charge_id' => $result['provider_transaction_id'],
            ]);
            $result['ok'] = false;
            $result['status'] = 'FAILED';
            $result['message'] = 'DiamanoPay n’a pas retourné d’URL de paiement.';
            $result['error_code'] = 'DIAMANOPAY_CHECKOUT_URL_MISSING';
        } elseif ($result['ok']) {
            Log::info('[DIAMANOPAY] Checkout URL received', [
                'reference' => $payment['public_reference'],
                'charge_id' => $result['provider_transaction_id'],
            ]);
        }

        return $result;
    }

    public function verify(string $providerTransactionId, array $context = []): array
    {
        if (! $this->configured()) {
            return $this->unavailable();
        }

        $path = str_replace('{providerTransactionId}', rawurlencode($providerTransactionId), $this->path('verify_path'));
        Log::info('[DIAMANOPAY] Transaction verification', [
            'transaction_id' => $providerTransactionId,
        ]);
        $result = $this->normalize($this->client()->get($path), ['transactionId', 'id'], false);
        $result['verified'] = $result['ok']
            && $result['provider_transaction_id'] === $providerTransactionId
            && $this->matchesExpectedAmount($result, $context['expected_amount'] ?? null)
            && $this->matchesExpectedReference($result, $context['expected_reference'] ?? null);
        Log::info('[DIAMANOPAY] Transaction verification result', [
            'transaction_id' => $providerTransactionId,
            'verified' => $result['verified'],
            'status' => $result['status'],
            'amount_matches' => $this->matchesExpectedAmount($result, $context['expected_amount'] ?? null),
            'reference_matches' => $this->matchesExpectedReference($result, $context['expected_reference'] ?? null),
        ]);

        return $result;
    }

    public function refund(string $providerTransactionId, int $amount, string $currency, string $reference, string $reason = ''): array
    {
        if (! $this->configured()) {
            return $this->unavailable();
        }

        $path = str_replace('{providerTransactionId}', rawurlencode($providerTransactionId), $this->path('refund_path'));
        $result = $this->normalize($this->client()->post($path), ['transactionId', 'providerTransactionId', 'id'], false);
        if ($result['ok'] && (($result['raw']['success'] ?? false) === true)) {
            $result['status'] = 'PAID';
        }

        return $result;
    }

    public function payout(array $withdrawal): array
    {
        if (! $this->configured()) {
            return $this->unavailable();
        }

        $provider = $this->providerName($withdrawal['operator'] ?? $withdrawal['provider'] ?? null);
        if ($provider === null) {
            return [
                'ok' => false,
                'status' => 'FAILED',
                'provider_transaction_id' => null,
                'provider_request_id' => null,
                'checkout_url' => null,
                'message' => 'L’opérateur de retrait doit être WAVE ou ORANGE_MONEY.',
                'raw' => [],
            ];
        }

        return $this->normalize($this->client()->post($this->path('payout_path'), [
            'amount' => $withdrawal['amount'],
            'mobile' => $withdrawal['account_number'],
            'provider' => $provider,
            'name' => $withdrawal['beneficiary_name'],
            'description' => $withdrawal['description'] ?? 'Retrait MAXIMUS',
            'clientReference' => $withdrawal['reference'],
        ]), ['transactionId', 'providerTransactionId', 'id'], false);
    }

    public function verifyWebhook(string $payload, ?string $signature): bool
    {
        return is_array(json_decode($payload, true));
    }

    private function configured(): bool
    {
        return (string) config('payments.diamanopay.base_url') !== ''
            && (string) config('payments.callback_url') !== ''
            && (string) config('payments.webhook_url') !== ''
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
            Log::info('[DIAMANOPAY] Authentication started', ['mode' => 'long_lived_access_token']);
            Log::info('[DIAMANOPAY] Authentication result', [
                'mode' => 'long_lived_access_token',
                'successful' => true,
            ]);
            return $client->withToken($token);
        }

        Log::info('[DIAMANOPAY] Authentication started', ['mode' => 'client_credentials']);
        $auth = Http::baseUrl((string) config('payments.diamanopay.base_url'))
            ->asForm()
            ->acceptJson()
            ->timeout((int) config('payments.diamanopay.timeout', 15))
            ->post((string) config('payments.diamanopay.auth_path'), [
                'grant_type' => 'client_credentials',
                'client_id' => (string) config('payments.diamanopay.client_id'),
                'client_secret' => (string) config('payments.diamanopay.client_secret'),
            ]);
        Log::info('[DIAMANOPAY] Authentication result', [
            'mode' => 'client_credentials',
            'status' => $auth->status(),
            'successful' => $auth->successful(),
        ]);
        $auth->throw();

        $accessToken = (string) ($auth->json('accessToken') ?? $auth->json('access_token') ?? '');
        if ($accessToken === '') {
            throw new \RuntimeException('DIAMANOPAY_ACCESS_TOKEN_MISSING');
        }

        return $client->withToken($accessToken);
    }

    private function path(string $key): string
    {
        return (string) config('payments.diamanopay.'.$key);
    }

    private function normalize(Response $response, array $idKeys, bool $chargeResponse = false): array
    {
        $payload = $response->json();
        $payload = is_array($payload) ? $payload : [];
        $providerTransactionId = null;
        foreach ($idKeys as $key) {
            $candidate = data_get($payload, $key) ?? data_get($payload, 'data.'.$key) ?? data_get($payload, 'payment.'.$key);
            if (is_scalar($candidate) && trim((string) $candidate) !== '') {
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
            'provider_request_id' => $chargeResponse ? $providerTransactionId : null,
            'checkout_url' => data_get($payload, 'paymentUrl') ?? data_get($payload, 'data.paymentUrl'),
            'amount' => data_get($payload, 'totalAmount') ?? data_get($payload, 'amount'),
            'reference' => data_get($payload, 'clientReference') ?? data_get($payload, 'reference'),
            'message' => $response->successful() ? null : ((string) (data_get($payload, 'message') ?? data_get($payload, 'error') ?? 'Le prestataire de paiement a refusé la demande.')),
            'raw' => $payload,
        ];
    }

    private function providerName(?string $value): ?string
    {
        return match (strtoupper(trim((string) $value))) {
            'WAVE' => 'WAVE',
            'ORANGE', 'ORANGE MONEY', 'ORANGE_MONEY' => 'ORANGE_MONEY',
            default => null,
        };
    }

    private function matchesExpectedAmount(array $result, mixed $expected): bool
    {
        if ($expected === null || $result['amount'] === null) {
            return true;
        }

        return abs((int) $result['amount']) === (int) $expected;
    }

    private function matchesExpectedReference(array $result, ?string $expected): bool
    {
        return $expected === null || $result['reference'] === null || (string) $result['reference'] === $expected;
    }

    private function unavailable(): array
    {
        $missing = [];
        foreach ([
            'DIAMANOPAY_BASE_URL' => config('payments.diamanopay.base_url'),
            'DIAMANOPAY_CALLBACK_URL' => config('payments.callback_url'),
            'DIAMANOPAY_WEBHOOK_URL' => config('payments.webhook_url'),
        ] as $name => $value) {
            if ((string) $value === '') {
                $missing[] = $name;
            }
        }
        if ((string) config('payments.diamanopay.access_token') === ''
            && ((string) config('payments.diamanopay.client_id') === '' || (string) config('payments.diamanopay.client_secret') === '')) {
            $missing[] = 'DIAMANOPAY_ACCESS_TOKEN ou DIAMANOPAY_CLIENT_ID/DIAMANOPAY_CLIENT_SECRET';
        }
        Log::error('[DIAMANOPAY] Configuration missing', [
            'missing' => $missing,
        ]);

        return [
            'ok' => false,
            'status' => 'FAILED',
            'provider_transaction_id' => null,
            'provider_request_id' => null,
            'checkout_url' => null,
            'message' => 'DiamanoPay n’est pas configuré côté serveur.',
            'error_code' => 'DIAMANOPAY_NOT_CONFIGURED',
            'raw' => [],
        ];
    }
}