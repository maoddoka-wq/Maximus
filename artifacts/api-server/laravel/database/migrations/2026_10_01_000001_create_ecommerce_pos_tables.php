<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ecommerce_pos_sales')) {
            Schema::create('ecommerce_pos_sales', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('reference', 40);
                $table->string('cashier_id')->nullable();
                $table->string('idempotency_key', 128);
                $table->text('customer_name')->default('Client comptoir');
                $table->string('currency', 3)->default('XOF');
                $table->integer('subtotal')->default(0);
                $table->integer('total')->default(0);
                $table->integer('amount_received')->default(0);
                $table->integer('change_due')->default(0);
                $table->string('status', 20)->default('PAID');
                $table->timestampsTz();
                $table->unique(['company_id', 'reference'], 'ecommerce_pos_company_reference_unique');
                $table->unique(['company_id', 'idempotency_key'], 'ecommerce_pos_company_idempotency_unique');
            });
        }

        if (! Schema::hasTable('ecommerce_pos_sale_items')) {
            Schema::create('ecommerce_pos_sale_items', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('sale_id')->index();
                $table->string('product_id');
                $table->text('product_name');
                $table->text('sku')->default('');
                $table->integer('unit_price')->default(0);
                $table->integer('quantity')->default(1);
                $table->integer('line_total')->default(0);
                $table->timestampsTz();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ecommerce_pos_sale_items');
        Schema::dropIfExists('ecommerce_pos_sales');
    }
};