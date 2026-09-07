<?php

namespace App\Contracts;

interface PaymentProviderInterface
{
    public function initialize(array $payment): array;

    public function verify(string $providerTransactionId, array $context = []): array;

    public function refund(string $providerTransactionId, int $amount, string $currency, string $reference, string $reason = ''): array;

    public function payout(array $withdrawal): array;

    public function verifyWebhook(string $payload, ?string $signature): bool;
}