<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ecommerce_pos_sales')) {
            if (! Schema::hasColumn('ecommerce_pos_sales', 'payment_method')) {
                Schema::table('ecommerce_pos_sales', function (Blueprint $table): void {
                    $table->string('payment_method', 20)->default('CASH');
                });
            }

            if (! Schema::hasColumn('ecommerce_pos_sales', 'payment_reference')) {
                Schema::table('ecommerce_pos_sales', function (Blueprint $table): void {
                    $table->string('payment_reference', 180)->nullable();
                });
            }
        }

        if (! Schema::hasTable('ecommerce_pos_stock_movements')) {
            Schema::create('ecommerce_pos_stock_movements', function (Blueprint $table): void {
                $table->string('id', 36)->primary();
                $table->string('company_id')->index();
                $table->string('sale_id')->index();
                $table->string('sale_item_id');
                $table->string('product_id')->index();
                $table->text('product_name');
                $table->text('sku')->default('');
                $table->string('movement_type', 20);
                $table->integer('quantity');
                $table->integer('stock_before');
                $table->integer('stock_after');
                $table->string('reference', 40);
                $table->string('cashier_id')->nullable();
                $table->timestampsTz();

                $table->unique(
                    ['company_id', 'sale_item_id'],
                    'ecommerce_pos_stock_movement_sale_item_unique',
                );
                $table->index(
                    ['company_id', 'product_id', 'created_at'],
                    'ecommerce_pos_stock_movement_product_date_index',
                );
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ecommerce_pos_stock_movements');

        if (! Schema::hasTable('ecommerce_pos_sales')) {
            return;
        }

        $columns = [];
        if (Schema::hasColumn('ecommerce_pos_sales', 'payment_method')) {
            $columns[] = 'payment_method';
        }
        if (Schema::hasColumn('ecommerce_pos_sales', 'payment_reference')) {
            $columns[] = 'payment_reference';
        }

        if ($columns !== []) {
            Schema::table('ecommerce_pos_sales', function (Blueprint $table) use ($columns): void {
                $table->dropColumn($columns);
            });
        }
    }
};