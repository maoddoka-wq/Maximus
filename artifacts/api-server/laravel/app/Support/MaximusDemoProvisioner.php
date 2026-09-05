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
                || MaximusPassword::needsRehash($user->password_hash)
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

    public static function ensureStockWorkflowSeed(string $companyId = 'kora'): void
    {
        $prefix = 'demo-'.$companyId.'-';
        $productPrefix = 'product-'.$companyId.'-';
        $now = now();

        DB::transaction(function () use ($companyId, $prefix, $productPrefix, $now): void {
            $supplierId = $prefix.'supplier-teranga';
            $warehouseId = $prefix.'warehouse-boutique';
            $locationId = $prefix.'location-boutique';

            DB::table('stock_suppliers')->insertOrIgnore([
                'id' => $supplierId,
                'company_id' => $companyId,
                'name' => 'Coopérative Teranga',
                'contact_name' => 'Fatou Diop',
                'email' => 'achats@teranga.demo',
                'phone' => '+221 77 000 00 00',
                'address' => 'Dakar',
                'notes' => 'Fournisseur local de démonstration',
                'archived' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('stock_warehouses')->insertOrIgnore([
                'id' => $warehouseId,
                'company_id' => $companyId,
                'name' => 'Boutique Dakar',
                'manager' => 'Ibrahima Kane',
                'address' => 'Médina, Dakar',
                'archived' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('stock_locations')->insertOrIgnore([
                'id' => $locationId,
                'company_id' => $companyId,
                'warehouse_id' => $warehouseId,
                'name' => 'Réserve boutique',
                'archived' => false,
                'created_at' => $now,
            ]);
            DB::table('stock_balances')->insertOrIgnore([
                'id' => 'balance-'.$companyId.'-boutique-huile',
                'company_id' => $companyId,
                'product_id' => $productPrefix.'huile',
                'supplier_id' => $supplierId,
                'warehouse_id' => $warehouseId,
                'location_id' => $locationId,
                'quantity' => 18,
                'updated_at' => $now,
            ]);

            DB::table('stock_movements')->insertOrIgnore([
                'id' => 'movement-'.$companyId.'-transfer',
                'company_id' => $companyId,
                'product_id' => $productPrefix.'riz',
                'supplier_id' => null,
                'warehouse_id' => $prefix.'warehouse-main',
                'destination_warehouse_id' => $warehouseId,
                'location_id' => $prefix.'location-main',
                'requester_service' => 'Service ventes',
                'beneficiary' => 'Boutique Dakar',
                'type' => 'TRANSFERT',
                'quantity' => 10,
                'purchase_price' => 5200,
                'reason' => 'Réassort de la boutique',
                'movement_date' => '2024-06-18 10:25:00',
                'user_name' => 'Ibrahima Kane',
                'reference' => 'TRF-DEMO-001',
                'comment' => 'Transfert depuis l’entrepôt principal',
                'status' => 'VALIDÉ',
                'created_at' => $now,
            ]);
            DB::table('stock_requests')->insertOrIgnore([
                'id' => 'request-'.$companyId.'-001',
                'company_id' => $companyId,
                'product_id' => $productPrefix.'huile',
                'warehouse_id' => $prefix.'warehouse-main',
                'quantity' => 120,
                'reason' => 'Le stock est sous le seuil de sécurité',
                'status' => 'EN ATTENTE',
                'created_by' => 'Ibrahima Kane',
                'created_at' => $now->copy()->subHours(3),
                'updated_at' => $now->copy()->subHours(3),
            ]);

            $inventoryId = 'inventory-'.$companyId.'-001';
            DB::table('stock_inventories')->insertOrIgnore([
                'id' => $inventoryId,
                'company_id' => $companyId,
                'warehouse_id' => $prefix.'warehouse-main',
                'status' => 'BROUILLON',
                'inventory_date' => '2024-06-18',
                'notes' => 'Comptage de démonstration avant clôture mensuelle',
                'created_by' => 'Ibrahima Kane',
                'validated_at' => null,
                'created_at' => $now->copy()->subDay(),
            ]);
            DB::table('stock_inventory_lines')->insertOrIgnore([
                'id' => 'inventory-line-'.$companyId.'-001',
                'inventory_id' => $inventoryId,
                'product_id' => $productPrefix.'huile',
                'theoretical_quantity' => 38,
                'actual_quantity' => 36,
                'difference' => -2,
            ]);
            DB::table('stock_inventory_lines')->insertOrIgnore([
                'id' => 'inventory-line-'.$companyId.'-002',
                'inventory_id' => $inventoryId,
                'product_id' => $productPrefix.'savon',
                'theoretical_quantity' => 12,
                'actual_quantity' => 12,
                'difference' => 0,
            ]);
        });
    }

    public static function ensureControlSeed(string $companyId = 'kora'): void
    {
        $prefix = 'demo-'.$companyId.'-';
        $now = now();
        $tasks = [
            [
                'id' => 'demo-control-'.$companyId.'-stock',
                'sector_id' => 'kora-service-stock',
                'title' => 'Contrôler l’écart d’inventaire',
                'description' => 'Comparer le stock théorique et le comptage physique de la boutique Dakar.',
                'module_id' => 'stocks',
                'assignee_employee_id' => 'demo-emp-ibrahima',
                'assignee_name' => 'Ibrahima Kane',
                'created_by' => 'Aminata Diop',
                'status' => 'EN COURS',
                'priority' => 'CRITIQUE',
                'requires_approval' => false,
                'due_date' => 'Demain',
                'related_object' => 'INV-2406-02',
            ],
            [
                'id' => 'demo-control-'.$companyId.'-payroll',
                'sector_id' => 'kora-service-rh',
                'title' => 'Valider la période de paie de juin',
                'description' => 'La période est prête pour validation avant génération des bulletins.',
                'module_id' => 'paie',
                'assignee_employee_id' => 'demo-emp-ndeye',
                'assignee_name' => 'Ndeye Sarr',
                'created_by' => 'Mamadou Ba',
                'status' => 'À FAIRE',
                'priority' => 'NORMALE',
                'requires_approval' => true,
                'due_date' => '20 juin',
                'related_object' => 'PAIE-2024-06',
            ],
            [
                'id' => 'demo-control-'.$companyId.'-purchase',
                'sector_id' => 'kora-service-finance',
                'title' => 'Valider le réassort d’huile d’arachide',
                'description' => 'La demande doit être confirmée avant la création du bon de commande fournisseur.',
                'module_id' => 'achats',
                'assignee_employee_id' => 'demo-emp-mamadou',
                'assignee_name' => 'Mamadou Ba',
                'created_by' => 'Ibrahima Kane',
                'status' => 'VALIDÉ',
                'priority' => 'HAUTE',
                'requires_approval' => true,
                'due_date' => '18 juin',
                'related_object' => 'BC-2406-038',
            ],
        ];

        foreach ($tasks as $task) {
            DB::table('control_tasks')->insertOrIgnore(array_merge($task, [
                'company_id' => $companyId,
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }

        $traces = [
            ['id' => 'demo-control-event-'.$companyId.'-1', 'type' => 'TASK_CREATED', 'label' => 'Tâche créée', 'summary' => 'Contrôler l’écart d’inventaire', 'module_id' => 'stocks', 'actor_name' => 'Aminata Diop', 'entity_type' => 'task', 'entity_id' => 'demo-control-'.$companyId.'-stock', 'severity' => 'warning'],
            ['id' => 'demo-control-event-'.$companyId.'-2', 'type' => 'TASK_UPDATED', 'label' => 'Tâche validée', 'summary' => 'Le réassort d’huile a été validé.', 'module_id' => 'achats', 'actor_name' => 'Mamadou Ba', 'entity_type' => 'task', 'entity_id' => 'demo-control-'.$companyId.'-purchase', 'severity' => 'success'],
            ['id' => 'demo-control-event-'.$companyId.'-3', 'type' => 'SYSTEM', 'label' => 'Seuil de stock atteint', 'summary' => 'Huile d’arachide 1L est sous son seuil de sécurité.', 'module_id' => 'stocks', 'actor_name' => 'MAXIMUS', 'entity_type' => 'product', 'entity_id' => $prefix.'huile', 'severity' => 'warning'],
        ];

        foreach ($traces as $trace) {
            DB::table('control_events')->insertOrIgnore(array_merge($trace, [
                'company_id' => $companyId,
                'created_at' => $now,
            ]));
        }

        $audits = [
            ['id' => 'demo-control-audit-'.$companyId.'-1', 'action' => 'TASK_CREATED', 'summary' => 'La tâche de contrôle d’inventaire a été créée.', 'module_id' => 'stocks', 'actor_name' => 'Aminata Diop', 'entity_type' => 'task', 'entity_id' => 'demo-control-'.$companyId.'-stock'],
            ['id' => 'demo-control-audit-'.$companyId.'-2', 'action' => 'TASK_VALIDATED', 'summary' => 'La demande de réassort a été validée.', 'module_id' => 'achats', 'actor_name' => 'Mamadou Ba', 'entity_type' => 'task', 'entity_id' => 'demo-control-'.$companyId.'-purchase'],
            ['id' => 'demo-control-audit-'.$companyId.'-3', 'action' => 'INVENTORY_REVIEWED', 'summary' => 'L’écart d’inventaire de la boutique est en cours de revue.', 'module_id' => 'stocks', 'actor_name' => 'Ibrahima Kane', 'entity_type' => 'inventory', 'entity_id' => 'inventory-'.$companyId.'-001'],
        ];

        foreach ($audits as $audit) {
            DB::table('control_audit_entries')->insertOrIgnore(array_merge($audit, [
                'company_id' => $companyId,
                'created_at' => $now,
            ]));
        }
    }

    public static function ensurePresenceSeed(string $companyId = 'kora'): void
    {
        $now = now();
        $items = [
            [
                'id' => 'demo-presence-'.$companyId.'-attendance-awa',
                'type' => 'attendance',
                'employee_id' => 'demo-emp-awa',
                'work_date' => '2024-06-18',
                'start_date' => null,
                'end_date' => null,
                'status' => 'ACTIF',
                'payload' => ['arrival' => '08:02', 'pauseStart' => '12:30', 'pauseEnd' => '13:15', 'expectedStart' => '08:00'],
            ],
            [
                'id' => 'demo-presence-'.$companyId.'-attendance-ibrahima',
                'type' => 'attendance',
                'employee_id' => 'demo-emp-ibrahima',
                'work_date' => '2024-06-18',
                'start_date' => null,
                'end_date' => null,
                'status' => 'ACTIF',
                'payload' => ['arrival' => '07:55', 'exit' => '17:12', 'expectedStart' => '08:00'],
            ],
            [
                'id' => 'demo-presence-'.$companyId.'-absence-ndeye',
                'type' => 'absence',
                'employee_id' => 'demo-emp-ndeye',
                'work_date' => '2024-06-17',
                'start_date' => '2024-06-17',
                'end_date' => '2024-06-17',
                'status' => 'APPROUVÉE',
                'payload' => ['reason' => 'Rendez-vous administratif', 'duration' => 1],
            ],
            [
                'id' => 'demo-presence-'.$companyId.'-schedule-awa',
                'type' => 'schedule',
                'employee_id' => 'demo-emp-awa',
                'work_date' => '2024-06-19',
                'start_date' => null,
                'end_date' => null,
                'status' => 'ACTIF',
                'payload' => ['shift' => 'Journée', 'startTime' => '08:00', 'endTime' => '17:00', 'location' => 'Boutique Dakar'],
            ],
            [
                'id' => 'demo-presence-'.$companyId.'-leave-mamadou',
                'type' => 'leave',
                'employee_id' => 'demo-emp-mamadou',
                'work_date' => null,
                'start_date' => '2024-06-24',
                'end_date' => '2024-06-28',
                'status' => 'EN ATTENTE',
                'payload' => ['reason' => 'Congés annuels', 'days' => 5],
            ],
            [
                'id' => 'demo-presence-'.$companyId.'-history-awa',
                'type' => 'history',
                'employee_id' => 'demo-emp-awa',
                'work_date' => '2024-06-18',
                'start_date' => null,
                'end_date' => null,
                'status' => 'ACTIF',
                'payload' => ['action' => 'clock.arrival', 'itemId' => 'demo-presence-'.$companyId.'-attendance-awa', 'newValue' => ['arrival' => '08:02']],
            ],
        ];

        foreach ($items as $item) {
            DB::table('presence_items')->insertOrIgnore([
                'id' => $item['id'],
                'company_id' => $companyId,
                'type' => $item['type'],
                'employee_id' => $item['employee_id'],
                'work_date' => $item['work_date'],
                'start_date' => $item['start_date'],
                'end_date' => $item['end_date'],
                'status' => $item['status'],
                'payload' => json_encode($item['payload'], JSON_UNESCAPED_UNICODE),
                'created_by' => 'MAXIMUS — données de démonstration',
                'updated_by' => 'MAXIMUS — données de démonstration',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
