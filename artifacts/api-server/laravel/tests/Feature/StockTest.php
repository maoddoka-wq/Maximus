<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StockTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_catalog_and_movements_preserve_the_json_contract(): void
    {
        $request = $this->asActor();
        $product = $request->postJson('/api/stock/products', [
            'companyId' => 'kora',
            'name' => 'Riz local',
            'sku' => 'KOR-RIZ-01',
            'purchasePrice' => 5000,
            'salePrice' => 6500,
        ])->assertCreated()->assertJsonPath('sku', 'KOR-RIZ-01');

        $warehouse = $request->postJson('/api/stock/warehouses', [
            'companyId' => 'kora',
            'name' => 'Entrepôt principal',
        ])->assertCreated();

        $movement = [
            'companyId' => 'kora',
            'productId' => $product->json('id'),
            'warehouseId' => $warehouse->json('id'),
            'type' => 'ENTRÉE',
            'quantity' => 10,
            'userName' => 'Gestionnaire Stock',
        ];

        $request->postJson('/api/stock/movements', $movement)
            ->assertCreated()
            ->assertJsonPath('type', 'ENTRÉE')
            ->assertJsonPath('quantity', 10);

        $request->postJson('/api/stock/movements', array_merge($movement, [
            'type' => 'SORTIE',
            'quantity' => 11,
        ]))
            ->assertStatus(409)
            ->assertJsonPath('error', 'Stock insuffisant : le stock négatif est interdit.');

        $this->assertDatabaseHas('stock_balances', [
            'product_id' => $product->json('id'),
            'warehouse_id' => $warehouse->json('id'),
            'quantity' => 10,
        ]);
        $this->assertDatabaseCount('stock_audit_logs', 1);
        $this->assertDatabaseHas('stock_audit_logs', [
            'user_name' => 'Gestionnaire Stock',
        ]);
    }

    public function test_inventory_validation_applies_only_the_difference(): void
    {
        $request = $this->asActor();
        DB::table('stock_products')->insert([
            'id' => 'product-1',
            'company_id' => 'kora',
            'name' => 'Café',
            'category' => 'Épicerie',
            'subcategory' => '',
            'brand' => '',
            'sku' => 'CAF-01',
            'barcode' => '',
            'image_url' => '',
            'unit' => 'sachet',
            'purchase_price' => 100,
            'sale_price' => 150,
            'min_stock' => 0,
            'max_stock' => 100,
            'supplier_id' => null,
            'description' => '',
            'archived' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('stock_warehouses')->insert([
            'id' => 'warehouse-1',
            'company_id' => 'kora',
            'name' => 'Principal',
            'manager' => '',
            'address' => '',
            'archived' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('stock_balances')->insert([
            'id' => 'balance-1',
            'company_id' => 'kora',
            'product_id' => 'product-1',
            'supplier_id' => null,
            'warehouse_id' => 'warehouse-1',
            'location_id' => null,
            'quantity' => 10,
            'updated_at' => now(),
        ]);

        $inventory = $request->postJson('/api/stock/inventories', [
            'companyId' => 'kora',
            'warehouseId' => 'warehouse-1',
            'notes' => 'Comptage du matin',
            'createdBy' => 'Gestionnaire Stock',
            'lines' => [['productId' => 'product-1', 'actualQuantity' => 12]],
        ])->assertCreated();

        $request->postJson('/api/stock/inventories/'.$inventory->json('id').'/validate', [
            'companyId' => 'kora',
        ])->assertOk()->assertJsonPath('status', 'VALIDÉ');

        $this->assertDatabaseHas('stock_balances', [
            'product_id' => 'product-1',
            'warehouse_id' => 'warehouse-1',
            'quantity' => 12,
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => 'product-1',
            'type' => 'AJUSTEMENT+',
            'quantity' => 2,
        ]);
    }

    public function test_stock_rejects_a_company_different_from_the_actor(): void
    {
        $this->asActor()
            ->getJson('/api/stock/bootstrap?companyId=another-company')
            ->assertForbidden();
    }

    private function asActor(): self
    {
        $user = AuthUser::query()->create([
            'id' => 'stock-admin',
            'email' => 'stock-admin@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Gestionnaire Stock',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($user);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token);
    }
}