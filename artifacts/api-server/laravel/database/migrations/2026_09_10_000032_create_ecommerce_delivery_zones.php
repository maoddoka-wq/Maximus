<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ecommerce_delivery_zones')) {
            Schema::create('ecommerce_delivery_zones', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('name', 120);
                $table->text('description')->default('');
                $table->unsignedInteger('fee')->default(0);
                $table->unsignedInteger('estimated_minutes')->default(0);
                $table->boolean('is_active')->default(true)->index();
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestampsTz();
                $table->unique(['company_id', 'name']);
            });
        }

        if (Schema::hasTable('ecommerce_delivery_requests')) {
            Schema::table('ecommerce_delivery_requests', function (Blueprint $table): void {
                if (! Schema::hasColumn('ecommerce_delivery_requests', 'delivery_zone_id')) {
                    $table->string('delivery_zone_id')->nullable()->index();
                }
                if (! Schema::hasColumn('ecommerce_delivery_requests', 'delivery_zone_name')) {
                    $table->string('delivery_zone_name', 120)->nullable();
                }
                if (! Schema::hasColumn('ecommerce_delivery_requests', 'delivery_zone_fee')) {
                    $table->unsignedInteger('delivery_zone_fee')->default(0);
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ecommerce_delivery_requests')) {
            Schema::table('ecommerce_delivery_requests', function (Blueprint $table): void {
                foreach (['delivery_zone_id', 'delivery_zone_name', 'delivery_zone_fee'] as $column) {
                    if (Schema::hasColumn('ecommerce_delivery_requests', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        Schema::dropIfExists('ecommerce_delivery_zones');
    }
};