<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ecommerce_stores')) {
            Schema::table('ecommerce_stores', function (Blueprint $table): void {
                $table->unique('slug', 'ecommerce_stores_public_slug_unique');
            });
        }

        if (Schema::hasTable('ecommerce_products')) {
            Schema::table('ecommerce_products', function (Blueprint $table): void {
                $table->unique('slug', 'ecommerce_products_public_slug_unique');
            });
        }

        if (Schema::hasTable('ecommerce_orders') && ! Schema::hasColumn('ecommerce_orders', 'idempotency_key')) {
            Schema::table('ecommerce_orders', function (Blueprint $table): void {
                $table->string('idempotency_key')->nullable();
                $table->unique(['company_id', 'idempotency_key'], 'ecommerce_orders_idempotency_unique');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ecommerce_orders') && Schema::hasColumn('ecommerce_orders', 'idempotency_key')) {
            Schema::table('ecommerce_orders', function (Blueprint $table): void {
                $table->dropUnique('ecommerce_orders_idempotency_unique');
                $table->dropColumn('idempotency_key');
            });
        }

        if (Schema::hasTable('ecommerce_products')) {
            Schema::table('ecommerce_products', function (Blueprint $table): void {
                $table->dropUnique('ecommerce_products_public_slug_unique');
            });
        }

        if (Schema::hasTable('ecommerce_stores')) {
            Schema::table('ecommerce_stores', function (Blueprint $table): void {
                $table->dropUnique('ecommerce_stores_public_slug_unique');
            });
        }
    }
};