<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('stock_suppliers')) {
            Schema::create('stock_suppliers', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->text('name');
                $table->text('contact_name')->default('');
                $table->text('email')->default('');
                $table->text('phone')->default('');
                $table->text('address')->default('');
                $table->text('notes')->default('');
                $table->boolean('archived')->default(false);
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->useCurrent();
            });
        }

        if (!Schema::hasTable('stock_warehouses')) {
            Schema::create('stock_warehouses', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->text('name');
                $table->text('manager')->default('');
                $table->text('address')->default('');
                $table->boolean('archived')->default(false);
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->useCurrent();
            });
        }

        if (!Schema::hasTable('stock_locations')) {
            Schema::create('stock_locations', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->string('warehouse_id');
                $table->text('name');
                $table->boolean('archived')->default(false);
                $table->timestampTz('created_at')->useCurrent();
            });
        }

        if (!Schema::hasTable('stock_products')) {
            Schema::create('stock_products', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
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
            });
        }

        if (!Schema::hasTable('stock_balances')) {
            Schema::create('stock_balances', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->string('product_id');
                $table->string('supplier_id')->nullable();
                $table->string('warehouse_id');
                $table->string('location_id')->nullable();
                $table->integer('quantity')->default(0);
                $table->timestampTz('updated_at')->useCurrent();
            });
        }

        if (!Schema::hasTable('stock_movements')) {
            Schema::create('stock_movements', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->string('product_id');
                $table->string('supplier_id')->nullable();
                $table->string('warehouse_id');
                $table->string('destination_warehouse_id')->nullable();
                $table->string('location_id')->nullable();
                $table->text('requester_service')->nullable();
                $table->text('beneficiary')->nullable();
                $table->text('type');
                $table->integer('quantity');
                $table->integer('purchase_price')->default(0);
                $table->text('reason')->default('');
                $table->timestampTz('movement_date')->useCurrent();
                $table->text('user_name')->default('Utilisateur MAXIMUS');
                $table->text('reference')->default('');
                $table->text('comment')->default('');
                $table->text('status')->default('VALIDÉ');
                $table->timestampTz('created_at')->useCurrent();
            });
        }

        if (!Schema::hasTable('stock_requests')) {
            Schema::create('stock_requests', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->string('product_id');
                $table->string('warehouse_id');
                $table->integer('quantity');
                $table->text('reason');
                $table->text('status')->default('EN ATTENTE');
                $table->text('created_by')->default('Utilisateur MAXIMUS');
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->useCurrent();
            });
        }

        if (!Schema::hasTable('stock_inventories')) {
            Schema::create('stock_inventories', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->string('warehouse_id');
                $table->text('status')->default('BROUILLON');
                $table->timestampTz('inventory_date')->useCurrent();
                $table->text('notes')->default('');
                $table->text('created_by')->default('Utilisateur MAXIMUS');
                $table->timestampTz('validated_at')->nullable();
                $table->timestampTz('created_at')->useCurrent();
            });
        }

        if (!Schema::hasTable('stock_inventory_lines')) {
            Schema::create('stock_inventory_lines', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('inventory_id');
                $table->string('product_id');
                $table->integer('theoretical_quantity')->default(0);
                $table->integer('actual_quantity')->default(0);
                $table->integer('difference')->default(0);
            });
        }

        if (!Schema::hasTable('stock_audit_logs')) {
            Schema::create('stock_audit_logs', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->text('action');
                $table->text('entity_type');
                $table->string('entity_id');
                $table->text('user_name')->default('Utilisateur MAXIMUS');
                $table->text('detail')->default('');
                $table->timestampTz('created_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        foreach ([
            'stock_audit_logs',
            'stock_inventory_lines',
            'stock_inventories',
            'stock_requests',
            'stock_movements',
            'stock_balances',
            'stock_products',
            'stock_locations',
            'stock_warehouses',
            'stock_suppliers',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};