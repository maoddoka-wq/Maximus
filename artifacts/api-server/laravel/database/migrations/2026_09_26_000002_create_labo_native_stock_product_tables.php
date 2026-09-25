<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('labo_stock_products')) return;
        Schema::create('labo_stock_products', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('company_id');
            $table->string('target_module_id');
            $table->string('target_feature_id');
            $table->text('name');
            $table->text('category')->default('Divers');
            $table->text('subcategory')->default('');
            $table->text('brand')->default('');
            $table->text('sku');
            $table->text('barcode')->default('');
            $table->text('image_url')->default('');
            $table->text('unit')->default('unité');
            $table->integer('purchase_price')->default(0);
            $table->integer('sale_price')->default(0);
            $table->integer('min_stock')->default(0);
            $table->integer('max_stock')->default(0);
            $table->string('supplier_id')->nullable();
            $table->text('description')->default('');
            $table->boolean('archived')->default(false);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->index(['company_id', 'target_module_id', 'target_feature_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('labo_stock_products');
    }
};