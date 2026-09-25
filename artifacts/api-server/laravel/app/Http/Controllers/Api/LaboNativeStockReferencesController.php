<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ModuleAuthorization;
use App\Support\ModuleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LaboNativeStockReferencesController extends Controller
{
    public function bootstrap(Request $request, string $targetModuleId, string $targetFeatureId): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'view');
        $where = fn (string $table) => DB::table($table)
            ->where('company_id', $company)
            ->where('target_module_id', $scope[0])
            ->where('target_feature_id', $scope[1]);

        return response()->json([
            'moduleId' => $targetModuleId,
            'featureId' => $targetFeatureId,
            'suppliers' => $where('labo_stock_suppliers')
                ->orderBy('name')
                ->get()
                ->map(fn ($row) => $this->supplier($row))
                ->values(),
            'warehouses' => $where('labo_stock_warehouses')
                ->orderBy('name')
                ->get()
                ->map(fn ($row) => $this->warehouse($row))
                ->values(),
            'locations' => $where('labo_stock_locations')
                ->orderBy('name')
                ->get()
                ->map(fn ($row) => $this->location($row))
                ->values(),
        ]);
    }

    public function createSupplier(Request $request, string $targetModuleId, string $targetFeatureId): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'create');
        $input = $request->validate([
            'name' => ['required', 'string', 'min:1'],
            'contactName' => ['nullable', 'string'],
            'email' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);
        $row = array_merge([
            'id' => $this->id('labo-supplier'),
            'company_id' => $company,
            'target_module_id' => $scope[0],
            'target_feature_id' => $scope[1],
            'archived' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ], $this->snake($input));
        DB::table('labo_stock_suppliers')->insert($row);

        return response()->json(
            $this->supplier(DB::table('labo_stock_suppliers')->where('id', $row['id'])->first()),
            201,
        );
    }

    public function updateSupplier(Request $request, string $targetModuleId, string $targetFeatureId, string $id): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'modify');
        return $this->update(
            $request,
            'labo_stock_suppliers',
            $id,
            $company,
            $scope,
            'Fournisseur introuvable',
            fn ($row) => $this->supplier($row),
            ['name', 'contactName', 'email', 'phone', 'address', 'notes'],
        );
    }

    public function archiveSupplier(Request $request, string $targetModuleId, string $targetFeatureId, string $id): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'delete');
        return $this->archive(
            'labo_stock_suppliers',
            $id,
            $company,
            $scope,
            'Fournisseur introuvable',
            fn ($row) => $this->supplier($row),
        );
    }

    public function createWarehouse(Request $request, string $targetModuleId, string $targetFeatureId): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'create');
        $input = $request->validate([
            'name' => ['required', 'string', 'min:1'],
            'manager' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
        ]);
        $row = array_merge([
            'id' => $this->id('labo-warehouse'),
            'company_id' => $company,
            'target_module_id' => $scope[0],
            'target_feature_id' => $scope[1],
            'archived' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ], $this->snake($input));
        DB::table('labo_stock_warehouses')->insert($row);

        return response()->json(
            $this->warehouse(DB::table('labo_stock_warehouses')->where('id', $row['id'])->first()),
            201,
        );
    }

    public function updateWarehouse(Request $request, string $targetModuleId, string $targetFeatureId, string $id): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'modify');
        return $this->update(
            $request,
            'labo_stock_warehouses',
            $id,
            $company,
            $scope,
            'Entrepôt introuvable',
            fn ($row) => $this->warehouse($row),
            ['name', 'manager', 'address'],
        );
    }

    public function archiveWarehouse(Request $request, string $targetModuleId, string $targetFeatureId, string $id): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'delete');
        return $this->archive(
            'labo_stock_warehouses',
            $id,
            $company,
            $scope,
            'Entrepôt introuvable',
            fn ($row) => $this->warehouse($row),
        );
    }

    public function createLocation(Request $request, string $targetModuleId, string $targetFeatureId, string $warehouseId): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'create');
        $input = $request->validate(['name' => ['required', 'string', 'min:1']]);
        $warehouseExists = $this->query('labo_stock_warehouses', $company, $scope)
            ->where('id', $warehouseId)
            ->where('archived', false)
            ->exists();
        if (! $warehouseExists) {
            return response()->json(['error' => 'Entrepôt introuvable'], 404);
        }
        $row = [
            'id' => $this->id('labo-location'),
            'company_id' => $company,
            'target_module_id' => $scope[0],
            'target_feature_id' => $scope[1],
            'warehouse_id' => $warehouseId,
            'name' => $input['name'],
            'archived' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('labo_stock_locations')->insert($row);

        return response()->json(
            $this->location(DB::table('labo_stock_locations')->where('id', $row['id'])->first()),
            201,
        );
    }

    public function updateLocation(Request $request, string $targetModuleId, string $targetFeatureId, string $id): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'modify');
        return $this->update(
            $request,
            'labo_stock_locations',
            $id,
            $company,
            $scope,
            'Emplacement introuvable',
            fn ($row) => $this->location($row),
            ['name'],
        );
    }

    public function archiveLocation(Request $request, string $targetModuleId, string $targetFeatureId, string $id): JsonResponse
    {
        [$company, $scope] = $this->context($request, $targetModuleId, $targetFeatureId, 'delete');
        return $this->archive(
            'labo_stock_locations',
            $id,
            $company,
            $scope,
            'Emplacement introuvable',
            fn ($row) => $this->location($row),
        );
    }

    private function context(Request $request, string $module, string $feature, string $action): array
    {
        $actor = $request->attributes->get('authActor');
        $company = (string) $request->attributes->get('companyId');
        $definition = collect(ModuleCatalog::definitionsWithCustom())->firstWhere('id', $module);
        $mounted = is_array($definition)
            ? collect($definition['laboFeatures'] ?? [])->firstWhere('id', $feature)
            : null;
        $isStockReferencesMount = is_array($mounted)
            && ($mounted['kind'] ?? null) === 'reuse'
            && ($mounted['sourceModuleId'] ?? null) === 'stocks'
            && ($mounted['sourceFeatureId'] ?? null) === 'references';

        if (
            $company === ''
            || ! $isStockReferencesMount
            || ! ModuleCatalog::isPublishedModule($module)
            || ! ModuleAuthorization::allows($actor, $module, $action, $feature)
        ) {
            abort(403, 'Fonctionnalité LABO native non autorisée.');
        }

        return [$company, [$module, $feature]];
    }

    private function query(string $table, string $company, array $scope)
    {
        return DB::table($table)
            ->where('company_id', $company)
            ->where('target_module_id', $scope[0])
            ->where('target_feature_id', $scope[1]);
    }

    private function update(Request $request, string $table, string $id, string $company, array $scope, string $message, callable $map, array $fields): JsonResponse
    {
        $rules = [];
        foreach ($fields as $field) {
            $rules[$field] = $field === 'name'
                ? ['sometimes', 'required', 'string', 'min:1']
                : ['sometimes', 'nullable', 'string'];
        }
        $input = $request->validate($rules);
        $query = $this->query($table, $company, $scope)->where('id', $id);
        if (! $query->exists()) {
            return response()->json(['error' => $message], 404);
        }
        $query->update(array_merge($this->snake($input), ['updated_at' => now()]));

        return response()->json($map($query->first()));
    }

    private function archive(string $table, string $id, string $company, array $scope, string $message, callable $map): JsonResponse
    {
        $query = $this->query($table, $company, $scope)->where('id', $id);
        if (! $query->exists()) {
            return response()->json(['error' => $message], 404);
        }
        $query->update(['archived' => true, 'updated_at' => now()]);

        return response()->json($map($query->first()));
    }

    private function snake(array $input): array
    {
        return collect($input)->mapWithKeys(fn ($value, $key) => [strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $key)) => $value])->all();
    }
    private function id(string $prefix): string
    {
        return $prefix.'-'.Str::uuid();
    }

    private function supplier(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'name' => $row->name,
            'contactName' => $row->contact_name,
            'email' => $row->email,
            'phone' => $row->phone,
            'address' => $row->address,
            'notes' => $row->notes,
            'archived' => (bool) $row->archived,
        ];
    }

    private function warehouse(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'name' => $row->name,
            'manager' => $row->manager,
            'address' => $row->address,
            'archived' => (bool) $row->archived,
        ];
    }

    private function location(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'warehouseId' => $row->warehouse_id,
            'name' => $row->name,
            'archived' => (bool) $row->archived,
        ];
    }
}