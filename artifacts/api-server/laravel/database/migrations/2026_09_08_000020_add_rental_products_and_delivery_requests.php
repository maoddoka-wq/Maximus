<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ecommerce_products')) {
            Schema::table('ecommerce_products', function (Blueprint $table): void {
                if (! Schema::hasColumn('ecommerce_products', 'product_type')) {
                    $table->string('product_type', 16)->default('SALE')->index();
                }
                if (! Schema::hasColumn('ecommerce_products', 'rental_period')) {
                    $table->string('rental_period', 16)->nullable();
                }
            });
        }

        if (Schema::hasTable('ecommerce_order_items')) {
            Schema::table('ecommerce_order_items', function (Blueprint $table): void {
                if (! Schema::hasColumn('ecommerce_order_items', 'product_type')) {
                    $table->string('product_type', 16)->default('SALE');
                }
                if (! Schema::hasColumn('ecommerce_order_items', 'rental_period')) {
                    $table->string('rental_period', 16)->nullable();
                }
            });
        }

        if (! Schema::hasTable('ecommerce_delivery_requests')) {
            Schema::create('ecommerce_delivery_requests', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('customer_id')->nullable()->index();
                $table->string('order_id')->nullable()->index();
                $table->string('reference')->index();
                $table->text('requester_name');
                $table->text('requester_email');
                $table->text('requester_phone')->default('');
                $table->text('address');
                $table->string('service_type', 24)->default('STANDARD');
                $table->date('desired_date')->nullable();
                $table->text('note')->default('');
                $table->string('status', 24)->default('DEMANDEE')->index();
                $table->timestampsTz();
                $table->unique(['company_id', 'reference']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ecommerce_delivery_requests');

        if (Schema::hasTable('ecommerce_order_items')) {
            Schema::table('ecommerce_order_items', function (Blueprint $table): void {
                foreach (['product_type', 'rental_period'] as $column) {
                    if (Schema::hasColumn('ecommerce_order_items', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('ecommerce_products')) {
            Schema::table('ecommerce_products', function (Blueprint $table): void {
                foreach (['product_type', 'rental_period'] as $column) {
                    if (Schema::hasColumn('ecommerce_products', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};