<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ModuleAuthorization;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;

final class EcommerceInventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'view')) {
            return $this->forbidden();
        }

        $companyId = $this->company($request);
        if ($companyId === '') {
            return response()->json(['error' => 'Entreprise requise.'], 400);
        }

        $products = $this->physicalProducts($companyId)
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'category', 'stock', 'status']);
        $movements = DB::table('ecommerce_inventory_movements')
            ->where('company_id', $companyId)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json([
            'summary' => [
                'productCount' => $products->count(),
                'totalUnits' => (int) $products->sum(fn (object $product): int => (int) $product->stock),
                'outOfStockCount' => $products->filter(fn (object $product): bool => (int) $product->stock <= 0)->count(),
            ],
            'products' => $products->map(fn (object $product): array => $this->product($product))->values(),
            'movements' => $movements->map(fn (object $movement): array => $this->movement($movement))->values(),
        ]);
    }

    public function adjust(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'create')) {
            return $this->forbidden();
        }

        $companyId = $this->company($request);
        if ($companyId === '') {
            return response()->json(['error' => 'Entreprise requise.'], 400);
        }

        $idempotencyKey = trim((string) $request->header('Idempotency-Key', ''));
        if ($idempotencyKey === '' || strlen($idempotencyKey) > 128) {
            return response()->json(['error' => 'Une clé d’idempotence valide est requise.'], 422);
        }

        $input = Validator::make($request->all(), [
            'productId' => ['required', 'string', 'max:255'],
            'direction' => ['required', 'string', 'in:IN,OUT'],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'reason' => ['required', 'string', 'min:3', 'max:300'],
        ])->validate();
        $reason = trim($input['reason']);
        if ($reason === '') {
            return response()->json(['error' => 'Le motif est obligatoire.'], 422);
        }

        try {
            [$row, $status] = DB::transaction(function () use ($request, $companyId, $idempotencyKey, $input, $reason): array {
                $existing = DB::table('ecommerce_inventory_movements')
                    ->where('company_id', $companyId)
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();
                if ($existing) {
                    if (! $this->matchesAdjustment($existing, $input, $reason)) {
                        throw new RuntimeException('IDEMPOTENCY_KEY_CONFLICT');
                    }

                    return [$existing, 200];
                }

                $product = $this->physicalProducts($companyId)
                    ->where('id', $input['productId'])
                    ->lockForUpdate()
                    ->first();
                if (! $product) {
                    throw new RuntimeException('PRODUCT_NOT_FOUND');
                }

                $quantity = (int) $input['quantity'];
                $stockBefore = (int) $product->stock;
                $stockAfter = $input['direction'] === 'IN'
                    ? $stockBefore + $quantity
                    : $stockBefore - $quantity;
                if ($stockAfter < 0) {
                    throw new RuntimeException('STOCK_INSUFFICIENT');
                }

                DB::table('ecommerce_products')
                    ->where('company_id', $companyId)
                    ->where('id', $product->id)
                    ->update(['stock' => $stockAfter, 'updated_at' => now()]);

                $actor = $request->attributes->get('authActor', []);
                $actorId = is_array($actor)
                    ? trim((string) ($actor['userId'] ?? $actor['id'] ?? ''))
                    : '';
                $row = [
                    'id' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'sku' => $product->sku ?? '',
                    'source_type' => 'MANUAL_ADJUSTMENT',
                    'source_id' => (string) Str::uuid(),
                    'direction' => $input['direction'],
                    'quantity' => $quantity,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'reason' => $reason,
                    'reference' => null,
                    'created_by' => $actorId !== '' ? $actorId : null,
                    'idempotency_key' => $idempotencyKey,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                DB::table('ecommerce_inventory_movements')->insert($row);

                return [(object) $row, 201];
            });
        } catch (RuntimeException $exception) {
            return match ($exception->getMessage()) {
                'PRODUCT_NOT_FOUND' => response()->json(['error' => 'Produit physique introuvable dans cette entreprise.'], 404),
                'STOCK_INSUFFICIENT' => response()->json(['error' => 'La sortie demandée dépasse le stock disponible.'], 422),
                'IDEMPOTENCY_KEY_CONFLICT' => response()->json(['error' => 'Cette clé d’idempotence a déjà été utilisée pour un autre ajustement.'], 409),
                default => throw $exception,
            };
        } catch (QueryException $exception) {
            $existing = DB::table('ecommerce_inventory_movements')
                ->where('company_id', $companyId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if (! $existing) {
                throw $exception;
            }
            if (! $this->matchesAdjustment($existing, $input, $reason)) {
                return response()->json(['error' => 'Cette clé d’idempotence a déjà été utilisée pour un autre ajustement.'], 409);
            }

            $row = $existing;
            $status = 200;
        }

        return response()->json(['movement' => $this->movement($row)], $status);
    }

    private function physicalProducts(string $companyId): Builder
    {
        return DB::table('ecommerce_products')
            ->where('company_id', $companyId)
            ->where(function (Builder $query): void {
                $query->whereNull('product_type')
                    ->orWhere('product_type', 'SALE');
            })
            ->where(function (Builder $query): void {
                $query->whereNull('fulfillment_type')
                    ->orWhere('fulfillment_type', 'PHYSICAL');
            });
    }

    private function allowed(Request $request, string $action): bool
    {
        $actor = $request->attributes->get('authActor');

        return is_array($actor) && ModuleAuthorization::allows($actor, 'ecommerce', $action, 'inventaire');
    }

    private function company(Request $request): string
    {
        return (string) $request->attributes->get('companyId');
    }

    private function product(object $product): array
    {
        return [
            'id' => (string) $product->id,
            'name' => (string) $product->name,
            'sku' => (string) ($product->sku ?? ''),
            'category' => (string) ($product->category ?? ''),
            'stock' => (int) $product->stock,
            'status' => (string) ($product->status ?? 'DRAFT'),
        ];
    }

    private function movement(object $movement): array
    {
        return [
            'id' => (string) $movement->id,
            'productId' => (string) $movement->product_id,
            'productName' => (string) $movement->product_name,
            'sku' => (string) ($movement->sku ?? ''),
            'direction' => (string) $movement->direction,
            'sourceType' => (string) $movement->source_type,
            'quantity' => (int) $movement->quantity,
            'stockBefore' => $movement->stock_before === null ? null : (int) $movement->stock_before,
            'stockAfter' => $movement->stock_after === null ? null : (int) $movement->stock_after,
            'reason' => $movement->reason ?? null,
            'reference' => $movement->reference ?? null,
            'createdBy' => $movement->created_by ?? null,
            'createdAt' => $movement->created_at === null ? null : (string) $movement->created_at,
        ];
    }

    private function matchesAdjustment(object $existing, array $input, string $reason): bool
    {
        return (string) $existing->product_id === (string) $input['productId']
            && (string) $existing->direction === (string) $input['direction']
            && (int) $existing->quantity === (int) $input['quantity']
            && (string) $existing->reason === $reason;
    }

    private function forbidden(): JsonResponse
    {
        return response()->json(['error' => 'Cette action n’est pas autorisée pour votre rôle.'], 403);
    }
}