<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

final class EcommerceSubscriptionPaymentService
{
    private const SUCCESS_STATUSES = ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'COMPLETED', 'PAID', 'SETTLED'];

    private const FAILURE_STATUSES = ['FAILED', 'CANCELLED', 'CANCELED', 'DECLINED', 'REJECTED', 'EXPIRED', 'ERROR', 'DENIED'];

    public function __construct(
        private readonly DiamanoPayService $diamanoPay,
    ) {
    }

    public function latestForCompany(string $companyId): ?object
    {
        return DB::table('maximus_company_ecommerce_subscription_payments')
            ->where('company_id', $companyId)
            ->orderByDesc('created_at')
            ->first();
    }

    public function createCheckout(string $companyId, string $provider, string $redirectUrl, string $webhookUrl): array
    {
        if (! $this->diamanoPay->isConfigured()) {
            throw new RuntimeException('DiamanoPay n’est pas encore configuré pour cette application.');
        }

        $payment = DB::transaction(function () use ($companyId, $provider): object {
            $price = DB::table('maximus_company_ecommerce_prices')
                ->where('company_id', $companyId)
                ->lockForUpdate()
                ->first(['monthly_amount']);
            $moduleStatus = DB::table('maximus_company_modules')
                ->where('company_id', $companyId)
                ->where('module_id', 'ecommerce')
                ->value('status');

            if (! $price || (int) $price->monthly_amount < 1) {
                throw new RuntimeException('Le tarif de l’abonnement E-commerce doit être supérieur à 0 FCFA.');
            }

            if (! in_array($moduleStatus, ['ACTIF', 'BETA'], true)) {
                throw new RuntimeException('L’abonnement E-commerce n’est pas disponible pour cette entreprise.');
            }

            $pending = DB::table('maximus_company_ecommerce_subscription_payments')
                ->where('company_id', $companyId)
                ->whereIn('status', ['CREATING', 'PENDING'])
                ->orderByDesc('created_at')
                ->lockForUpdate()
                ->first();
            if ($pending) {
                return $pending;
            }

            $now = now();
            $reference = 'MAX-SUB-'.strtoupper(Str::random(16));
            $id = (string) Str::uuid();
            DB::table('maximus_company_ecommerce_subscription_payments')->insert([
                'id' => $id,
                'company_id' => $companyId,
                'reference' => $reference,
                'amount' => (int) $price->monthly_amount,
                'currency' => 'XOF',
                'provider' => $provider,
                'status' => 'CREATING',
                'idempotency_key' => 'ecommerce-subscription:'.$companyId.':'.$reference,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return DB::table('maximus_company_ecommerce_subscription_payments')
                ->where('id', $id)
                ->first();
        });

        if ($payment->status === 'PENDING' && filled($payment->checkout_url)) {
            return ['payment' => $this->paymentPayload($payment), 'created' => false];
        }

        if ($payment->status !== 'CREATING') {
            throw new RuntimeException('Le paiement de l’abonnement est dans un état inattendu.');
        }

        $companyName = DB::table('companies')->where('id', $companyId)->value('name') ?? $companyId;
        try {
            $response = $this->diamanoPay->createCharge([
                'amount' => (int) $payment->amount,
                'currency' => (string) $payment->currency,
                'provider' => (string) $payment->provider,
                'description' => 'Abonnement E-commerce MAXIMUS — '.$companyName,
                'clientReference' => (string) $payment->reference,
                'redirectUrl' => $redirectUrl,
                'webhook' => $webhookUrl,
                'feeOnCustomer' => false,
            ], (string) $payment->idempotency_key);

            $response = $this->providerData($response);
            $providerChargeId = $this->firstValue($response, ['id', 'charge_id', 'chargeId']);
            $checkoutUrl = $this->firstValue($response, ['checkout_url', 'checkoutUrl', 'payment_url', 'paymentUrl']);
            if ($providerChargeId === '' || $checkoutUrl === '') {
                throw new RuntimeException('La réponse DiamanoPay ne contient pas de charge et de lien de paiement valides.');
            }

            DB::transaction(function () use ($payment, $providerChargeId, $checkoutUrl): void {
                $locked = DB::table('maximus_company_ecommerce_subscription_payments')
                    ->where('id', $payment->id)
                    ->lockForUpdate()
                    ->first();
                if (! $locked || $locked->status === 'PAID') {
                    return;
                }
                if ($locked->provider_charge_id && $locked->provider_charge_id !== $providerChargeId) {
                    throw new RuntimeException('DiamanoPay a retourné un identifiant de charge différent pour le même paiement.');
                }

                DB::table('maximus_company_ecommerce_subscription_payments')
                    ->where('id', $payment->id)
                    ->update([
                        'provider_charge_id' => $providerChargeId,
                        'checkout_url' => $checkoutUrl,
                        'status' => 'PENDING',
                        'updated_at' => now(),
                    ]);
            });
        } catch (Throwable $exception) {
            report($exception);
            throw $exception;
        }

        $saved = DB::table('maximus_company_ecommerce_subscription_payments')
            ->where('id', $payment->id)
            ->first();
        if (! $saved) {
            throw new RuntimeException('Le paiement de l’abonnement n’a pas pu être retrouvé après sa création.');
        }

        return ['payment' => $this->paymentPayload($saved), 'created' => true];
    }

    public function refreshLatest(string $companyId): void
    {
        $payment = DB::table('maximus_company_ecommerce_subscription_payments')
            ->where('company_id', $companyId)
            ->where('status', 'PENDING')
            ->whereNotNull('provider_charge_id')
            ->orderByDesc('created_at')
            ->first();

        if (! $payment) {
            return;
        }

        try {
            $this->applyStatus((string) $payment->id, $this->diamanoPay->chargeStatus((string) $payment->provider_charge_id));
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    public function handleWebhook(string $providerChargeId, array $providerPayload): bool
    {
        $payment = DB::table('maximus_company_ecommerce_subscription_payments')
            ->where('provider_charge_id', $providerChargeId)
            ->first();

        if (! $payment) {
            $reference = $this->firstValue($providerPayload, [
                'clientReference',
                'client_reference',
                'reference',
            ]);
            if ($reference !== '') {
                $payment = DB::table('maximus_company_ecommerce_subscription_payments')
                    ->where('reference', $reference)
                    ->first();
            }
        }

        if (! $payment) {
            return false;
        }

        $this->applyStatus((string) $payment->id, $providerPayload, $providerChargeId);

        return true;
    }

    private function applyStatus(string $paymentId, array $providerPayload, ?string $providerChargeId = null): void
    {
        $data = $this->providerData($providerPayload);
        $status = strtoupper(trim((string) (
            $data['status']
            ?? $data['payment_status']
            ?? $data['paymentStatus']
            ?? $data['state']
            ?? 'PENDING'
        )));

        DB::transaction(function () use ($paymentId, $providerChargeId, $data, $status): void {
            $payment = DB::table('maximus_company_ecommerce_subscription_payments')
                ->where('id', $paymentId)
                ->lockForUpdate()
                ->first();
            if (! $payment || in_array($payment->status, ['PAID', 'FAILED'], true)) {
                return;
            }

            if ($providerChargeId !== null) {
                if ($payment->provider_charge_id && $payment->provider_charge_id !== $providerChargeId) {
                    throw new RuntimeException('La charge webhook ne correspond pas au paiement de l’abonnement.');
                }
                if (! $payment->provider_charge_id) {
                    DB::table('maximus_company_ecommerce_subscription_payments')
                        ->where('id', $paymentId)
                        ->update([
                            'provider_charge_id' => $providerChargeId,
                            'updated_at' => now(),
                        ]);
                }
            }

            $this->assertProviderPaymentMatches($payment, $data);

            if (in_array($status, self::FAILURE_STATUSES, true)) {
                DB::table('maximus_company_ecommerce_subscription_payments')
                    ->where('id', $paymentId)
                    ->update(['status' => 'FAILED', 'updated_at' => now()]);

                return;
            }

            if (! in_array($status, self::SUCCESS_STATUSES, true)) {
                return;
            }

            $price = DB::table('maximus_company_ecommerce_prices')
                ->where('company_id', $payment->company_id)
                ->lockForUpdate()
                ->first(['monthly_amount', 'paid_through_at']);
            if (! $price) {
                throw new RuntimeException('La configuration de l’abonnement n’existe plus.');
            }

            $now = now();
            $previousEnd = $price->paid_through_at ? Carbon::parse($price->paid_through_at) : null;
            $periodStart = $previousEnd && $previousEnd->isAfter($now) ? $previousEnd : $now;
            $periodEnd = $periodStart->copy()->addDays(30);

            DB::table('maximus_company_ecommerce_subscription_payments')
                ->where('id', $paymentId)
                ->update([
                    'status' => 'PAID',
                    'paid_at' => $now,
                    'period_started_at' => $periodStart,
                    'period_ends_at' => $periodEnd,
                    'updated_at' => $now,
                ]);
            DB::table('maximus_company_ecommerce_prices')
                ->where('company_id', $payment->company_id)
                ->update([
                    'paid_through_at' => $periodEnd,
                    'updated_at' => $now,
                ]);
        });
    }

    private function assertProviderPaymentMatches(object $payment, array $data): void
    {
        $reference = $this->firstValue($data, ['clientReference', 'client_reference', 'reference']);
        if ($reference !== '' && $reference !== (string) $payment->reference) {
            throw new RuntimeException('La référence DiamanoPay ne correspond pas au paiement de l’abonnement.');
        }

        $amount = $data['amount'] ?? null;
        if ($amount !== null) {
            if (! is_numeric($amount) || (int) $amount !== (int) $payment->amount) {
                throw new RuntimeException('Le montant confirmé par DiamanoPay ne correspond pas au paiement de l’abonnement.');
            }
        }

        $currency = strtoupper(trim((string) ($data['currency'] ?? '')));
        if ($currency !== '' && $currency !== strtoupper((string) $payment->currency)) {
            throw new RuntimeException('La devise confirmée par DiamanoPay ne correspond pas au paiement de l’abonnement.');
        }
    }

    private function paymentPayload(object $payment): array
    {
        return [
            'id' => (string) $payment->id,
            'reference' => (string) $payment->reference,
            'amount' => (int) $payment->amount,
            'currency' => (string) $payment->currency,
            'provider' => (string) $payment->provider,
            'status' => (string) $payment->status,
            'checkoutUrl' => $payment->checkout_url,
            'paidAt' => $payment->paid_at
                ? Carbon::parse($payment->paid_at)->toISOString()
                : null,
        ];
    }

    private function providerData(array $payload): array
    {
        $nested = is_array($payload['data'] ?? null) ? $payload['data'] : [];

        return array_merge($payload, $nested);
    }

    private function firstValue(array $payload, array $keys): string
    {
        foreach ($keys as $key) {
            $value = trim((string) ($payload[$key] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }
}