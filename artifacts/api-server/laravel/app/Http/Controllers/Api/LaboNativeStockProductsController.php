<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ModuleAuthorization;
use App\Support\ModuleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class LaboNativeStockProductsController extends Controller
{
    public function bootstrap(Request $request, string $targetModuleId, string $targetFeatureId): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'view');
        $where = $this->query('labo_stock_products', $company, $scope);
        $referenceScope = $this->referenceScope($targetModuleId);
        $suppliers = $referenceScope === null
            ? collect()
            : $this->query('labo_stock_suppliers', $company, $referenceScope)
                ->orderBy('name')->get()->map(fn ($row) => $this->supplier($row))->values();

        return response()->json([
            'moduleId' => $targetModuleId,
            'featureId' => $targetFeatureId,
            'products' => $where->orderBy('name')->get()->map(fn ($row) => $this->product($row))->values(),
            'warehouses' => [],
            'locations' => [],
            'suppliers' => $suppliers,
            'balances' => [],
            'movements' => [],
            'requests' => [],
            'inventories' => [],
            'inventoryLines' => [],
        ]);
    }

    public function createProduct(Request $request, string $targetModuleId, string $targetFeatureId): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'create');
        $input = $this->productInput($request);
        $referenceScope = $this->referenceScope($targetModuleId);
        if (! empty($input['supplierId']) && ($referenceScope === null || ! $this->targetSupplierExists($company, $referenceScope, $input['supplierId']))) {
            return response()->json(['error' => 'Fournisseur introuvable'], 404);
        }
        $row = array_merge($this->defaults($company, $scope), $this->snake($input), [
            'id' => $this->id('labo-product'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('labo_stock_products')->insert($row);

        return response()->json($this->product((object) $row), 201);
    }

    public function updateProduct(Request $request, string $targetModuleId, string $targetFeatureId, string $id): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'modify');
        $input = $this->productInput($request, true);
        $query = $this->query('labo_stock_products', $company, $scope)->where('id', $id);
        if (! $query->exists()) return response()->json(['error' => 'Produit introuvable'], 404);
        $referenceScope = $this->referenceScope($targetModuleId);
        if (array_key_exists('supplierId', $input) && ! empty($input['supplierId'])
            && ($referenceScope === null || ! $this->targetSupplierExists($company, $referenceScope, $input['supplierId']))) {
            return response()->json(['error' => 'Fournisseur introuvable'], 404);
        }
        $query->update(array_merge($this->snake($input), ['updated_at' => now()]));

        return response()->json($this->product($query->first()));
    }

    public function archiveProduct(Request $request, string $targetModuleId, string $targetFeatureId, string $id): JsonResponse
    {
        // Archiving is the UI's "modifier" operation; there is no separate
        // delete permission for a mounted product feature.
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'modify');
        $query = $this->query('labo_stock_products', $company, $scope)->where('id', $id);
        if (! $query->exists()) return response()->json(['error' => 'Produit introuvable'], 404);
        $query->update(['archived' => true, 'updated_at' => now()]);

        return response()->json($this->product($query->first()));
    }

    private function context(Request $request, string $module, string $feature, string $action): array
    {
        $actor = $request->attributes->get('authActor');
        $company = (string) $request->attributes->get('companyId');
        $definition = collect(ModuleCatalog::definitionsWithCustom())->firstWhere('id', $module);
        $mounted = is_array($definition) ? collect($definition['laboFeatures'] ?? [])->firstWhere('id', $feature) : null;
        $valid = is_array($mounted)
            && ($mounted['kind'] ?? null) === 'reuse'
            && ($mounted['sourceModuleId'] ?? null) === 'stocks'
            && ($mounted['sourceFeatureId'] ?? null) === 'products';
        if ($company === '' || ! $valid || ! ModuleCatalog::isPublishedModule($module)
            || ! is_array($actor) || ! ModuleAuthorization::allows($actor, $module, $action, $feature)) {
            abort(403, 'Fonctionnalité LABO native non autorisée.');
        }
        return [$company, [$module, $feature]];
    }

    private function referenceScope(string $module): ?array
    {
        $definition = collect(ModuleCatalog::definitionsWithCustom())->firstWhere('id', $module);
        if (! is_array($definition)) return null;
        $reference = collect($definition['laboFeatures'] ?? [])->first(
            fn ($feature) => is_array($feature)
                && ($feature['kind'] ?? null) === 'reuse'
                && ($feature['sourceModuleId'] ?? null) === 'stocks'
                && ($feature['sourceFeatureId'] ?? null) === 'references',
        );
        return is_array($reference) && is_string($reference['id'] ?? null)
            ? [$module, $reference['id']]
            : null;
    }

    private function query(string $table, string $company, array $scope)
    {
        return DB::table($table)->where('company_id', $company)
            ->where('target_module_id', $scope[0])->where('target_feature_id', $scope[1]);
    }

    private function productInput(Request $request, bool $partial = false): array
    {
        $required = $partial ? ['sometimes'] : ['required'];
        return Validator::make($request->all(), [
            'name' => array_merge($required, ['string', 'min:1']),
            'category' => ['nullable', 'string'], 'subcategory' => ['nullable', 'string'],
            'brand' => ['nullable', 'string'], 'sku' => array_merge($required, ['string', 'min:1']),
            'barcode' => ['nullable', 'string'], 'imageUrl' => ['nullable', 'string'],
            'unit' => ['nullable', 'string'], 'purchasePrice' => ['nullable', 'integer', 'min:0'],
            'salePrice' => ['nullable', 'integer', 'min:0'], 'minStock' => ['nullable', 'integer', 'min:0'],
            'maxStock' => ['nullable', 'integer', 'min:0'], 'supplierId' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
        ])->validate();
    }

    private function targetSupplierExists(string $company, array $scope, string $id): bool
    {
        return $this->query('labo_stock_suppliers', $company, $scope)->where('id', $id)->where('archived', false)->exists();
    }

    private function defaults(string $company, array $scope): array
    {
        return ['company_id' => $company, 'target_module_id' => $scope[0], 'target_feature_id' => $scope[1],
            'category' => 'Divers', 'subcategory' => '', 'brand' => '', 'barcode' => '', 'image_url' => '',
            'unit' => 'unité', 'purchase_price' => 0, 'sale_price' => 0, 'min_stock' => 0, 'max_stock' => 0,
            'supplier_id' => null, 'description' => '', 'archived' => false];
    }

    private function snake(array $input): array
    {
        return collect($input)->mapWithKeys(fn ($value, $key) => [strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $key)) => $value])->all();
    }

    private function product(object $row): array
    {
        return ['id' => $row->id, 'companyId' => $row->company_id, 'name' => $row->name, 'category' => $row->category,
            'subcategory' => $row->subcategory, 'brand' => $row->brand, 'sku' => $row->sku, 'barcode' => $row->barcode,
            'imageUrl' => $row->image_url, 'unit' => $row->unit, 'purchasePrice' => $row->purchase_price,
            'salePrice' => $row->sale_price, 'minStock' => $row->min_stock, 'maxStock' => $row->max_stock,
            'supplierId' => $row->supplier_id, 'description' => $row->description, 'archived' => (bool) $row->archived,
            'createdAt' => $this->date($row->created_at), 'updatedAt' => $this->date($row->updated_at)];
    }

    private function supplier(object $row): array
    {
        return ['id' => $row->id, 'companyId' => $row->company_id, 'name' => $row->name, 'contactName' => $row->contact_name,
            'email' => $row->email, 'phone' => $row->phone, 'address' => $row->address, 'notes' => $row->notes,
            'archived' => (bool) $row->archived];
    }

    private function id(string $prefix): string { return $prefix.'-'.Str::uuid(); }

    private function date(mixed $value): ?string
    {
        return $value ? date(DATE_ATOM, strtotime((string) $value)) : null;
    }
}