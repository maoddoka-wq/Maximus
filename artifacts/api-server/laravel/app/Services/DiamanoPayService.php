<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class DiamanoPayService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.diamanopay.base_url', 'https://api.diamanopay.com'), '/');
    }

    public function isConfigured(): bool
    {
        return (string) config('services.diamanopay.client_id') !== ''
            && (string) config('services.diamanopay.client_secret') !== ''
            && (string) config('services.diamanopay.webhook_secret') !== '';
    }

    public function createCharge(array $payload): array
    {
        return $this->requestWithToken('POST', '/api/charges', $payload);
    }

    public function payout(array $payload): array
    {
        return $this->requestWithToken('POST', '/api/payout', $payload);
    }

    public function verifyWebhook(string $body, ?string $signature): bool
    {
        $secret = (string) config('services.diamanopay.webhook_secret');
        if ($secret === '' || $signature === null || $signature === '') {
            return false;
        }

        return hash_equals(hash_hmac('sha256', $body, $secret), trim($signature));
    }

    private function requestWithToken(string $method, string $path, array $payload): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('DiamanoPay n’est pas encore configuré pour cette application.');
        }

        $response = Http::retry(2, 250)
            ->timeout(15)
            ->withToken($this->accessToken())
            ->acceptJson()
            ->post($this->baseUrl.$path, $payload);

        if ($response->failed()) {
            throw new RuntimeException('DiamanoPay a refusé la demande (HTTP '.$response->status().').');
        }

        $body = $response->json();
        if (! is_array($body)) {
            throw new RuntimeException('La réponse DiamanoPay est invalide.');
        }

        return $body;
    }

    private function accessToken(): string
    {
        return (string) Cache::remember('diamanopay.access_token', now()->addMinutes(50), function (): string {
            $response = Http::asForm()
                ->retry(2, 250)
                ->timeout(15)
                ->post($this->baseUrl.'/oauth2/token', [
                    'grant_type' => 'client_credentials',
                    'client_id' => config('services.diamanopay.client_id'),
                    'client_secret' => config('services.diamanopay.client_secret'),
                ]);

            if ($response->failed() || ! is_string($response->json('access_token'))) {
                throw new RuntimeException('Impossible d’obtenir un token DiamanoPay.');
            }

            return $response->json('access_token');
        });
    }
}