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

        $response = $this->client()->post($this->path('payment_path'), [
            'amount' => $payment['amount'],
            'provider' => $provider,
            'description' => $payment['description'],
            'clientReference' => $payment['public_reference'],
            'redirectUrl' => $this->redirectUrl($payment),
            'webhook' => $this->webhookUrl(),
            'feeOnCustomer' => false,
            'extraData' => array_merge([
                'currency' => $payment['currency'],
            ], $payment['metadata'] ?? []),
        ]);

        $result = $this->normalize($response, ['chargeId'], true);
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
        }

        return $result;
    }

    public function verify(string $providerTransactionId, array $context = []): array
    {
        if (! $this->configured()) {
            return $this->unavailable();
        }

        $path = str_replace('{providerTransactionId}', rawurlencode($providerTransactionId), $this->path('verify_path'));
        $result = $this->normalize($this->client()->get($path), ['transactionId', 'id'], false);
        $result['verified'] = $result['ok']
            && $result['provider_transaction_id'] === $providerTransactionId
            && $this->matchesExpectedAmount($result, $context['expected_amount'] ?? null)
            && $this->matchesExpectedReference($result, $context['expected_reference'] ?? null);
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
        $configuration = $this->configuration();

        return $configuration['base_url'] !== ''
            && ($configuration['access_token'] !== ''
                || ($configuration['client_id'] !== '' && $configuration['client_secret'] !== ''));
    }

    private function client()
    {
        $configuration = $this->configuration();
        $client = Http::baseUrl($configuration['base_url'])
            ->acceptJson()
            ->asJson()
            ->timeout((int) config('payments.diamanopay.timeout', 15));

        $token = $configuration['access_token'];
        if ($token !== '') {
            return $client->withToken($token);
        }

        $auth = Http::baseUrl($configuration['base_url'])
            ->asForm()
            ->acceptJson()
            ->timeout((int) config('payments.diamanopay.timeout', 15))
            ->post((string) config('payments.diamanopay.auth_path'), [
                'grant_type' => 'client_credentials',
                'client_id' => $configuration['client_id'],
                'client_secret' => $configuration['client_secret'],
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
        $configuration = $this->configuration();
        $missing = [];
        foreach ([
            'DIAMANOPAY_BASE_URL' => $configuration['base_url'],
        ] as $name => $value) {
            if ($value === '') {
                $missing[] = $name;
            }
        }
        if ($configuration['access_token'] === ''
            && ($configuration['client_id'] === '' || $configuration['client_secret'] === '')) {
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

    private function configuration(): array
    {
        $configuration = config('payments.diamanopay', []);

        return [
            'base_url' => rtrim(trim((string) ($configuration['base_url'] ?? '')), '/'),
            'client_id' => trim((string) ($configuration['client_id'] ?? '')),
            'client_secret' => trim((string) ($configuration['client_secret'] ?? '')),
            'access_token' => trim((string) ($configuration['access_token'] ?? '')),
        ];
    }

    private function redirectUrl(array $payment): string
    {
        $metadataUrl = data_get($payment, 'metadata.return_url');
        $configuredUrl = config('payments.callback_url', '');

        return trim((string) ($metadataUrl ?: $configuredUrl));
    }

    private function webhookUrl(): string
    {
        return trim((string) config('payments.webhook_url', ''));
    }
}