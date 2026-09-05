<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;
use App\Support\MaximusDemoProvisioner;

class StockController extends Controller
{
    private const MOVEMENT_TYPES = ['ENTRÉE', 'SORTIE', 'VENTE', 'ACHAT', 'TRANSFERT', 'AJUSTEMENT+', 'AJUSTEMENT-', 'PERTE', 'RETOUR CLIENT', 'RETOUR FOURNISSEUR'];

    public function bootstrap(Request $request): JsonResponse
    {
        $companyId = (string) $request->attributes->get('companyId');
        MaximusDemoProvisioner::ensureStockSeed($companyId);
        $where = fn (string $table) => DB::table($table)->where('company_id', $companyId);

        $inventories = $where('stock_inventories')->orderByDesc('inventory_date')->get();
        $inventoryIds = $inventories->pluck('id')->all();
        $lines = $inventoryIds
            ? DB::table('stock_inventory_lines')->whereIn('inventory_id', $inventoryIds)->get()
            : collect();

        return response()->json([
            'products' => $where('stock_products')->orderBy('name')->get()->map(fn ($row) => $this->product($row))->values(),
            'warehouses' => $where('stock_warehouses')->orderBy('name')->get()->map(fn ($row) => $this->warehouse($row))->values(),
            'locations' => $where('stock_locations')->orderBy('name')->get()->map(fn ($row) => $this->location($row))->values(),
            'suppliers' => $where('stock_suppliers')->orderBy('name')->get()->map(fn ($row) => $this->supplier($row))->values(),
            'balances' => $where('stock_balances')->get()->map(fn ($row) => $this->balance($row))->values(),
            'movements' => $where('stock_movements')->orderByDesc('movement_date')->limit(250)->get()->map(fn ($row) => $this->movement($row))->values(),
            'requests' => $where('stock_requests')->orderByDesc('created_at')->get()->map(fn ($row) => $this->requestRow($row))->values(),
            'inventories' => $inventories->map(fn ($row) => $this->inventory($row))->values(),
            'inventoryLines' => $lines->map(fn ($row) => $this->inventoryLine($row))->values(),
        ]);
    }

    public function createProduct(Request $request): JsonResponse
    {
        $input = $this->productInput($request);
        $row = array_merge($this->productDefaults($this->company($request)), $this->snake($input));
        $row['id'] = $this->id('product');
        $row['created_at'] = now();
        $row['updated_at'] = now();
        DB::table('stock_products')->insert($row);
        return response()->json($this->product((object) $row), 201);
    }

    public function updateProduct(Request $request, string $id): JsonResponse
    {
        $input = $this->productInput($request, true);
        $row = DB::table('stock_products')->where('id', $id)->where('company_id', $this->company($request))->first();
        if (!$row) return $this->notFound('Produit introuvable');
        $changes = $this->snake($input);
        $changes['updated_at'] = now();
        DB::table('stock_products')->where('id', $id)->update($changes);
        return response()->json($this->product(DB::table('stock_products')->where('id', $id)->first()));
    }

    public function archiveProduct(Request $request, string $id): JsonResponse
    {
        return $this->archive('stock_products', $id, $this->company($request), 'Produit introuvable');
    }

    public function createSupplier(Request $request): JsonResponse
    {
        $input = $this->supplierInput($request);
        $row = array_merge($this->supplierDefaults($this->company($request)), $this->snake($input), ['id' => $this->id('supplier'), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('stock_suppliers')->insert($row);
        return response()->json($this->supplier((object) $row), 201);
    }

    public function updateSupplier(Request $request, string $id): JsonResponse
    {
        $input = $this->supplierInput($request, true);
        $row = DB::table('stock_suppliers')->where('id', $id)->where('company_id', $this->company($request))->first();
        if (!$row) return $this->notFound('Fournisseur introuvable');
        DB::table('stock_suppliers')->where('id', $id)->update(array_merge($this->snake($input), ['updated_at' => now()]));
        return response()->json($this->supplier(DB::table('stock_suppliers')->where('id', $id)->first()));
    }

    public function archiveSupplier(Request $request, string $id): JsonResponse
    {
        return $this->archive('stock_suppliers', $id, $this->company($request), 'Fournisseur introuvable');
    }

    public function createWarehouse(Request $request): JsonResponse
    {
        $input = $this->warehouseInput($request);
        $row = array_merge($this->warehouseDefaults($this->company($request)), $this->snake($input), ['id' => $this->id('warehouse'), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('stock_warehouses')->insert($row);
        return response()->json($this->warehouse((object) $row), 201);
    }

    public function updateWarehouse(Request $request, string $id): JsonResponse
    {
        $input = $this->warehouseInput($request, true);
        $row = DB::table('stock_warehouses')->where('id', $id)->where('company_id', $this->company($request))->first();
        if (!$row) return $this->notFound('Entrepôt introuvable');
        DB::table('stock_warehouses')->where('id', $id)->update(array_merge($this->snake($input), ['updated_at' => now()]));
        return response()->json($this->warehouse(DB::table('stock_warehouses')->where('id', $id)->first()));
    }

    public function archiveWarehouse(Request $request, string $id): JsonResponse
    {
        return $this->archive('stock_warehouses', $id, $this->company($request), 'Entrepôt introuvable');
    }

    public function createLocation(Request $request, string $warehouseId): JsonResponse
    {
        $input = $this->validated($request, ['name' => ['required', 'string', 'min:1']]);
        $company = $this->company($request);
        if (!DB::table('stock_warehouses')->where('id', $warehouseId)->where('company_id', $company)->exists()) {
            return $this->notFound('Entrepôt introuvable');
        }
        $row = ['id' => $this->id('location'), 'company_id' => $company, 'warehouse_id' => $warehouseId, 'name' => $input['name'], 'archived' => false, 'created_at' => now()];
        DB::table('stock_locations')->insert($row);
        return response()->json($this->location((object) $row), 201);
    }

    public function updateLocation(Request $request, string $id): JsonResponse
    {
        $input = $this->validated($request, ['name' => ['required', 'string', 'min:1']]);
        $query = DB::table('stock_locations')->where('id', $id)->where('company_id', $this->company($request));
        if (!$query->exists()) return $this->notFound('Emplacement introuvable');
        $query->update(['name' => $input['name']]);
        return response()->json($this->location(DB::table('stock_locations')->where('id', $id)->first()));
    }

    public function archiveLocation(Request $request, string $id): JsonResponse
    {
        $query = DB::table('stock_locations')->where('id', $id)->where('company_id', $this->company($request));
        if (!$query->exists()) return $this->notFound('Emplacement introuvable');
        $query->update(['archived' => true]);
        return response()->json($this->location(DB::table('stock_locations')->where('id', $id)->first()));
    }

    public function createMovement(Request $request): JsonResponse
    {
        $input = $this->validated($request, [
            'productId' => ['required', 'string'],
            'supplierId' => ['nullable', 'string'],
            'warehouseId' => ['required', 'string'],
            'destinationWarehouseId' => ['nullable', 'string'],
            'locationId' => ['nullable', 'string'],
            'requesterService' => ['nullable', 'string'],
            'beneficiary' => ['nullable', 'string'],
            'type' => ['required', 'in:'.implode(',', self::MOVEMENT_TYPES)],
            'quantity' => ['required', 'integer', 'min:1'],
            'purchasePrice' => ['nullable', 'integer', 'min:0'],
            'reason' => ['nullable', 'string'],
            'movementDate' => ['nullable', 'date'],
            'userName' => ['nullable', 'string'],
            'reference' => ['nullable', 'string'],
            'comment' => ['nullable', 'string'],
        ]);
        $input['companyId'] = $this->company($request);
        $actorName = $this->actorName($request);
        try {
            $row = DB::transaction(function () use ($input, $actorName): array {
                $product = DB::table('stock_products')->where('id', $input['productId'])->where('company_id', $input['companyId'])->first();
                if (!$product || $product->archived) throw new \RuntimeException('PRODUCT_NOT_FOUND');
                if (!DB::table('stock_warehouses')->where('id', $input['warehouseId'])->where('company_id', $input['companyId'])->exists()) throw new \RuntimeException('WAREHOUSE_NOT_FOUND');
                if (!empty($input['destinationWarehouseId']) && !DB::table('stock_warehouses')->where('id', $input['destinationWarehouseId'])->where('company_id', $input['companyId'])->exists()) throw new \RuntimeException('WAREHOUSE_NOT_FOUND');

                $out = in_array($input['type'], ['SORTIE', 'VENTE', 'AJUSTEMENT-', 'PERTE', 'RETOUR FOURNISSEUR'], true);
                $transfer = $input['type'] === 'TRANSFERT';
                if ($transfer && empty($input['destinationWarehouseId'])) throw new \RuntimeException('DESTINATION_REQUIRED');
                if ($out || $transfer) $this->updateBalance($input['companyId'], $input['productId'], $input['warehouseId'], $input['locationId'] ?? null, -$input['quantity']);
                if (!$out || ($transfer && !empty($input['destinationWarehouseId']))) {
                    $target = $transfer ? $input['destinationWarehouseId'] : $input['warehouseId'];
                    $this->updateBalance($input['companyId'], $input['productId'], $target, $input['locationId'] ?? null, $input['quantity']);
                }

                $row = array_merge([
                    'id' => $this->id('movement'),
                    'company_id' => $input['companyId'],
                    'product_id' => $input['productId'],
                    'supplier_id' => null,
                    'warehouse_id' => $input['warehouseId'],
                    'destination_warehouse_id' => null,
                    'location_id' => null,
                    'requester_service' => null,
                    'beneficiary' => null,
                    'type' => $input['type'],
                    'quantity' => $input['quantity'],
                    'purchase_price' => 0,
                    'reason' => '',
                    'movement_date' => now(),
                    'user_name' => $actorName,
                    'reference' => '',
                    'comment' => '',
                    'status' => 'VALIDÉ',
                    'created_at' => now(),
                ], $this->snake($input));
                DB::table('stock_movements')->insert($row);
                DB::table('stock_audit_logs')->insert([
                    'id' => $this->id('audit'),
                    'company_id' => $input['companyId'],
                    'action' => 'VALIDATION_MOUVEMENT',
                    'entity_type' => 'movement',
                    'entity_id' => $row['id'],
                    'user_name' => $actorName,
                    'detail' => $input['type'].' de '.$input['quantity'].' unité(s)',
                    'created_at' => now(),
                ]);
                return $row;
            });
            return response()->json($this->movement((object) $row), 201);
        } catch (Throwable $error) {
            $message = $error->getMessage();
            return response()->json(['error' => $message === 'STOCK_INSUFFICIENT' ? 'Stock insuffisant : le stock négatif est interdit.' : $message], $message === 'STOCK_INSUFFICIENT' ? 409 : 400);
        }
    }

    public function createRequest(Request $request): JsonResponse
    {
        $input = $this->validated($request, ['productId' => ['required', 'string'], 'warehouseId' => ['required', 'string'], 'quantity' => ['required', 'integer', 'min:1'], 'reason' => ['required', 'string', 'min:1']]);
        $row = array_merge(['id' => $this->id('stock-request'), 'company_id' => $this->company($request), 'status' => 'EN ATTENTE', 'created_by' => $this->actorName($request), 'created_at' => now(), 'updated_at' => now()], $this->snake($input));
        DB::table('stock_requests')->insert($row);
        return response()->json($this->requestRow((object) $row), 201);
    }

    public function updateRequestStatus(Request $request, string $id): JsonResponse
    {
        $input = $this->validated($request, ['status' => ['required', 'in:EN ATTENTE,APPROUVÉE,REJETÉE']]);
        $query = DB::table('stock_requests')->where('id', $id)->where('company_id', $this->company($request));
        if (!$query->exists()) return $this->notFound('Demande introuvable');
        $query->update(['status' => $input['status'], 'updated_at' => now()]);
        return response()->json($this->requestRow(DB::table('stock_requests')->where('id', $id)->first()));
    }

    public function updateRequest(Request $request, string $id): JsonResponse
    {
        $input = $this->validated($request, ['productId' => ['required', 'string'], 'warehouseId' => ['required', 'string'], 'quantity' => ['required', 'integer', 'min:1'], 'reason' => ['required', 'string', 'min:1']]);
        $query = DB::table('stock_requests')->where('id', $id)->where('company_id', $this->company($request))->where('status', 'EN ATTENTE');
        if (!$query->exists()) return $this->notFound('Demande introuvable ou déjà traitée');
        $query->update(array_merge($this->snake($input), ['updated_at' => now()]));
        return response()->json($this->requestRow(DB::table('stock_requests')->where('id', $id)->first()));
    }

    public function deleteRequest(Request $request, string $id): JsonResponse
    {
        $row = DB::table('stock_requests')->where('id', $id)->where('company_id', $this->company($request))->where('status', 'EN ATTENTE')->first();
        if (!$row) return $this->notFound('Demande introuvable ou déjà traitée');
        DB::table('stock_requests')->where('id', $id)->delete();
        return response()->json($this->requestRow($row));
    }

    public function createInventory(Request $request): JsonResponse
    {
        $input = $this->validated($request, ['warehouseId' => ['required', 'string'], 'notes' => ['nullable', 'string'], 'lines' => ['required', 'array', 'min:1'], 'lines.*.productId' => ['required', 'string', 'min:1'], 'lines.*.actualQuantity' => ['required', 'integer', 'min:0']]);
        $company = $this->company($request);
        $actorName = $this->actorName($request);
        try {
            $row = DB::transaction(function () use ($input, $company, $actorName): array {
                if (!DB::table('stock_warehouses')->where('id', $input['warehouseId'])->where('company_id', $company)->exists()) throw new \RuntimeException('WAREHOUSE_NOT_FOUND');
                $inventory = ['id' => $this->id('inventory'), 'company_id' => $company, 'warehouse_id' => $input['warehouseId'], 'status' => 'BROUILLON', 'inventory_date' => now(), 'notes' => $input['notes'] ?? '', 'created_by' => $actorName, 'validated_at' => null, 'created_at' => now()];
                DB::table('stock_inventories')->insert($inventory);
                foreach ($input['lines'] as $line) {
                    if (!DB::table('stock_products')->where('id', $line['productId'])->where('company_id', $company)->exists()) continue;
                    $theoretical = (int) DB::table('stock_balances')->where('company_id', $company)->where('product_id', $line['productId'])->where('warehouse_id', $input['warehouseId'])->sum('quantity');
                    DB::table('stock_inventory_lines')->insert(['id' => $this->id('inventory-line'), 'inventory_id' => $inventory['id'], 'product_id' => $line['productId'], 'theoretical_quantity' => $theoretical, 'actual_quantity' => $line['actualQuantity'], 'difference' => $line['actualQuantity'] - $theoretical]);
                }
                return $inventory;
            });
            return response()->json($this->inventory((object) $row), 201);
        } catch (Throwable $error) {
            return response()->json(['error' => $error->getMessage()], 400);
        }
    }

    public function validateInventory(Request $request, string $id): JsonResponse
    {
        try {
            $inventory = DB::transaction(function () use ($request, $id): object {
                $current = DB::table('stock_inventories')->where('id', $id)->first();
                if (!$current || $current->company_id !== $this->company($request)) throw new \RuntimeException('INVENTORY_NOT_FOUND');
                if ($current->status === 'VALIDÉ') return $current;
                $lines = DB::table('stock_inventory_lines')->where('inventory_id', $id)->get();
                foreach ($lines as $line) {
                    $balances = DB::table('stock_balances')->where('company_id', $current->company_id)->where('product_id', $line->product_id)->where('warehouse_id', $current->warehouse_id)->get();
                    $theoretical = (int) $balances->sum('quantity');
                    $difference = $line->actual_quantity - $theoretical;
                    DB::table('stock_inventory_lines')->where('id', $line->id)->update(['theoretical_quantity' => $theoretical, 'difference' => $difference]);
                    if ($difference !== 0) {
                        $this->updateBalance($current->company_id, $line->product_id, $current->warehouse_id, $balances->first()?->location_id, $difference);
                        DB::table('stock_movements')->insert(['id' => $this->id('movement'), 'company_id' => $current->company_id, 'product_id' => $line->product_id, 'warehouse_id' => $current->warehouse_id, 'destination_warehouse_id' => null, 'location_id' => $balances->first()?->location_id, 'type' => $difference > 0 ? 'AJUSTEMENT+' : 'AJUSTEMENT-', 'quantity' => abs($difference), 'purchase_price' => 0, 'reason' => 'Écart d’inventaire', 'movement_date' => now(), 'user_name' => $current->created_by, 'reference' => $current->id, 'comment' => $current->notes, 'status' => 'VALIDÉ', 'created_at' => now()]);
                    }
                }
                DB::table('stock_inventories')->where('id', $id)->update(['status' => 'VALIDÉ', 'validated_at' => now()]);
                DB::table('stock_audit_logs')->insert(['id' => $this->id('audit'), 'company_id' => $current->company_id, 'action' => 'VALIDATION_INVENTAIRE', 'entity_type' => 'inventory', 'entity_id' => $id, 'user_name' => $current->created_by, 'detail' => $lines->count().' référence(s) comptée(s)', 'created_at' => now()]);
                return DB::table('stock_inventories')->where('id', $id)->first();
            });
            return response()->json($this->inventory($inventory));
        } catch (Throwable $error) {
            $message = $error->getMessage();
            return response()->json(['error' => $message], $message === 'INVENTORY_NOT_FOUND' ? 404 : 400);
        }
    }

    private function updateBalance(string $company, string $product, string $warehouse, ?string $location, int $delta): void
    {
        $query = DB::table('stock_balances')->where('company_id', $company)->where('product_id', $product)->where('warehouse_id', $warehouse);
        $location === null ? $query->whereNull('location_id') : $query->where('location_id', $location);
        $balance = $query->lockForUpdate()->first();
        if (!$balance) {
            if ($delta < 0) throw new \RuntimeException('STOCK_INSUFFICIENT');
            DB::table('stock_balances')->insert(['id' => $this->id('balance'), 'company_id' => $company, 'product_id' => $product, 'warehouse_id' => $warehouse, 'location_id' => $location, 'quantity' => $delta, 'updated_at' => now()]);
            return;
        }
        $quantity = $balance->quantity + $delta;
        if ($quantity < 0) throw new \RuntimeException('STOCK_INSUFFICIENT');
        DB::table('stock_balances')->where('id', $balance->id)->update(['quantity' => $quantity, 'updated_at' => now()]);
    }

    private function productInput(Request $request, bool $partial = false): array
    {
        $required = $partial ? ['sometimes'] : ['required'];
        return $this->validated($request, [
            'name' => array_merge($required, ['string', 'min:1']), 'category' => ['nullable', 'string'], 'subcategory' => ['nullable', 'string'], 'brand' => ['nullable', 'string'], 'sku' => array_merge($required, ['string', 'min:1']), 'barcode' => ['nullable', 'string'], 'imageUrl' => ['nullable', 'string'], 'unit' => ['nullable', 'string'], 'purchasePrice' => ['nullable', 'integer', 'min:0'], 'salePrice' => ['nullable', 'integer', 'min:0'], 'minStock' => ['nullable', 'integer', 'min:0'], 'maxStock' => ['nullable', 'integer', 'min:0'], 'supplierId' => ['nullable', 'string'], 'description' => ['nullable', 'string'],
        ]);
    }

    private function supplierInput(Request $request, bool $partial = false): array
    {
        $required = $partial ? ['sometimes'] : ['required'];
        return $this->validated($request, ['name' => array_merge($required, ['string', 'min:1']), 'contactName' => ['nullable', 'string'], 'email' => ['nullable', 'string'], 'phone' => ['nullable', 'string'], 'address' => ['nullable', 'string'], 'notes' => ['nullable', 'string']]);
    }

    private function warehouseInput(Request $request, bool $partial = false): array
    {
        $required = $partial ? ['sometimes'] : ['required'];
        return $this->validated($request, ['name' => array_merge($required, ['string', 'min:1']), 'manager' => ['nullable', 'string'], 'address' => ['nullable', 'string']]);
    }

    private function validated(Request $request, array $rules): array
    {
        return Validator::make($request->all(), $rules)->validate();
    }

    private function company(Request $request): string
    {
        return (string) $request->attributes->get('companyId');
    }

    private function snake(array $input): array
    {
        $result = [];
        foreach ($input as $key => $value) {
            if ($key === 'companyId') $result['company_id'] = $value;
            elseif ($key === 'createdBy') $result['created_by'] = $value;
            elseif (preg_match('/[A-Z]/', $key)) $result[strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $key))] = $value;
            else $result[$key] = $value;
        }
        return $result;
    }

    private function id(string $prefix): string
    {
        return $prefix.'-'.Str::uuid();
    }

    private function archive(string $table, string $id, string $company, string $message): JsonResponse
    {
        $query = DB::table($table)->where('id', $id)->where('company_id', $company);
        if (!$query->exists()) return $this->notFound($message);
        $query->update(['archived' => true, 'updated_at' => now()]);
        $row = DB::table($table)->where('id', $id)->first();
        return response()->json($table === 'stock_products' ? $this->product($row) : ($table === 'stock_suppliers' ? $this->supplier($row) : $this->warehouse($row)));
    }

    private function notFound(string $message): JsonResponse
    {
        return response()->json(['error' => $message], 404);
    }

    private function productDefaults(string $company): array { return ['company_id' => $company, 'category' => 'Divers', 'subcategory' => '', 'brand' => '', 'barcode' => '', 'image_url' => '', 'unit' => 'unité', 'purchase_price' => 0, 'sale_price' => 0, 'min_stock' => 0, 'max_stock' => 0, 'supplier_id' => null, 'description' => '', 'archived' => false]; }
    private function supplierDefaults(string $company): array { return ['company_id' => $company, 'contact_name' => '', 'email' => '', 'phone' => '', 'address' => '', 'notes' => '', 'archived' => false]; }
    private function warehouseDefaults(string $company): array { return ['company_id' => $company, 'manager' => '', 'address' => '', 'archived' => false]; }

    private function actorName(Request $request): string
    {
        $actor = $request->attributes->get('authActor');
        return is_array($actor) && is_string($actor['displayName'] ?? null) && $actor['displayName'] !== ''
            ? $actor['displayName']
            : 'Utilisateur MAXIMUS';
    }

    private function product(object $r): array { return ['id' => $r->id, 'companyId' => $r->company_id, 'name' => $r->name, 'category' => $r->category, 'subcategory' => $r->subcategory, 'brand' => $r->brand, 'sku' => $r->sku, 'barcode' => $r->barcode, 'imageUrl' => $r->image_url, 'unit' => $r->unit, 'purchasePrice' => $r->purchase_price, 'salePrice' => $r->sale_price, 'minStock' => $r->min_stock, 'maxStock' => $r->max_stock, 'supplierId' => $r->supplier_id, 'description' => $r->description, 'archived' => (bool) $r->archived, 'createdAt' => $this->date($r->created_at), 'updatedAt' => $this->date($r->updated_at)]; }
    private function supplier(object $r): array { return ['id' => $r->id, 'companyId' => $r->company_id, 'name' => $r->name, 'contactName' => $r->contact_name, 'email' => $r->email, 'phone' => $r->phone, 'address' => $r->address, 'notes' => $r->notes, 'archived' => (bool) $r->archived, 'createdAt' => $this->date($r->created_at), 'updatedAt' => $this->date($r->updated_at)]; }
    private function warehouse(object $r): array { return ['id' => $r->id, 'companyId' => $r->company_id, 'name' => $r->name, 'manager' => $r->manager, 'address' => $r->address, 'archived' => (bool) $r->archived, 'createdAt' => $this->date($r->created_at), 'updatedAt' => $this->date($r->updated_at)]; }
    private function location(object $r): array { return ['id' => $r->id, 'companyId' => $r->company_id, 'warehouseId' => $r->warehouse_id, 'name' => $r->name, 'archived' => (bool) $r->archived, 'createdAt' => $this->date($r->created_at)]; }
    private function balance(object $r): array { return ['id' => $r->id, 'companyId' => $r->company_id, 'productId' => $r->product_id, 'supplierId' => $r->supplier_id, 'warehouseId' => $r->warehouse_id, 'locationId' => $r->location_id, 'quantity' => $r->quantity, 'updatedAt' => $this->date($r->updated_at)]; }
    private function movement(object $r): array { return ['id' => $r->id, 'companyId' => $r->company_id, 'productId' => $r->product_id, 'supplierId' => $r->supplier_id, 'warehouseId' => $r->warehouse_id, 'destinationWarehouseId' => $r->destination_warehouse_id, 'locationId' => $r->location_id, 'requesterService' => $r->requester_service, 'beneficiary' => $r->beneficiary, 'type' => $r->type, 'quantity' => $r->quantity, 'purchasePrice' => $r->purchase_price, 'reason' => $r->reason, 'movementDate' => $this->date($r->movement_date), 'userName' => $r->user_name, 'reference' => $r->reference, 'comment' => $r->comment, 'status' => $r->status, 'createdAt' => $this->date($r->created_at)]; }
    private function requestRow(object $r): array { return ['id' => $r->id, 'companyId' => $r->company_id, 'productId' => $r->product_id, 'warehouseId' => $r->warehouse_id, 'quantity' => $r->quantity, 'reason' => $r->reason, 'status' => $r->status, 'createdBy' => $r->created_by, 'createdAt' => $this->date($r->created_at), 'updatedAt' => $this->date($r->updated_at)]; }
    private function inventory(object $r): array { return ['id' => $r->id, 'companyId' => $r->company_id, 'warehouseId' => $r->warehouse_id, 'status' => $r->status, 'inventoryDate' => $this->date($r->inventory_date), 'notes' => $r->notes, 'createdBy' => $r->created_by, 'validatedAt' => $this->date($r->validated_at), 'createdAt' => $this->date($r->created_at)]; }
    private function inventoryLine(object $r): array { return ['id' => $r->id, 'inventoryId' => $r->inventory_id, 'productId' => $r->product_id, 'theoreticalQuantity' => $r->theoretical_quantity, 'actualQuantity' => $r->actual_quantity, 'difference' => $r->difference]; }
    private function date(mixed $value): ?string { return $value ? (string) $value : null; }
}