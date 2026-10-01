<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ecommerce_inventory_movements')) {
            Schema::create('ecommerce_inventory_movements', function (Blueprint $table): void {
                $table->string('id', 36)->primary();
                $table->string('company_id')->index();
                $table->string('product_id')->index();
                $table->text('product_name');
                $table->text('sku')->default('');
                $table->string('source_type', 32);
                $table->string('source_id', 180);
                $table->string('direction', 8);
                $table->integer('quantity');
                $table->integer('stock_before')->nullable();
                $table->integer('stock_after')->nullable();
                $table->text('reason')->nullable();
                $table->string('reference', 180)->nullable();
                $table->string('created_by')->nullable();
                $table->string('idempotency_key', 128)->nullable();
                $table->timestampsTz();

                $table->unique(
                    ['company_id', 'source_type', 'source_id'],
                    'ecommerce_inventory_source_unique',
                );
                $table->unique(
                    ['company_id', 'idempotency_key'],
                    'ecommerce_inventory_idempotency_unique',
                );
                $table->index(
                    ['company_id', 'product_id', 'created_at'],
                    'ecommerce_inventory_product_date_index',
                );
            });
        }

        $this->copyExistingPosMovements();
        $this->copyExistingOnlineOrders();
        $this->seedOpeningBalances();
    }

    public function down(): void
    {
        Schema::dropIfExists('ecommerce_inventory_movements');
    }

    private function copyExistingPosMovements(): void
    {
        if (! Schema::hasTable('ecommerce_pos_stock_movements')) {
            return;
        }

        foreach (DB::table('ecommerce_pos_stock_movements')->orderBy('id')->cursor() as $movement) {
            DB::table('ecommerce_inventory_movements')->insertOrIgnore([
                'id' => (string) Str::uuid(),
                'company_id' => $movement->company_id,
                'product_id' => $movement->product_id,
                'product_name' => $movement->product_name,
                'sku' => $movement->sku ?? '',
                'source_type' => 'POS_SALE',
                'source_id' => $movement->sale_item_id,
                'direction' => 'OUT',
                'quantity' => (int) $movement->quantity,
                'stock_before' => (int) $movement->stock_before,
                'stock_after' => (int) $movement->stock_after,
                'reason' => 'Vente comptoir',
                'reference' => $movement->reference ?? null,
                'created_by' => $movement->cashier_id ?? null,
                'idempotency_key' => null,
                'created_at' => $movement->created_at ?? now(),
                'updated_at' => $movement->updated_at ?? now(),
            ]);
        }
    }

    private function copyExistingOnlineOrders(): void
    {
        if (! Schema::hasTable('ecommerce_orders')
            || ! Schema::hasTable('ecommerce_order_items')
            || ! Schema::hasTable('ecommerce_products')
            || ! Schema::hasColumn('ecommerce_orders', 'company_id')
            || ! Schema::hasColumn('ecommerce_order_items', 'product_id')) {
            return;
        }

        $hasFulfillmentType = Schema::hasColumn('ecommerce_order_items', 'fulfillment_type');
        $hasRestoredAt = Schema::hasColumn('ecommerce_orders', 'stock_restored_at');
        $query = DB::table('ecommerce_order_items as item')
            ->join('ecommerce_orders as orders', 'orders.id', '=', 'item.order_id')
            ->join('ecommerce_products as product', function ($join): void {
                $join->on('product.id', '=', 'item.product_id')
                    ->on('product.company_id', '=', 'orders.company_id');
            })
            ->whereNotNull('item.product_id');

        if ($hasFulfillmentType) {
            $query->where(function ($builder): void {
                $builder->whereNull('item.fulfillment_type')
                    ->orWhere('item.fulfillment_type', 'PHYSICAL');
            });
        }

        $columns = [
            'orders.company_id',
            'orders.reference',
            'orders.created_at as order_created_at',
            'item.id as item_id',
            'item.product_id',
            'item.product_name',
            'item.quantity',
            'product.sku',
        ];
        if ($hasRestoredAt) {
            $columns[] = 'orders.stock_restored_at';
        }

        foreach ($query->select($columns)->orderBy('item.id')->cursor() as $item) {
            $base = [
                'company_id' => $item->company_id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'sku' => $item->sku ?? '',
                'quantity' => (int) $item->quantity,
                'stock_before' => null,
                'stock_after' => null,
                'reference' => $item->reference ?? null,
                'created_by' => null,
                'idempotency_key' => null,
            ];

            DB::table('ecommerce_inventory_movements')->insertOrIgnore([
                ...$base,
                'id' => (string) Str::uuid(),
                'source_type' => 'ONLINE_ORDER',
                'source_id' => $item->item_id,
                'direction' => 'OUT',
                'reason' => 'Vente en ligne — historique antérieur à l’inventaire',
                'created_at' => $item->order_created_at ?? now(),
                'updated_at' => $item->order_created_at ?? now(),
            ]);

            if (! empty($item->stock_restored_at)) {
                DB::table('ecommerce_inventory_movements')->insertOrIgnore([
                    ...$base,
                    'id' => (string) Str::uuid(),
                    'source_type' => 'ONLINE_RETURN',
                    'source_id' => $item->item_id,
                    'direction' => 'IN',
                    'reason' => 'Stock restitué après annulation — historique antérieur à l’inventaire',
                    'created_at' => $item->stock_restored_at,
                    'updated_at' => $item->stock_restored_at,
                ]);
            }
        }
    }

    private function seedOpeningBalances(): void
    {
        if (! Schema::hasTable('ecommerce_products')
            || ! Schema::hasColumn('ecommerce_products', 'company_id')
            || ! Schema::hasColumn('ecommerce_products', 'stock')) {
            return;
        }

        $query = DB::table('ecommerce_products')->where('stock', '>', 0);
        if (Schema::hasColumn('ecommerce_products', 'product_type')) {
            $query->where(function ($builder): void {
                $builder->whereNull('product_type')
                    ->orWhere('product_type', 'SALE');
            });
        }
        if (Schema::hasColumn('ecommerce_products', 'fulfillment_type')) {
            $query->where(function ($builder): void {
                $builder->whereNull('fulfillment_type')
                    ->orWhere('fulfillment_type', 'PHYSICAL');
            });
        }

        foreach ($query->orderBy('id')->cursor() as $product) {
            DB::table('ecommerce_inventory_movements')->insertOrIgnore([
                'id' => (string) Str::uuid(),
                'company_id' => $product->company_id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'sku' => $product->sku ?? '',
                'source_type' => 'OPENING_BALANCE',
                'source_id' => $product->id,
                'direction' => 'IN',
                'quantity' => (int) $product->stock,
                'stock_before' => 0,
                'stock_after' => (int) $product->stock,
                'reason' => 'Solde existant au démarrage du suivi d’inventaire.',
                'reference' => null,
                'created_by' => null,
                'idempotency_key' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
};