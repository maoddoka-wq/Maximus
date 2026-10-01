<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ModuleAuthorization;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;

final class EcommercePosController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if ($denied = $this->authorizePos($request, 'view')) {
            return $denied;
        }

        $companyId = (string) $request->attributes->get('companyId');
        if ($companyId === '') {
            return response()->json(['error' => 'Entreprise requise.'], 400);
        }

        $currency = (string) (DB::table('ecommerce_stores')
            ->where('company_id', $companyId)
            ->value('currency') ?? 'XOF');
        $today = now()->startOfDay();
        $todaySales = DB::table('ecommerce_pos_sales')
            ->where('company_id', $companyId)
            ->where('status', 'PAID')
            ->where('created_at', '>=', $today);

        $summary = [
            'currency' => $currency,
            'todaySalesCount' => (clone $todaySales)->count(),
            'todayRevenue' => (int) (clone $todaySales)->sum('total'),
            'todayCashReceived' => (int) (clone $todaySales)->sum('amount_received'),
            'todayChangeGiven' => (int) (clone $todaySales)->sum('change_due'),
        ];

        $sales = DB::table('ecommerce_pos_sales')
            ->where('company_id', $companyId)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'sales' => $this->salesWithItems($companyId, $sales->all()),
            'summary' => $summary,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($denied = $this->authorizePos($request, 'create')) {
            return $denied;
        }

        $companyId = (string) $request->attributes->get('companyId');
        if ($companyId === '') {
            return response()->json(['error' => 'Entreprise requise.'], 400);
        }

        $idempotencyKey = trim((string) $request->header('Idempotency-Key', ''));
        if ($idempotencyKey === '' || strlen($idempotencyKey) > 128) {
            return response()->json(['error' => 'Une clé d’idempotence valide est requise.'], 422);
        }

        $input = Validator::make($request->all(), [
            'lines' => ['required', 'array', 'min:1', 'max:100'],
            'lines.*.productId' => ['required', 'string', 'max:255'],
            'lines.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
            'amountReceived' => ['required', 'integer', 'min:0'],
            'customerName' => ['nullable', 'string', 'max:180'],
        ])->validate();

        $quantities = [];
        foreach ($input['lines'] as $line) {
            $productId = (string) $line['productId'];
            $quantities[$productId] = ($quantities[$productId] ?? 0) + (int) $line['quantity'];
            if ($quantities[$productId] > 9999) {
                return response()->json(['error' => 'La quantité demandée est trop élevée.'], 422);
            }
        }
        ksort($quantities);

        try {
            $sale = DB::transaction(function () use ($request, $companyId, $idempotencyKey, $input, $quantities): array {
                $existing = DB::table('ecommerce_pos_sales')
                    ->where('company_id', $companyId)
                    ->where('idempotency_key', $idempotencyKey)
                    ->lockForUpdate()
                    ->first();
                if ($existing) {
                    return $this->saleWithItems($companyId, $existing);
                }

                $actor = $request->attributes->get('authActor', []);
                if (! is_array($actor) || ! ModuleAuthorization::allows($actor, 'ecommerce', 'create', 'vente-physique')) {
                    throw new RuntimeException('PHYSICAL_SALES_NOT_AUTHORIZED');
                }

                $lines = [];
                $subtotal = 0;
                foreach ($quantities as $productId => $quantity) {
                    $product = DB::table('ecommerce_products')
                        ->where('company_id', $companyId)
                        ->where('id', $productId)
                        ->where('status', 'PUBLISHED')
                        ->where(function ($query): void {
                            $query->whereNull('product_type')->orWhere('product_type', 'SALE');
                        })
                        ->where(function ($query): void {
                            $query->whereNull('fulfillment_type')->orWhere('fulfillment_type', 'PHYSICAL');
                        })
                        ->lockForUpdate()
                        ->first();

                    if (! $product) {
                        throw new RuntimeException('PRODUCT_NOT_AVAILABLE');
                    }
                    if ((int) $product->stock < $quantity) {
                        throw new RuntimeException('INSUFFICIENT_STOCK');
                    }

                    $unitPrice = (int) $product->price;
                    $lineTotal = $unitPrice * $quantity;
                    $subtotal += $lineTotal;
                    $lines[] = [
                        'id' => (string) Str::uuid(),
                        'company_id' => $companyId,
                        'product_id' => (string) $product->id,
                        'product_name' => (string) $product->name,
                        'sku' => (string) ($product->sku ?? ''),
                        'unit_price' => $unitPrice,
                        'quantity' => $quantity,
                        'line_total' => $lineTotal,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    DB::table('ecommerce_products')
                        ->where('company_id', $companyId)
                        ->where('id', $productId)
                        ->update([
                            'stock' => (int) $product->stock - $quantity,
                            'updated_at' => now(),
                        ]);
                }

                $amountReceived = (int) $input['amountReceived'];
                if ($amountReceived < $subtotal) {
                    throw new RuntimeException('CASH_AMOUNT_TOO_LOW');
                }

                $saleId = (string) Str::uuid();
                $currency = (string) (DB::table('ecommerce_stores')
                    ->where('company_id', $companyId)
                    ->value('currency') ?? 'XOF');
                $saleRow = [
                    'id' => $saleId,
                    'company_id' => $companyId,
                    'reference' => 'POS-'.now()->format('ymd').'-'.strtoupper(Str::substr(str_replace('-', '', $saleId), 0, 8)),
                    'cashier_id' => isset($actor['userId']) ? (string) $actor['userId'] : null,
                    'idempotency_key' => $idempotencyKey,
                    'customer_name' => trim((string) ($input['customerName'] ?? '')) ?: 'Client comptoir',
                    'currency' => $currency,
                    'subtotal' => $subtotal,
                    'total' => $subtotal,
                    'amount_received' => $amountReceived,
                    'change_due' => $amountReceived - $subtotal,
                    'status' => 'PAID',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                DB::table('ecommerce_pos_sales')->insert($saleRow);
                foreach ($lines as &$line) {
                    $line['sale_id'] = $saleId;
                }
                unset($line);
                DB::table('ecommerce_pos_sale_items')->insert($lines);

                return $this->saleWithItems($companyId, (object) $saleRow);
            });
        } catch (RuntimeException $exception) {
            return match ($exception->getMessage()) {
                'PRODUCT_NOT_AVAILABLE' => response()->json(['error' => 'Un produit n’est plus disponible à la vente.'], 409),
                'INSUFFICIENT_STOCK' => response()->json(['error' => 'Le stock a changé. Réduisez la quantité puis réessayez.'], 409),
                'CASH_AMOUNT_TOO_LOW' => response()->json(['error' => 'Le montant reçu ne couvre pas le total de la vente.'], 422),
                'PHYSICAL_SALES_NOT_AUTHORIZED' => response()->json(['error' => 'La vente de produits physiques n’est pas autorisée pour cette entreprise.'], 403),
                default => throw $exception,
            };
        } catch (QueryException $exception) {
            $existing = DB::table('ecommerce_pos_sales')
                ->where('company_id', $companyId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if (! $existing) {
                throw $exception;
            }
            $sale = $this->saleWithItems($companyId, $existing);
        }

        return response()->json(['sale' => $sale], 201);
    }

    private function authorizePos(Request $request, string $action): ?JsonResponse
    {
        $actor = $request->attributes->get('authActor', []);
        if (! is_array($actor) || ! ModuleAuthorization::allows($actor, 'ecommerce', $action, 'vente-comptoir')) {
            return response()->json(['error' => 'La fonctionnalité Vente comptoir n’est pas autorisée pour ce compte.'], 403);
        }

        return null;
    }

    /**
     * @param  array<int, object>  $sales
     * @return array<int, array<string, mixed>>
     */
    private function salesWithItems(string $companyId, array $sales): array
    {
        if ($sales === []) {
            return [];
        }

        $items = DB::table('ecommerce_pos_sale_items')
            ->where('company_id', $companyId)
            ->whereIn('sale_id', array_map(static fn (object $sale): string => (string) $sale->id, $sales))
            ->orderBy('created_at')
            ->get()
            ->groupBy('sale_id');

        return array_map(
            fn (object $sale): array => $this->formatSale($sale, $items->get($sale->id, collect())->all()),
            $sales,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function saleWithItems(string $companyId, object $sale): array
    {
        $items = DB::table('ecommerce_pos_sale_items')
            ->where('company_id', $companyId)
            ->where('sale_id', $sale->id)
            ->orderBy('created_at')
            ->get()
            ->all();

        return $this->formatSale($sale, $items);
    }

    /**
     * @param  array<int, object>  $items
     * @return array<string, mixed>
     */
    private function formatSale(object $sale, array $items): array
    {
        return [
            'id' => (string) $sale->id,
            'reference' => (string) $sale->reference,
            'customerName' => (string) $sale->customer_name,
            'currency' => (string) $sale->currency,
            'subtotal' => (int) $sale->subtotal,
            'total' => (int) $sale->total,
            'amountReceived' => (int) $sale->amount_received,
            'changeDue' => (int) $sale->change_due,
            'status' => (string) $sale->status,
            'createdAt' => (string) $sale->created_at,
            'items' => array_map(static fn (object $item): array => [
                'id' => (string) $item->id,
                'productId' => (string) $item->product_id,
                'productName' => (string) $item->product_name,
                'sku' => (string) $item->sku,
                'unitPrice' => (int) $item->unit_price,
                'quantity' => (int) $item->quantity,
                'lineTotal' => (int) $item->line_total,
            ], $items),
        ];
    }
}
