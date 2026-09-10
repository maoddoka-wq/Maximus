<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DiamanoPayService;
use App\Support\CompanyRegistry;
use App\Support\EcommerceCustomerAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Throwable;

final class EcommercePaymentController extends Controller
{
    public function __construct(
        private readonly DiamanoPayService $diamanoPay,
        private readonly SellerWalletController $sellerWallet,
    )
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

        return $this->statusForOrder($request, $store, $orderId, '/api/shop/'.rawurlencode($slug));
    }

    public function statusByDomain(Request $request, string $orderId): JsonResponse
    {
        $host = strtolower(trim($request->getHost()));
        $domain = DB::table('ecommerce_domains')->where('domain', $host)->where('status', 'ACTIVE')->first();
        $store = $domain ? DB::table('ecommerce_stores')->where('company_id', $domain->company_id)->where('status', 'PUBLISHED')->first() : null;
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->statusForOrder($request, $store, $orderId, '/api/shop-domain');
    }

    public function downloadDigitalProduct(Request $request, string $slug, string $orderId, string $itemId)
    {
        $store = DB::table('ecommerce_stores')->where('slug', $slug)->where('status', 'PUBLISHED')->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->downloadForOrder($request, $store, $orderId, $itemId);
    }

    public function downloadDigitalProductByDomain(Request $request, string $orderId, string $itemId)
    {
        $host = strtolower(trim($request->getHost()));
        $domain = DB::table('ecommerce_domains')->where('domain', $host)->where('status', 'ACTIVE')->first();
        $store = $domain ? DB::table('ecommerce_stores')->where('company_id', $domain->company_id)->where('status', 'PUBLISHED')->first() : null;
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->downloadForOrder($request, $store, $orderId, $itemId);
    }

    private function createForOrder(Request $request, object $store, string $orderId): JsonResponse
    {
        Validator::make($request->all(), [
            'redirectUrl' => ['nullable', 'url', 'max:500'],
            'provider' => ['sometimes', 'string', 'in:WAVE,ORANGE_MONEY'],
        ])->validate();

        try {
            return DB::transaction(function () use ($request, $store, $orderId): JsonResponse {
                // The provider call stays inside the row lock. A fast double click
                // must observe the first checkout instead of creating a second charge.
                $order = DB::table('ecommerce_orders')
                    ->where('id', $orderId)
                    ->where('company_id', $store->company_id)
                    ->lockForUpdate()
                    ->first();
                if (! $order) {
                    return response()->json(['error' => 'Commande introuvable.'], 404);
                }
                if ($order->payment_status === 'PAID') {
                    return response()->json(['error' => 'Cette commande est déjà payée.'], 422);
                }
                if ($order->payment_status === 'PENDING' && $order->payment_charge_id && $order->payment_checkout_url) {
                    return response()->json([
                        'reference' => $order->reference,
                        'total' => (int) $order->total,
                        'checkoutUrl' => $order->payment_checkout_url,
                        'paymentStatus' => $order->payment_status,
                    ]);
                }

                $requestedProvider = trim((string) $request->input('provider', ''));
                $configuredProvider = trim((string) config('services.diamanopay.provider', ''));
                $provider = strtoupper($requestedProvider !== '' ? $requestedProvider : ($configuredProvider !== '' ? $configuredProvider : 'WAVE'));
                if (! in_array($provider, ['WAVE', 'ORANGE_MONEY'], true)) {
                    return response()->json(['error' => 'Moyen de paiement DiamanoPay non disponible.'], 422);
                }
                $webhookUrl = trim((string) config('services.diamanopay.webhook_url', ''));
                if ($webhookUrl === '') {
                    $webhookUrl = rtrim((string) config('app.url', ''), '/');
                    if ($webhookUrl === '' || str_contains($webhookUrl, 'localhost')) {
                        $webhookUrl = rtrim($request->getSchemeAndHttpHost(), '/');
                    }
                }
                $webhookUrl .= '/api/payments/diamanopay/webhook';
                $idempotencyKey = 'order:'.$order->id;
                if ($order->payment_status !== 'PENDING' && $order->payment_charge_id) {
                    $idempotencyKey .= ':retry:'.$order->payment_charge_id;
                }
                $charge = $this->diamanoPay->createCharge([
                    'amount' => (int) $order->total,
                    'currency' => (string) $store->currency,
                    'provider' => $provider,
                    'description' => 'Commande '.$order->reference,
                    'clientReference' => $order->reference,
                    'redirectUrl' => $request->input('redirectUrl'),
                    'webhook' => $webhookUrl,
                    'feeOnCustomer' => false,
                ], $idempotencyKey);
                $chargeData = is_array($charge['data'] ?? null)
                    ? array_merge($charge, $charge['data'])
                    : $charge;
                $chargeId = trim((string) (
                    $chargeData['id']
                    ?? $chargeData['charge_id']
                    ?? $chargeData['chargeId']
                    ?? ''
                ));
                $checkoutUrl = trim((string) (
                    $chargeData['checkout_url']
                    ?? $chargeData['checkoutUrl']
                    ?? $chargeData['payment_url']
                    ?? $chargeData['paymentUrl']
                    ?? ''
                ));
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
            });
        } catch (Throwable $error) {
            report($error);
            return response()->json(['error' => $error->getMessage()], 503);
        }
    }

    private function statusForOrder(Request $request, object $store, string $orderId, string $downloadBasePath): JsonResponse
    {
        $order = DB::table('ecommerce_orders')
            ->where('id', $orderId)
            ->where('company_id', $store->company_id)
            ->first();
        if (! $order) {
            return response()->json(['error' => 'Commande introuvable.'], 404);
        }

        $this->sellerWallet->refreshOrderPaymentStatus($order);
        $order = DB::table('ecommerce_orders')
            ->where('id', $orderId)
            ->where('company_id', $store->company_id)
            ->first() ?? $order;

        $payload = [
            'reference' => $order->reference,
            'total' => (int) $order->total,
            'paymentStatus' => $order->payment_status ?? 'UNPAID',
            'orderStatus' => $order->status,
            'failureReason' => $order->payment_failure_reason ?? '',
        ];
        if (($order->payment_status ?? 'UNPAID') === 'PAID' && $this->canDownload($request, $store, $order)) {
            $payload['digitalDownloads'] = $this->digitalDownloads($order, $downloadBasePath, (string) $request->query('token', ''));
        } else {
            $payload['digitalDownloads'] = [];
        }

        return response()->json($payload)->header('Cache-Control', 'private, no-store');
    }

    private function downloadForOrder(Request $request, object $store, string $orderId, string $itemId)
    {
        $order = DB::table('ecommerce_orders')
            ->where('id', $orderId)
            ->where('company_id', $store->company_id)
            ->first();
        if (! $order || ($order->payment_status ?? 'UNPAID') !== 'PAID' || ! $this->canDownload($request, $store, $order)) {
            return response()->json(['error' => 'Téléchargement indisponible.'], 403);
        }

        $item = DB::table('ecommerce_order_items as item')
            ->join('ecommerce_products as product', function ($join) use ($store): void {
                $join->on('product.id', '=', 'item.product_id')
                    ->where('product.company_id', '=', $store->company_id);
            })
            ->where('item.id', $itemId)
            ->where('item.order_id', $order->id)
            ->where('item.product_type', 'DIGITAL')
            ->first([
                'product.digital_file_data',
                'product.digital_file_name',
                'product.digital_file_mime',
            ]);
        if (! $item || empty($item->digital_file_data)) {
            return response()->json(['error' => 'Fichier numérique introuvable.'], 404);
        }

        $contents = base64_decode($item->digital_file_data, true);
        if ($contents === false) {
            return response()->json(['error' => 'Le fichier numérique est illisible.'], 500);
        }

        return response($contents, 200, [
            'Content-Type' => $item->digital_file_mime ?: 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="'.addcslashes($item->digital_file_name ?: 'telechargement', "\"\\").'"',
            'Content-Length' => (string) strlen($contents),
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function canDownload(Request $request, object $store, object $order): bool
    {
        $token = trim((string) $request->query('token', ''));
        $expected = hash_hmac('sha256', $store->company_id.':'.$order->id, (string) config('app.key'));
        if ($token !== '' && hash_equals($expected, $token)) {
            return true;
        }

        $customer = EcommerceCustomerAuth::customerFromRequest($request, (string) $store->company_id);
        return $customer !== null && (string) ($order->customer_id ?? '') === (string) $customer->id;
    }

    private function digitalDownloads(object $order, string $basePath, string $token): array
    {
        $query = DB::table('ecommerce_order_items as item')
            ->join('ecommerce_products as product', 'product.id', '=', 'item.product_id')
            ->where('item.order_id', $order->id)
            ->where('item.product_type', 'DIGITAL')
            ->where('product.company_id', $order->company_id)
            ->whereNotNull('product.digital_file_data')
            ->get(['item.id', 'product.digital_file_name', 'product.digital_file_size', 'product.digital_file_mime']);

        return $query->map(function (object $item) use ($basePath, $order, $token): array {
            $url = $basePath.'/orders/'.rawurlencode($order->id).'/digital-downloads/'.rawurlencode($item->id);
            if ($token !== '') {
                $url .= '?token='.rawurlencode($token);
            }

            return [
                'itemId' => $item->id,
                'fileName' => $item->digital_file_name,
                'fileSize' => (int) ($item->digital_file_size ?? 0),
                'mimeType' => $item->digital_file_mime ?? 'application/octet-stream',
                'url' => $url,
            ];
        })->values()->all();
    }
}