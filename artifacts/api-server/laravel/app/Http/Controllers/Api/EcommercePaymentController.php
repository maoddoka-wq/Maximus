<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DiamanoPayService;
use App\Support\CompanyRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Throwable;

final class EcommercePaymentController extends Controller
{
    public function __construct(private readonly DiamanoPayService $diamanoPay)
    {
    }

    public function create(Request $request, string $slug, string $orderId): JsonResponse
    {
        $store = DB::table('ecommerce_stores')->where('slug', $slug)->where('status', 'PUBLISHED')->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->createForOrder($request, $store, $orderId);
    }

    public function createByDomain(Request $request, string $orderId): JsonResponse
    {
        $host = strtolower(trim($request->getHost()));
        $domain = DB::table('ecommerce_domains')->where('domain', $host)->where('status', 'ACTIVE')->first();
        $store = $domain ? DB::table('ecommerce_stores')->where('company_id', $domain->company_id)->where('status', 'PUBLISHED')->first() : null;
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->createForOrder($request, $store, $orderId);
    }

    public function status(Request $request, string $slug, string $orderId): JsonResponse
    {
        $store = DB::table('ecommerce_stores')->where('slug', $slug)->where('status', 'PUBLISHED')->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->statusForOrder($store, $orderId);
    }

    public function statusByDomain(Request $request, string $orderId): JsonResponse
    {
        $host = strtolower(trim($request->getHost()));
        $domain = DB::table('ecommerce_domains')->where('domain', $host)->where('status', 'ACTIVE')->first();
        $store = $domain ? DB::table('ecommerce_stores')->where('company_id', $domain->company_id)->where('status', 'PUBLISHED')->first() : null;
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->statusForOrder($store, $orderId);
    }

    private function createForOrder(Request $request, object $store, string $orderId): JsonResponse
    {
        Validator::make($request->all(), [
            'successUrl' => ['nullable', 'url', 'max:500'],
            'errorUrl' => ['nullable', 'url', 'max:500'],
        ])->validate();

        $order = DB::table('ecommerce_orders')->where('id', $orderId)->where('company_id', $store->company_id)->first();
        if (! $order) {
            return response()->json(['error' => 'Commande introuvable.'], 404);
        }
        if ($order->payment_status === 'PAID') {
            return response()->json(['error' => 'Cette commande est déjà payée.'], 422);
        }
        if ($order->payment_charge_id && $order->payment_checkout_url) {
            return response()->json([
                'reference' => $order->reference,
                'total' => (int) $order->total,
                'checkoutUrl' => $order->payment_checkout_url,
                'paymentStatus' => $order->payment_status,
            ]);
        }

        try {
            $charge = $this->diamanoPay->createCharge([
                'amount' => (int) $order->total,
                'currency' => (string) $store->currency,
                'provider' => strtoupper(trim((string) config('services.diamanopay.provider', 'WAVE'))),
                'description' => 'Commande '.$order->reference,
                'clientReference' => $order->reference,
                'successUrl' => $request->input('successUrl'),
                'errorUrl' => $request->input('errorUrl'),
                'feeOnCustomer' => false,
            ], 'order:'.$order->id);
            $chargeId = trim((string) ($charge['id'] ?? ''));
            $checkoutUrl = trim((string) ($charge['checkout_url'] ?? ''));
            if ($chargeId === '' || $checkoutUrl === '') {
                return response()->json(['error' => 'DiamanoPay n’a pas retourné de checkout valide.'], 502);
            }
            DB::table('ecommerce_orders')->where('id', $order->id)->update([
                'payment_status' => 'PENDING',
                'payment_charge_id' => $chargeId,
                'payment_checkout_url' => $checkoutUrl,
                'payment_failure_reason' => '',
                'updated_at' => now(),
            ]);

            return response()->json([
                'reference' => $order->reference,
                'total' => (int) $order->total,
                'checkoutUrl' => $checkoutUrl,
                'paymentStatus' => 'PENDING',
            ], 201);
        } catch (Throwable $error) {
            report($error);
            return response()->json(['error' => $error->getMessage()], 503);
        }
    }

    private function statusForOrder(object $store, string $orderId): JsonResponse
    {
        $order = DB::table('ecommerce_orders')
            ->where('id', $orderId)
            ->where('company_id', $store->company_id)
            ->first();
        if (! $order) {
            return response()->json(['error' => 'Commande introuvable.'], 404);
        }

        return response()->json([
            'reference' => $order->reference,
            'total' => (int) $order->total,
            'paymentStatus' => $order->payment_status ?? 'UNPAID',
            'orderStatus' => $order->status,
            'failureReason' => $order->payment_failure_reason ?? '',
        ])->header('Cache-Control', 'private, no-store');
    }
}