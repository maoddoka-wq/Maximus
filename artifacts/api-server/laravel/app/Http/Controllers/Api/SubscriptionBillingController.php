<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\DiamanoPayService;
use App\Services\SubscriptionPricing;
use App\Support\ModuleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

final class SubscriptionBillingController extends Controller
{
    private const ACTIVE_MODULE_STATUSES = ['ACTIF', 'BETA'];
    private const PAID_STATUSES = ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'COMPLETED', 'PAID', 'SETTLED'];
    private const FAILED_STATUSES = ['FAILED', 'CANCELLED', 'CANCELED', 'DECLINED', 'REJECTED', 'EXPIRED', 'ERROR', 'DENIED'];

    public function __construct(
        private readonly DiamanoPayService $diamanoPay,
        private readonly SubscriptionPricing $pricing,
    ) {}

    public function platformIndex(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Seul MAXIMUS peut consulter la grille tarifaire.'], 403);
        }

        $definitions = collect(ModuleCatalog::publishedDefinitionsWithCustom());
        $companies = Company::query()
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get(['id', 'name']);
        $companyIds = $companies->pluck('id')->all();
        $activeRows = DB::table('maximus_company_modules')
            ->whereIn('company_id', $companyIds)
            ->whereIn('status', self::ACTIVE_MODULE_STATUSES)
            ->get(['company_id', 'module_id'])
            ->groupBy('company_id');
        $overrides = DB::table('maximus_company_subscription_prices')
            ->whereIn('company_id', $companyIds)
            ->get()
            ->keyBy('company_id');
        $definitionsById = $definitions->keyBy('id');

        return response()->json([
            'companies' => $companies->map(function (Company $company) use (
                $activeRows,
                $definitionsById,
                $overrides,
            ): array {
                $modules = collect($activeRows->get($company->id, []))
                    ->filter(fn (object $row): bool => $definitionsById->has((string) $row->module_id))
                    ->map(function (object $row) use ($definitionsById): array {
                        $definition = $definitionsById->get($row->module_id);

                        return [
                            'id' => (string) $row->module_id,
                            'name' => (string) ($definition['name'] ?? $row->module_id),
                        ];
                    })->values()->all();
                $override = $overrides->get($company->id);
                $customAmount = $override?->custom_monthly_amount === null
                    ? null
                    : (int) $override->custom_monthly_amount;

                return [
                    'companyId' => (string) $company->id,
                    'companyName' => (string) $company->name,
                    ...$this->pricing->calculate($modules, $customAmount),
                    'updatedAt' => $override?->updated_at,
                ];
            })->values(),
        ]);
    }

    public function updateCompanyPrice(Request $request, string $companyId): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Seul MAXIMUS peut modifier le tarif personnalisé.'], 403);
        }

        $input = $request->validate([
            'customAmount' => ['present', 'nullable', 'integer', 'min:0', 'max:2147483647'],
        ]);
        $company = Company::query()->whereKey($companyId)->whereNull('deleted_at')->first();
        if (! $company) {
            return response()->json(['error' => 'Entreprise introuvable.'], 404);
        }

        $existing = DB::table('maximus_company_subscription_prices')->where('company_id', $companyId)->first();
        $now = now();
        DB::table('maximus_company_subscription_prices')->updateOrInsert(
            ['company_id' => $companyId],
            [
                'custom_monthly_amount' => $input['customAmount'],
                'updated_by' => $request->attributes->get('authUser')?->id,
                'created_at' => $existing?->created_at ?? $now,
                'updated_at' => $now,
            ],
        );

        return response()->json([
            'companyId' => $companyId,
            'customAmount' => $input['customAmount'] === null ? null : (int) $input['customAmount'],
            'updatedAt' => $now->toISOString(),
        ]);
    }

    public function showForCompany(Request $request): JsonResponse
    {
        $companyId = $this->companyAdminId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }

        return response()->json($this->companyPayload($companyId));
    }

    public function createPayment(Request $request): JsonResponse
    {
        $companyId = $this->companyAdminId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }
        if (! $this->diamanoPay->isConfigured()) {
            return response()->json(['error' => 'Le paiement DiamanoPay n’est pas encore configuré.'], 503);
        }

        $input = $request->validate([
            'provider' => ['sometimes', 'string', 'in:WAVE,ORANGE_MONEY'],
            'redirectUrl' => ['nullable', 'url', 'max:500'],
        ]);
        try {
            $payment = DB::transaction(function () use ($companyId, $input): object {
                $company = Company::query()
                    ->whereKey($companyId)
                    ->whereNull('deleted_at')
                    ->lockForUpdate()
                    ->first();
                if (! $company) {
                    throw new \RuntimeException('COMPANY_NOT_FOUND');
                }
                $companyPayload = $this->companyPayload($companyId);
                $amount = (int) $companyPayload['payableAmount'];
                if ($amount <= 0) {
                    throw new \RuntimeException('SUBSCRIPTION_AMOUNT_ZERO');
                }

                $existing = DB::table('maximus_subscription_payments')
                    ->where('company_id', $companyId)
                    ->where('status', 'PENDING')
                    ->orderByDesc('created_at')
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    if ((int) $existing->amount !== $amount) {
                        throw new \RuntimeException('PENDING_AMOUNT_CONFLICT');
                    }

                    return $existing;
                }

                $id = (string) Str::uuid();
                $reference = 'SUB-'.strtoupper(Str::random(12));
                $now = now();
                $configuredProvider = strtoupper(trim((string) config('services.diamanopay.provider', '')));
                $provider = $input['provider'] ?? ($configuredProvider !== '' ? $configuredProvider : 'WAVE');
                if (! in_array($provider, ['WAVE', 'ORANGE_MONEY'], true)) {
                    throw new \RuntimeException('Moyen de paiement DiamanoPay non disponible.');
                }
                DB::table('maximus_subscription_payments')->insert([
                    'id' => $id,
                    'company_id' => $companyId,
                    'reference' => $reference,
                    'amount' => $amount,
                    'currency' => 'XOF',
                    'status' => 'PENDING',
                    'provider_charge_id' => null,
                    'checkout_url' => null,
                    'provider' => $provider,
                    'failure_reason' => null,
                    'paid_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                return DB::table('maximus_subscription_payments')->where('id', $id)->first();
            });
        } catch (Throwable $error) {
            if ($error->getMessage() === 'SUBSCRIPTION_AMOUNT_ZERO') {
                return response()->json(['error' => 'Le montant à payer doit être supérieur à zéro.'], 422);
            }
            if ($error->getMessage() === 'COMPANY_NOT_FOUND') {
                return response()->json(['error' => 'Entreprise introuvable.'], 404);
            }
            if ($error->getMessage() === 'PENDING_AMOUNT_CONFLICT') {
                return response()->json([
                    'error' => 'Un paiement précédent est encore en attente à un autre montant. Vérifiez ou terminez ce paiement avant d’en créer un nouveau.',
                ], 409);
            }
            report($error);

            return response()->json(['error' => 'La création du paiement DiamanoPay a échoué. Réessayez.'], 503);
        }

        if ($payment->checkout_url) {
            return response()->json(['payment' => $this->paymentPayload($payment)]);
        }

        try {
            $baseWebhookUrl = trim((string) config('services.diamanopay.webhook_url', ''));
            if ($baseWebhookUrl === '') {
                $baseWebhookUrl = rtrim((string) config('app.url', ''), '/');
                if ($baseWebhookUrl === '' || str_contains($baseWebhookUrl, 'localhost')) {
                    $baseWebhookUrl = rtrim($request->getSchemeAndHttpHost(), '/');
                }
            }
            $companyName = (string) (Company::query()->whereKey($companyId)->value('name') ?? '');
            $charge = $this->diamanoPay->createCharge([
                'amount' => (int) $payment->amount,
                'currency' => (string) $payment->currency,
                'provider' => (string) $payment->provider,
                'description' => 'Abonnement MAXIMUS '.$companyName,
                'clientReference' => (string) $payment->reference,
                'redirectUrl' => $input['redirectUrl'] ?? null,
                'webhook' => $baseWebhookUrl.'/api/payments/diamanopay/subscription-webhook',
                'feeOnCustomer' => false,
            ], 'subscription:'.$payment->id);
            $data = is_array($charge['data'] ?? null)
                ? array_merge($charge, $charge['data'])
                : $charge;
            $chargeId = trim((string) (
                $data['id'] ?? $data['charge_id'] ?? $data['chargeId'] ?? ''
            ));
            $checkoutUrl = trim((string) (
                $data['checkout_url'] ?? $data['checkoutUrl'] ?? $data['payment_url'] ?? $data['paymentUrl'] ?? ''
            ));
            if (
                $chargeId === ''
                || filter_var($checkoutUrl, FILTER_VALIDATE_URL) === false
                || strtolower((string) parse_url($checkoutUrl, PHP_URL_SCHEME)) !== 'https'
            ) {
                throw new \RuntimeException('DiamanoPay n’a pas retourné un checkout valide.');
            }

            DB::table('maximus_subscription_payments')
                ->where('id', $payment->id)
                ->where('status', 'PENDING')
                ->update([
                    'provider_charge_id' => $chargeId,
                    'checkout_url' => $checkoutUrl,
                    'updated_at' => now(),
                ]);
        } catch (Throwable $error) {
            report($error);

            return response()->json(['error' => 'La création du paiement DiamanoPay a échoué. Réessayez.'], 503);
        }

        return response()->json([
            'payment' => $this->paymentPayload(
                DB::table('maximus_subscription_payments')->where('id', $payment->id)->first(),
            ),
        ], 201);
    }

    public function paymentStatus(Request $request, string $paymentId): JsonResponse
    {
        $companyId = $this->companyAdminId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }

        $payment = DB::table('maximus_subscription_payments')
            ->where('company_id', $companyId)
            ->where('id', $paymentId)
            ->first();
        if (! $payment) {
            return response()->json(['error' => 'Paiement introuvable.'], 404);
        }

        if ($payment->status === 'PENDING' && $payment->provider_charge_id && $this->diamanoPay->isConfigured()) {
            try {
                $this->applyProviderStatus(
                    $payment->id,
                    $this->diamanoPay->chargeStatus((string) $payment->provider_charge_id),
                );
            } catch (Throwable $error) {
                report($error);
            }
        }

        return response()->json([
            'payment' => $this->paymentPayload(
                DB::table('maximus_subscription_payments')->where('id', $paymentId)->first(),
            ),
        ])->header('Cache-Control', 'private, no-store');
    }

    public function webhook(Request $request): JsonResponse
    {
        $body = $request->getContent();
        if (! $this->diamanoPay->verifyWebhook($body, $request->header('X-Diamanopay-Signature'))) {
            return response()->json(['error' => 'Signature webhook invalide.'], 401);
        }

        $payload = json_decode($body, true);
        if (! is_array($payload)) {
            return response()->json(['error' => 'Payload webhook invalide.'], 422);
        }
        $data = $this->providerData($payload);
        $providerId = $this->providerId($data);
        if ($providerId === '') {
            return response()->json(['received' => true]);
        }

        $payment = DB::table('maximus_subscription_payments')
            ->where('provider_charge_id', $providerId)
            ->first();
        if (! $payment) {
            return response()->json(['received' => true]);
        }

        try {
            $this->applyProviderStatus($payment->id, $data);
        } catch (Throwable $error) {
            report($error);

            return response()->json(['error' => 'Le webhook d’abonnement n’a pas pu être traité.'], 500);
        }

        return response()->json(['received' => true]);
    }

    private function companyPayload(string $companyId): array
    {
        $definitions = collect(ModuleCatalog::publishedDefinitionsWithCustom())->keyBy('id');
        $activeIds = DB::table('maximus_company_modules')
            ->where('company_id', $companyId)
            ->whereIn('status', self::ACTIVE_MODULE_STATUSES)
            ->orderBy('module_id')
            ->pluck('module_id')
            ->filter(fn (mixed $id): bool => $definitions->has((string) $id))
            ->map(fn (mixed $id): array => [
                'id' => (string) $id,
                'name' => (string) ($definitions->get($id)['name'] ?? $id),
            ])->all();
        $customAmount = DB::table('maximus_company_subscription_prices')
            ->where('company_id', $companyId)
            ->value('custom_monthly_amount');
        $customAmount = $customAmount === null ? null : (int) $customAmount;
        $company = Company::query()->whereKey($companyId)->first(['id', 'name']);
        $payments = DB::table('maximus_subscription_payments')
            ->where('company_id', $companyId)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn (object $payment): array => $this->paymentPayload($payment))
            ->values();

        return [
            'companyId' => $companyId,
            'companyName' => (string) ($company?->name ?? ''),
            ...$this->pricing->calculate($activeIds, $customAmount),
            'paymentReady' => $this->diamanoPay->isConfigured(),
            'payments' => $payments,
        ];
    }

    private function applyProviderStatus(string $paymentId, array $providerResponse): void
    {
        $data = $this->providerData($providerResponse);
        $status = $this->providerStatus($data);
        if (! in_array($status, [...self::PAID_STATUSES, ...self::FAILED_STATUSES], true)) {
            return;
        }

        DB::transaction(function () use ($paymentId, $status, $data): void {
            $payment = DB::table('maximus_subscription_payments')
                ->where('id', $paymentId)
                ->lockForUpdate()
                ->first();
            if (! $payment || $payment->status !== 'PENDING') {
                return;
            }

            if (in_array($status, self::PAID_STATUSES, true)) {
                DB::table('maximus_subscription_payments')->where('id', $paymentId)->update([
                    'status' => 'PAID',
                    'failure_reason' => null,
                    'paid_at' => now(),
                    'updated_at' => now(),
                ]);

                return;
            }

            $reason = trim((string) (
                $data['failure_reason'] ?? $data['failureReason'] ?? $data['reason'] ?? $data['message'] ?? ''
            ));
            DB::table('maximus_subscription_payments')->where('id', $paymentId)->update([
                'status' => 'FAILED',
                'failure_reason' => $reason !== '' ? Str::limit($reason, 1000) : 'Le paiement DiamanoPay a échoué.',
                'updated_at' => now(),
            ]);
        });
    }

    private function paymentPayload(?object $payment): array
    {
        if (! $payment) {
            return [];
        }

        return [
            'id' => (string) $payment->id,
            'reference' => (string) $payment->reference,
            'amount' => (int) $payment->amount,
            'currency' => (string) $payment->currency,
            'status' => (string) $payment->status,
            'checkoutUrl' => $payment->checkout_url,
            'failureReason' => (string) ($payment->failure_reason ?? ''),
            'createdAt' => (string) $payment->created_at,
            'paidAt' => $payment->paid_at,
        ];
    }

    private function companyAdminId(Request $request): string|JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        $companyId = $request->attributes->get('companyId');
        if (! is_array($actor) || ($actor['role'] ?? null) !== 'company_admin') {
            return response()->json(['error' => 'Cette rubrique est réservée à l’administrateur de l’entreprise.'], 403);
        }
        if (! is_string($companyId) || $companyId === '' || ($actor['companyId'] ?? null) !== $companyId) {
            return response()->json(['error' => 'Entreprise non autorisée.'], 403);
        }

        return $companyId;
    }

    private function isMaximusAdmin(Request $request): bool
    {
        $actor = $request->attributes->get('authActor');

        return is_array($actor) && ($actor['role'] ?? null) === 'maximus_admin';
    }

    private function providerData(array $payload): array
    {
        return array_merge($payload, is_array($payload['data'] ?? null) ? $payload['data'] : []);
    }

    private function providerId(array $payload): string
    {
        return trim((string) (
            $payload['id']
            ?? $payload['charge_id']
            ?? $payload['chargeId']
            ?? $payload['transaction_id']
            ?? $payload['transactionId']
            ?? ''
        ));
    }

    private function providerStatus(array $payload): string
    {
        return strtoupper(trim((string) (
            $payload['status']
            ?? $payload['payment_status']
            ?? $payload['paymentStatus']
            ?? $payload['state']
            ?? ''
        )));
    }
}