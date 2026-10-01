<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DiamanoPayService;
use App\Services\EcommerceSubscriptionPaymentService;
use App\Services\EcommerceSubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Throwable;

final class EcommerceSubscriptionBillingController extends Controller
{
    public function __construct(
        private readonly EcommerceSubscriptionPaymentService $payments,
        private readonly EcommerceSubscriptionService $subscriptions,
        private readonly DiamanoPayService $diamanoPay,
    ) {
    }

    public function show(Request $request): JsonResponse
    {
        if (! $this->isCompanyAdmin($request)) {
            return response()->json(['error' => 'Seul l’administrateur de l’entreprise peut consulter cet abonnement.'], 403);
        }

        $companyId = $this->companyId($request);
        if ($companyId === '') {
            return response()->json(['error' => 'Contexte entreprise requis.'], 400);
        }
        if (! Schema::hasTable('maximus_company_ecommerce_prices')
            || ! Schema::hasTable('maximus_company_ecommerce_subscription_payments')) {
            return response()->json(['error' => 'Le service d’abonnement n’est pas encore déployé sur cette installation.'], 503);
        }

        $this->payments->refreshLatest($companyId);
        $payment = $this->payments->latestForCompany($companyId);

        return response()->json([
            'subscription' => $this->subscriptions->snapshot($companyId, $payment),
        ]);
    }

    public function checkout(Request $request): JsonResponse
    {
        if (! $this->isCompanyAdmin($request)) {
            return response()->json(['error' => 'Seul l’administrateur de l’entreprise peut renouveler cet abonnement.'], 403);
        }

        $input = Validator::make($request->all(), [
            'provider' => ['required', 'in:WAVE,ORANGE_MONEY'],
            'redirectUrl' => ['required', 'url', 'max:2048'],
        ])->validate();

        $companyId = $this->companyId($request);
        if ($companyId === '') {
            return response()->json(['error' => 'Contexte entreprise requis.'], 400);
        }
        if (! Schema::hasTable('maximus_company_ecommerce_prices')
            || ! Schema::hasTable('maximus_company_ecommerce_subscription_payments')) {
            return response()->json(['error' => 'Le service d’abonnement n’est pas encore déployé sur cette installation.'], 503);
        }

        if (! $this->subscriptions->snapshot($companyId)['available']) {
            return response()->json([
                'error' => 'L’abonnement E-commerce n’est pas disponible pour cette entreprise ou son tarif doit être configuré.',
            ], 422);
        }

        $redirectHost = strtolower((string) parse_url($input['redirectUrl'], PHP_URL_HOST));
        $originHost = strtolower((string) parse_url((string) $request->headers->get('Origin'), PHP_URL_HOST));
        $requestHost = strtolower($request->getHost());
        if ($redirectHost === '' || ! in_array($redirectHost, array_filter([$requestHost, $originHost]), true)) {
            return response()->json(['error' => 'L’adresse de retour doit appartenir à cette application.'], 422);
        }

        $webhookUrl = trim((string) config('services.diamanopay.webhook_url', ''));
        if ($webhookUrl === '') {
            $webhookUrl = rtrim((string) config('app.url', ''), '/');
            if ($webhookUrl === '' || str_contains($webhookUrl, 'localhost')) {
                $webhookUrl = rtrim($request->getSchemeAndHttpHost(), '/');
            }
        }
        $webhookUrl = rtrim($webhookUrl, '/').'/api/payments/diamanopay/webhook';

        try {
            $result = $this->payments->createCheckout(
                $companyId,
                $input['provider'],
                $input['redirectUrl'],
                $webhookUrl,
            );
        } catch (RuntimeException $exception) {
            $status = $this->diamanoPay->isConfigured() ? 502 : 503;

            return response()->json(['error' => $exception->getMessage()], $status);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['error' => 'Le paiement de l’abonnement n’a pas pu être créé.'], 502);
        }

        return response()->json(['payment' => $result['payment']], $result['created'] ? 201 : 200);
    }

    private function companyId(Request $request): string
    {
        return (string) $request->attributes->get('companyId', '');
    }

    private function isCompanyAdmin(Request $request): bool
    {
        return ($request->attributes->get('authActor')['role'] ?? null) === 'company_admin';
    }
}