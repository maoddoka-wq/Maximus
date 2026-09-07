<?php

namespace App\Services\Payments;

use App\Contracts\PaymentProviderInterface;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DiamanoPayProvider implements PaymentProviderInterface
{
    public function initialize(array $payment): array
    {
        $correlationId = $this->correlationId($payment);
        if (! $this->configured()) {
            return $this->unavailable($correlationId);
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

        try {
            $response = $this->client($correlationId)->post($this->path('payment_path'), [
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
        } catch (ConnectionException $exception) {
            return $this->transportFailure('DIAMANOPAY_NETWORK_ERROR', 'DiamanoPay est temporairement indisponible.', $correlationId, $payment['public_reference'], $exception);
        } catch (\Throwable $exception) {
            return $this->transportFailure('DIAMANOPAY_REQUEST_FAILED', 'DiamanoPay n’a pas pu traiter la demande.', $correlationId, $payment['public_reference'], $exception);
        }

        $result = $this->normalize($response, ['chargeId', 'paymentRequestId', 'payment_request_id', 'transactionId', 'id'], true, $correlationId);
        if ($result['ok'] && (! is_string($result['checkout_url']) || $result['checkout_url'] === '')) {
            Log::error('[DIAMANOPAY] Checkout URL missing', [
                'reference' => $payment['public_reference'],
                'charge_id' => $result['provider_transaction_id'],
                'correlation_id' => $correlationId,
            ]);
            $result['ok'] = false;
            $result['status'] = 'FAILED';
            $result['message'] = 'DiamanoPay n’a pas retourné d’URL de paiement.';
            $result['error_code'] = 'DIAMANOPAY_CHECKOUT_URL_MISSING';
        }
        return $result;
    }

    public function verify(string $providerTransactionId, array $context = []): array
    {
        $correlationId = $this->correlationId($context);
        if (! $this->configured()) {
            return $this->unavailable($correlationId);
        }

        $path = str_replace('{providerTransactionId}', rawurlencode($providerTransactionId), $this->path('verify_path'));
        try {
            $response = $this->client($correlationId)->get($path);
        } catch (ConnectionException $exception) {
            return $this->transportFailure('DIAMANOPAY_NETWORK_ERROR', 'DiamanoPay est temporairement indisponible.', $correlationId, $providerTransactionId, $exception) + ['verified' => false];
        } catch (\Throwable $exception) {
            return $this->transportFailure('DIAMANOPAY_REQUEST_FAILED', 'DiamanoPay n’a pas pu vérifier le paiement.', $correlationId, $providerTransactionId, $exception) + ['verified' => false];
        }
        $result = $this->normalize($response, ['transactionId', 'providerTransactionId', 'id'], false, $correlationId);
        $result['verified'] = $result['ok']
            && $result['provider_transaction_id'] === $providerTransactionId
            && $this->matchesExpectedAmount($result, $context['expected_amount'] ?? null)
            && $this->matchesExpectedReference($result, $context['expected_reference'] ?? null);
        return $result;
    }

    public function refund(string $providerTransactionId, int $amount, string $currency, string $reference, string $reason = ''): array
    {
        $correlationId = (string) ($reference !== '' ? $reference : Str::uuid());
        if (! $this->configured()) {
            return $this->unavailable($correlationId);
        }

        $path = str_replace('{providerTransactionId}', rawurlencode($providerTransactionId), $this->path('refund_path'));
        try {
            $response = $this->client($correlationId)->post($path);
        } catch (ConnectionException $exception) {
            return $this->transportFailure('DIAMANOPAY_NETWORK_ERROR', 'DiamanoPay est temporairement indisponible.', $correlationId, $providerTransactionId, $exception);
        } catch (\Throwable $exception) {
            return $this->transportFailure('DIAMANOPAY_REQUEST_FAILED', 'DiamanoPay n’a pas pu traiter le remboursement.', $correlationId, $providerTransactionId, $exception);
        }
        $result = $this->normalize($response, ['transactionId', 'providerTransactionId', 'id'], false, $correlationId);
        if ($result['ok'] && (($result['raw']['success'] ?? false) === true)) {
            $result['status'] = 'PAID';
        }

        return $result;
    }

    public function payout(array $withdrawal): array
    {
        $correlationId = $this->correlationId($withdrawal);
        if (! $this->configured()) {
            return $this->unavailable($correlationId);
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

        try {
            $response = $this->client($correlationId)->post($this->path('payout_path'), [
                'amount' => $withdrawal['amount'],
                'mobile' => $withdrawal['account_number'],
                'provider' => $provider,
                'name' => $withdrawal['beneficiary_name'],
                'description' => $withdrawal['description'] ?? 'Retrait MAXIMUS',
                'clientReference' => $withdrawal['reference'],
            ]);
        } catch (ConnectionException $exception) {
            return $this->transportFailure('DIAMANOPAY_NETWORK_ERROR', 'DiamanoPay est temporairement indisponible.', $correlationId, $withdrawal['reference'], $exception);
        } catch (\Throwable $exception) {
            return $this->transportFailure('DIAMANOPAY_REQUEST_FAILED', 'DiamanoPay n’a pas pu traiter le retrait.', $correlationId, $withdrawal['reference'], $exception);
        }

        return $this->normalize($response, ['transactionId', 'providerTransactionId', 'id'], false, $correlationId);
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

    private function client(string $correlationId)
    {
        $configuration = $this->configuration();
        $client = Http::baseUrl($configuration['base_url'])
            ->acceptJson()
            ->asJson()
            ->connectTimeout((int) config('payments.diamanopay.connect_timeout', 5))
            ->timeout((int) config('payments.diamanopay.timeout', 30))
            ->withHeaders(['X-Request-Id' => $correlationId]);

        $token = $configuration['access_token'];
        if ($token !== '') {
            return $client->withToken($token);
        }

        $auth = Http::baseUrl($configuration['base_url'])
            ->asForm()
            ->acceptJson()
            ->connectTimeout((int) config('payments.diamanopay.connect_timeout', 5))
            ->timeout((int) config('payments.diamanopay.timeout', 30))
            ->withHeaders(['X-Request-Id' => $correlationId])
            ->post((string) config('payments.diamanopay.auth_path'), [
                'grant_type' => 'client_credentials',
                'client_id' => $configuration['client_id'],
                'client_secret' => $configuration['client_secret'],
            ]);
        if (! $auth->successful()) {
            Log::error('[DIAMANOPAY] OAuth authentication failed', [
                'status' => $auth->status(),
                'correlation_id' => $correlationId,
            ]);
            throw new \RuntimeException('DIAMANOPAY_AUTH_FAILED');
        }

        $accessToken = (string) (
            data_get($auth->json(), 'accessToken')
            ?? data_get($auth->json(), 'access_token')
            ?? data_get($auth->json(), 'data.accessToken')
            ?? data_get($auth->json(), 'data.access_token')
            ?? ''
        );
        if ($accessToken === '') {
            throw new \RuntimeException('DIAMANOPAY_ACCESS_TOKEN_MISSING');
        }

        return $client->withToken($accessToken);
    }

    private function path(string $key): string
    {
        return (string) config('payments.diamanopay.'.$key);
    }

    private function normalize(Response $response, array $idKeys, bool $chargeResponse = false, ?string $correlationId = null): array
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

        $status = strtoupper((string) (
            data_get($payload, 'status')
            ?? data_get($payload, 'data.status')
            ?? data_get($payload, 'payment.status')
            ?? data_get($payload, 'state')
            ?? 'PENDING'
        ));
        $status = match ($status) {
            'SUCCESS', 'SUCCEEDED', 'COMPLETED', 'PAID' => 'PAID',
            'FAILED', 'ERROR', 'REJECTED' => 'FAILED',
            'CANCELLED', 'CANCELED' => 'CANCELLED',
            'EXPIRED' => 'EXPIRED',
            'PROCESSING' => 'PROCESSING',
            default => 'PENDING',
        };
        if (! $response->successful() && $status === 'PENDING') {
            $status = 'FAILED';
        }

        $checkoutUrl = $this->checkoutUrl($payload);
        $ok = $response->successful() && (! $chargeResponse || $checkoutUrl !== null || $status === 'PAID');
        $message = $this->providerMessage($payload, $response->successful());
        $errorCode = $response->successful() ? null : 'DIAMANOPAY_HTTP_'.$response->status();
        if (! $response->successful()) {
            Log::error('[DIAMANOPAY] Provider request failed', [
                'status' => $response->status(),
                'correlation_id' => $correlationId,
            ]);
        }

        return [
            'ok' => $ok,
            'status' => $status,
            'provider_transaction_id' => $providerTransactionId,
            'provider_request_id' => $chargeResponse ? $providerTransactionId : null,
            'checkout_url' => $checkoutUrl,
            'amount' => data_get($payload, 'totalAmount') ?? data_get($payload, 'amount'),
            'reference' => data_get($payload, 'clientReference') ?? data_get($payload, 'reference'),
            'message' => $message,
            'error_code' => $errorCode,
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

    private function unavailable(?string $correlationId = null): array
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
            'correlation_id' => $correlationId,
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

    private function checkoutUrl(array $payload): ?string
    {
        foreach ([
            'checkout_url',
            'checkoutUrl',
            'paymentUrl',
            'payment_url',
            'redirect_url',
            'redirectUrl',
            'data.checkout_url',
            'data.checkoutUrl',
            'data.paymentUrl',
            'data.payment_url',
            'data.redirect_url',
            'data.redirectUrl',
            'payment.checkout_url',
            'payment.checkoutUrl',
            'payment.paymentUrl',
            'payment.redirect_url',
            'payment.redirectUrl',
        ] as $key) {
            $value = data_get($payload, $key);
            if (! is_string($value) || trim($value) === '') {
                continue;
            }
            $value = trim($value);
            $scheme = strtolower((string) parse_url($value, PHP_URL_SCHEME));
            $host = parse_url($value, PHP_URL_HOST);
            if (in_array($scheme, ['http', 'https'], true) && is_string($host) && $host !== '') {
                return $value;
            }
        }

        return null;
    }

    private function providerMessage(array $payload, bool $successful): ?string
    {
        foreach ([
            'message',
            'error',
            'error.message',
            'data.message',
            'data.error',
        ] as $key) {
            $value = data_get($payload, $key);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return $successful ? null : 'Le prestataire de paiement a refusé la demande.';
    }

    private function correlationId(array $context): string
    {
        $requestId = trim((string) ($context['request_id'] ?? $context['reference'] ?? ''));

        return $requestId !== '' ? $requestId : (string) Str::uuid();
    }

    private function transportFailure(string $errorCode, string $message, string $correlationId, string $reference, \Throwable $exception): array
    {
        Log::error('[DIAMANOPAY] Provider transport failure', [
            'reference' => $reference,
            'correlation_id' => $correlationId,
            'exception' => $exception::class,
            'error_code' => $errorCode,
        ]);

        return [
            'ok' => false,
            'status' => 'FAILED',
            'provider_transaction_id' => null,
            'provider_request_id' => null,
            'checkout_url' => null,
            'message' => $message,
            'error_code' => $errorCode,
            'raw' => [],
        ];
    }

    private function webhookUrl(): string
    {
        return trim((string) config('payments.webhook_url', ''));
    }
}