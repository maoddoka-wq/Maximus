<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ecommerce_stores')) {
            Schema::create('ecommerce_stores', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('slug')->index();
                $table->text('name');
                $table->text('description')->default('');
                $table->text('status')->default('DRAFT');
                $table->string('currency', 3)->default('XOF');
                $table->text('primary_color')->default('#D69E2E');
                $table->text('accent_color')->default('#172033');
                $table->text('logo_url')->default('');
                $table->timestampsTz();
                $table->unique(['company_id', 'slug']);
            });
        }

        if (! Schema::hasTable('ecommerce_products')) {
            Schema::create('ecommerce_products', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->text('name');
                $table->string('slug')->index();
                $table->text('sku');
                $table->text('description')->default('');
                $table->text('category')->default('Général');
                $table->integer('price')->default(0);
                $table->integer('compare_at_price')->nullable();
                $table->integer('stock')->default(0);
                $table->text('image_url')->default('');
                $table->boolean('featured')->default(false);
                $table->text('status')->default('DRAFT');
                $table->timestampsTz();
                $table->unique(['company_id', 'sku']);
                $table->unique(['company_id', 'slug']);
            });
        }

        if (! Schema::hasTable('ecommerce_orders')) {
            Schema::create('ecommerce_orders', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('reference')->index();
                $table->text('customer_name');
                $table->text('customer_email');
                $table->text('customer_phone')->default('');
                $table->text('shipping_address');
                $table->text('note')->default('');
                $table->integer('total')->default(0);
                $table->text('status')->default('NOUVELLE');
                $table->text('payment_status')->default('À CONFIRMER');
                $table->timestampsTz();
                $table->unique(['company_id', 'reference']);
            });
        }

        if (! Schema::hasTable('ecommerce_order_items')) {
            Schema::create('ecommerce_order_items', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('order_id')->index();
                $table->string('product_id')->nullable();
                $table->text('product_name');
                $table->integer('unit_price')->default(0);
                $table->integer('quantity')->default(1);
                $table->integer('line_total')->default(0);
                $table->timestampsTz();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ecommerce_order_items');
        Schema::dropIfExists('ecommerce_orders');
        Schema::dropIfExists('ecommerce_products');
        Schema::dropIfExists('ecommerce_stores');
    }
};