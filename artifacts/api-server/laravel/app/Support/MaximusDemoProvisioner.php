<?php

namespace App\Support;

use App\Models\AuthSession;
use App\Models\AuthUser;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class MaximusDemoProvisioner
{
    public static function ensureAuthUsers(): void
    {
        if (! Schema::hasColumn('auth_users', 'permissions')) {
            Schema::table('auth_users', function (Blueprint $table): void {
                $table->json('permissions')->default('{}');
            });
        }

        $accounts = [
            ['id' => 'maximus-admin', 'email' => 'admin@maximus.demo', 'password' => 'Admin123!', 'displayName' => 'Administration MAXIMUS', 'role' => 'maximus_admin', 'companyId' => null, 'employeeId' => null, 'sectorIds' => [], 'permissions' => []],
            ['id' => 'kora-admin', 'email' => 'admin@kora.demo', 'password' => 'Kora123!', 'displayName' => 'Administrateur KORA', 'role' => 'company_admin', 'companyId' => 'kora', 'employeeId' => null, 'sectorIds' => [], 'permissions' => []],
            ['id' => 'demo-emp-awa', 'email' => 'awa.ndiaye@kora.demo', 'password' => 'AwaKora2026!', 'displayName' => 'Awa Ndiaye', 'role' => 'employee', 'companyId' => 'kora', 'employeeId' => 'demo-emp-awa', 'sectorIds' => ['kora-service-vente'], 'permissions' => ['commerce' => ['voir']]],
            ['id' => 'demo-emp-ibrahima', 'email' => 'ibrahima.kane@kora.demo', 'password' => 'IbrahimaKora2026!', 'displayName' => 'Ibrahima Kane', 'role' => 'employee', 'companyId' => 'kora', 'employeeId' => 'demo-emp-ibrahima', 'sectorIds' => ['kora-service-stock'], 'permissions' => ['stocks' => ['voir'], 'stocks:products' => ['voir', 'créer', 'modifier'], 'stocks:entries' => ['voir', 'créer', 'modifier'], 'stocks:exits' => ['voir', 'créer', 'modifier'], 'stocks:requests' => ['voir', 'créer', 'modifier'], 'stocks:inventory' => ['voir', 'modifier'], 'stocks:reports' => ['voir'], 'stocks:references' => ['voir'], 'stocks:users' => ['voir'], 'stocks:settings' => ['voir']]],
            ['id' => 'demo-emp-ndeye', 'email' => 'ndeye.sarr@kora.demo', 'password' => 'NdeyeKora2026!', 'displayName' => 'Ndeye Sarr', 'role' => 'employee', 'companyId' => 'kora', 'employeeId' => 'demo-emp-ndeye', 'sectorIds' => ['kora-service-rh'], 'permissions' => ['presences' => ['voir', 'créer', 'modifier']]],
            ['id' => 'demo-emp-mamadou', 'email' => 'mamadou.ba@kora.demo', 'password' => 'MamadouKora2026!', 'displayName' => 'Mamadou Ba', 'role' => 'sector_manager', 'companyId' => 'kora', 'employeeId' => 'demo-emp-mamadou', 'sectorIds' => ['kora-service-finance'], 'permissions' => []],
        ];

        foreach ($accounts as $account) {
            $user = AuthUser::query()->find($account['id']);
            $needsRepair = ! $user
                || $user->email !== $account['email']
                || $user->display_name !== $account['displayName']
                || $user->role !== $account['role']
                || $user->company_id !== $account['companyId']
                || $user->employee_id !== $account['employeeId']
                || ($user->sector_ids ?? []) !== $account['sectorIds']
                || ($user->permissions ?? []) !== $account['permissions']
                || $user->status !== 'ACTIF'
                || ! MaximusPassword::check($account['password'], $user->password_hash);

            if (! $needsRepair) {
                continue;
            }

            $values = [
                'email' => $account['email'],
                'password_hash' => MaximusPassword::hash($account['password']),
                'display_name' => $account['displayName'],
                'role' => $account['role'],
                'company_id' => $account['companyId'],
                'employee_id' => $account['employeeId'],
                'sector_ids' => $account['sectorIds'],
                'permissions' => $account['permissions'],
                'status' => 'ACTIF',
                'updated_at' => now(),
            ];

            if ($user) {
                $user->update($values);
                AuthSession::query()->where('user_id', $user->id)->delete();
            } else {
                AuthUser::query()->create(array_merge($values, [
                    'id' => $account['id'],
                    'created_at' => now(),
                ]));
            }
        }
    }

    public static function ensureStockSeed(string $companyId = 'kora'): void
    {
        if (DB::table('stock_products')->where('company_id', $companyId)->exists()) {
            return;
        }

        DB::transaction(function () use ($companyId): void {
            $prefix = 'demo-'.$companyId.'-';
            $productPrefix = 'product-'.$companyId.'-';
            $supplierId = $prefix.'supplier-local';
            $warehouseId = $prefix.'warehouse-main';
            $locationId = $prefix.'location-main';
            $now = now();

            DB::table('stock_suppliers')->insert([
                'id' => $supplierId, 'company_id' => $companyId, 'name' => 'Fournisseurs de démonstration',
                'contact_name' => 'Service achats', 'email' => '', 'phone' => '',
                'address' => '', 'notes' => '', 'archived' => false,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            DB::table('stock_warehouses')->insert([
                'id' => $warehouseId, 'company_id' => $companyId, 'name' => 'Entrepôt principal',
                'manager' => 'Gestionnaire de stock', 'address' => '',
                'archived' => false, 'created_at' => $now, 'updated_at' => $now,
            ]);
            DB::table('stock_locations')->insert([
                'id' => $locationId, 'company_id' => $companyId, 'warehouse_id' => $warehouseId,
                'name' => 'Zone principale', 'archived' => false, 'created_at' => $now,
            ]);

            $products = [
                ['id' => $productPrefix.'cafe', 'name' => 'Café Touba 250g', 'category' => 'Épicerie', 'subcategory' => 'Café', 'brand' => 'Touba', 'sku' => 'DEMO-CAF-01', 'barcode' => '377000000001', 'unit' => 'sachet', 'purchase_price' => 2400, 'sale_price' => 3500, 'min_stock' => 50, 'max_stock' => 300, 'description' => 'Café conditionné 250g.'],
                ['id' => $productPrefix.'huile', 'name' => 'Huile d’arachide 1L', 'category' => 'Épicerie', 'subcategory' => 'Huiles', 'brand' => 'Local', 'sku' => 'DEMO-HUI-02', 'barcode' => '377000000002', 'unit' => 'bouteille', 'purchase_price' => 1600, 'sale_price' => 2200, 'min_stock' => 45, 'max_stock' => 200, 'description' => 'Huile d’arachide locale 1 litre.'],
                ['id' => $productPrefix.'riz', 'name' => 'Riz local 5kg', 'category' => 'Épicerie', 'subcategory' => 'Céréales', 'brand' => 'Sahel', 'sku' => 'DEMO-RIZ-03', 'barcode' => '377000000003', 'unit' => 'sac', 'purchase_price' => 5200, 'sale_price' => 6800, 'min_stock' => 30, 'max_stock' => 150, 'description' => 'Riz local conditionné en sac de 5kg.'],
                ['id' => $productPrefix.'savon', 'name' => 'Savon naturel', 'category' => 'Hygiène', 'subcategory' => 'Savons', 'brand' => 'Baobab', 'sku' => 'DEMO-SAV-04', 'barcode' => '377000000004', 'unit' => 'pièce', 'purchase_price' => 700, 'sale_price' => 1200, 'min_stock' => 25, 'max_stock' => 120, 'description' => 'Savon naturel au karité.'],
                ['id' => $productPrefix.'baume', 'name' => 'Baume karité 100ml', 'category' => 'Bien-être', 'subcategory' => 'Soins', 'brand' => 'Teranga', 'sku' => 'DEMO-COS-05', 'barcode' => '377000000005', 'unit' => 'pot', 'purchase_price' => 3100, 'sale_price' => 4500, 'min_stock' => 20, 'max_stock' => 120, 'description' => 'Baume de karité naturel 100ml.'],
            ];

            foreach ($products as $product) {
                DB::table('stock_products')->insert(array_merge($product, [
                    'company_id' => $companyId, 'image_url' => '', 'supplier_id' => $supplierId,
                    'archived' => false, 'created_at' => $now, 'updated_at' => $now,
                ]));
            }

            foreach ([
                ['product' => $productPrefix.'cafe', 'quantity' => 184],
                ['product' => $productPrefix.'huile', 'quantity' => 38],
                ['product' => $productPrefix.'riz', 'quantity' => 76],
                ['product' => $productPrefix.'savon', 'quantity' => 12],
                ['product' => $productPrefix.'baume', 'quantity' => 92],
            ] as $balance) {
                DB::table('stock_balances')->insert([
                    'id' => 'balance-'.$companyId.'-'.Str::after($balance['product'], $productPrefix),
                    'company_id' => $companyId, 'product_id' => $balance['product'],
                    'supplier_id' => $supplierId, 'warehouse_id' => $warehouseId,
                    'location_id' => $locationId, 'quantity' => $balance['quantity'], 'updated_at' => $now,
                ]);
            }

            foreach ([
                ['id' => 'movement-'.$companyId.'-1', 'product' => $productPrefix.'huile', 'type' => 'SORTIE', 'quantity' => 20, 'reason' => 'Réassort', 'user' => 'Gestionnaire de stock', 'reference' => 'MVT-DEMO-001', 'comment' => 'Sortie initiale de démonstration', 'date' => '2024-06-18 09:42:00'],
                ['id' => 'movement-'.$companyId.'-2', 'product' => $productPrefix.'cafe', 'type' => 'ENTRÉE', 'quantity' => 80, 'reason' => 'Réception fournisseur', 'user' => 'Gestionnaire de stock', 'reference' => 'REC-DEMO-004', 'comment' => 'Réception initiale de démonstration', 'date' => '2024-06-17 16:18:00'],
                ['id' => 'movement-'.$companyId.'-3', 'product' => $productPrefix.'savon', 'type' => 'PERTE', 'quantity' => 8, 'reason' => 'Produit endommagé', 'user' => 'Gestionnaire de stock', 'reference' => 'PER-DEMO-001', 'comment' => 'Perte initiale de démonstration', 'date' => '2024-06-17 11:05:00'],
            ] as $movement) {
                DB::table('stock_movements')->insert([
                    'id' => $movement['id'], 'company_id' => $companyId, 'product_id' => $movement['product'],
                    'supplier_id' => $supplierId, 'warehouse_id' => $warehouseId, 'destination_warehouse_id' => null,
                    'location_id' => $locationId, 'requester_service' => null, 'beneficiary' => null,
                    'type' => $movement['type'], 'quantity' => $movement['quantity'], 'purchase_price' => 0,
                    'reason' => $movement['reason'], 'movement_date' => $movement['date'], 'user_name' => $movement['user'],
                    'reference' => $movement['reference'], 'comment' => $movement['comment'], 'status' => 'VALIDÉ',
                    'created_at' => $now,
                ]);
            }
        });
    }
}
