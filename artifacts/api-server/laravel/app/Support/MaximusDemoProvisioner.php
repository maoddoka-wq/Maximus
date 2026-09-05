<?php

namespace App\Support;

use App\Models\AuthSession;
use App\Models\AuthUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class MaximusDemoProvisioner
{
    public static function ensureAuthUsers(): void
    {
        $accounts = [
            ['id' => 'maximus-admin', 'email' => 'admin@maximus.demo', 'password' => 'Admin123!', 'displayName' => 'Administration MAXIMUS', 'role' => 'maximus_admin', 'companyId' => null, 'employeeId' => null, 'sectorIds' => []],
            ['id' => 'kora-admin', 'email' => 'admin@kora.demo', 'password' => 'Kora123!', 'displayName' => 'Administrateur KORA', 'role' => 'company_admin', 'companyId' => 'kora', 'employeeId' => null, 'sectorIds' => []],
            ['id' => 'demo-emp-awa', 'email' => 'awa.ndiaye@kora.demo', 'password' => 'AwaKora2026!', 'displayName' => 'Awa Ndiaye', 'role' => 'employee', 'companyId' => 'kora', 'employeeId' => 'demo-emp-awa', 'sectorIds' => ['kora-service-vente']],
            ['id' => 'demo-emp-ibrahima', 'email' => 'ibrahima.kane@kora.demo', 'password' => 'IbrahimaKora2026!', 'displayName' => 'Ibrahima Kane', 'role' => 'employee', 'companyId' => 'kora', 'employeeId' => 'demo-emp-ibrahima', 'sectorIds' => ['kora-service-stock']],
            ['id' => 'demo-emp-ndeye', 'email' => 'ndeye.sarr@kora.demo', 'password' => 'NdeyeKora2026!', 'displayName' => 'Ndeye Sarr', 'role' => 'employee', 'companyId' => 'kora', 'employeeId' => 'demo-emp-ndeye', 'sectorIds' => ['kora-service-rh']],
            ['id' => 'demo-emp-mamadou', 'email' => 'mamadou.ba@kora.demo', 'password' => 'MamadouKora2026!', 'displayName' => 'Mamadou Ba', 'role' => 'sector_manager', 'companyId' => 'kora', 'employeeId' => 'demo-emp-mamadou', 'sectorIds' => ['kora-service-finance']],
        ];

        foreach ($accounts as $account) {
            $user = AuthUser::query()->find($account['id']);
            $needsRepair = !$user
                || $user->email !== $account['email']
                || $user->display_name !== $account['displayName']
                || $user->role !== $account['role']
                || $user->company_id !== $account['companyId']
                || $user->employee_id !== $account['employeeId']
                || ($user->sector_ids ?? []) !== $account['sectorIds']
                || $user->status !== 'ACTIF'
                || !MaximusPassword::check($account['password'], $user->password_hash);

            if (!$needsRepair) {
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

    public static function ensureStockSeed(): void
    {
        if (DB::table('stock_products')->where('company_id', 'kora')->exists()) {
            return;
        }

        DB::transaction(function (): void {
            $supplierId = 'supplier-kora-local';
            $warehouseId = 'warehouse-kora-main';
            $locationId = 'location-kora-main';
            $now = now();

            DB::table('stock_suppliers')->insert([
                'id' => $supplierId, 'company_id' => 'kora', 'name' => 'Fournisseurs KORA',
                'contact_name' => 'Service achats', 'email' => '', 'phone' => '+221 33 800 00 00',
                'address' => 'Dakar, Sénégal', 'notes' => '', 'archived' => false,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            DB::table('stock_warehouses')->insert([
                'id' => $warehouseId, 'company_id' => 'kora', 'name' => 'Entrepôt principal',
                'manager' => 'Ndeye Sarr', 'address' => 'Zone industrielle, Dakar',
                'archived' => false, 'created_at' => $now, 'updated_at' => $now,
            ]);
            DB::table('stock_locations')->insert([
                'id' => $locationId, 'company_id' => 'kora', 'warehouse_id' => $warehouseId,
                'name' => 'Zone A — Épicerie', 'archived' => false, 'created_at' => $now,
            ]);

            $products = [
                ['id' => 'product-kora-cafe', 'name' => 'Café Touba 250g', 'category' => 'Épicerie', 'subcategory' => 'Café', 'brand' => 'Touba', 'sku' => 'KOR-CAF-01', 'barcode' => '377000000001', 'unit' => 'sachet', 'purchase_price' => 2400, 'sale_price' => 3500, 'min_stock' => 50, 'max_stock' => 300, 'description' => 'Café Touba conditionné 250g.'],
                ['id' => 'product-kora-huile', 'name' => 'Huile d’arachide 1L', 'category' => 'Épicerie', 'subcategory' => 'Huiles', 'brand' => 'KORA', 'sku' => 'KOR-HUI-02', 'barcode' => '377000000002', 'unit' => 'bouteille', 'purchase_price' => 1600, 'sale_price' => 2200, 'min_stock' => 45, 'max_stock' => 200, 'description' => 'Huile d’arachide locale 1 litre.'],
                ['id' => 'product-kora-riz', 'name' => 'Riz local 5kg', 'category' => 'Épicerie', 'subcategory' => 'Céréales', 'brand' => 'Sahel', 'sku' => 'KOR-RIZ-03', 'barcode' => '377000000003', 'unit' => 'sac', 'purchase_price' => 5200, 'sale_price' => 6800, 'min_stock' => 30, 'max_stock' => 150, 'description' => 'Riz local conditionné en sac de 5kg.'],
                ['id' => 'product-kora-savon', 'name' => 'Savon naturel', 'category' => 'Hygiène', 'subcategory' => 'Savons', 'brand' => 'Baobab', 'sku' => 'KOR-SAV-04', 'barcode' => '377000000004', 'unit' => 'pièce', 'purchase_price' => 700, 'sale_price' => 1200, 'min_stock' => 25, 'max_stock' => 120, 'description' => 'Savon naturel au karité.'],
                ['id' => 'product-kora-baume', 'name' => 'Baume karité 100ml', 'category' => 'Bien-être', 'subcategory' => 'Soins', 'brand' => 'Teranga', 'sku' => 'KOR-COS-05', 'barcode' => '377000000005', 'unit' => 'pot', 'purchase_price' => 3100, 'sale_price' => 4500, 'min_stock' => 20, 'max_stock' => 120, 'description' => 'Baume de karité naturel 100ml.'],
            ];

            foreach ($products as $product) {
                DB::table('stock_products')->insert(array_merge($product, [
                    'company_id' => 'kora', 'image_url' => '', 'supplier_id' => $supplierId,
                    'archived' => false, 'created_at' => $now, 'updated_at' => $now,
                ]));
            }

            foreach ([
                ['product' => 'product-kora-cafe', 'quantity' => 184],
                ['product' => 'product-kora-huile', 'quantity' => 38],
                ['product' => 'product-kora-riz', 'quantity' => 76],
                ['product' => 'product-kora-savon', 'quantity' => 12],
                ['product' => 'product-kora-baume', 'quantity' => 92],
            ] as $balance) {
                DB::table('stock_balances')->insert([
                    'id' => 'balance-kora-'.Str::after($balance['product'], 'product-kora-'),
                    'company_id' => 'kora', 'product_id' => $balance['product'],
                    'supplier_id' => $supplierId, 'warehouse_id' => $warehouseId,
                    'location_id' => $locationId, 'quantity' => $balance['quantity'], 'updated_at' => $now,
                ]);
            }

            foreach ([
                ['id' => 'movement-kora-1', 'product' => 'product-kora-huile', 'type' => 'SORTIE', 'quantity' => 20, 'reason' => 'Réassort boutique Dakar', 'user' => 'Ibrahima Kane', 'reference' => 'MVT-240618-001', 'comment' => 'Sortie initiale de démonstration', 'date' => '2024-06-18 09:42:00'],
                ['id' => 'movement-kora-2', 'product' => 'product-kora-cafe', 'type' => 'ENTRÉE', 'quantity' => 80, 'reason' => 'Réception fournisseur', 'user' => 'Ndeye Sarr', 'reference' => 'REC-240617-004', 'comment' => 'Réception initiale de démonstration', 'date' => '2024-06-17 16:18:00'],
                ['id' => 'movement-kora-3', 'product' => 'product-kora-savon', 'type' => 'PERTE', 'quantity' => 8, 'reason' => 'Produit endommagé', 'user' => 'Moussa Faye', 'reference' => 'PER-240617-001', 'comment' => 'Perte initiale de démonstration', 'date' => '2024-06-17 11:05:00'],
            ] as $movement) {
                DB::table('stock_movements')->insert([
                    'id' => $movement['id'], 'company_id' => 'kora', 'product_id' => $movement['product'],
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