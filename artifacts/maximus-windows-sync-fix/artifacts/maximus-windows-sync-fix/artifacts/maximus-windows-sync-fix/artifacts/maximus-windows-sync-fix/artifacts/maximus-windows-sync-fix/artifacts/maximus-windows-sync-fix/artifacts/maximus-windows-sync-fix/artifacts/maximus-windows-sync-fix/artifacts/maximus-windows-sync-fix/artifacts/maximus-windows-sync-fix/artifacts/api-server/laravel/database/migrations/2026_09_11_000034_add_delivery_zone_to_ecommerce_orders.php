<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ecommerce_orders')) {
            return;
        }

        Schema::table('ecommerce_orders', function (Blueprint $table): void {
            if (! Schema::hasColumn('ecommerce_orders', 'delivery_zone_id')) {
                $table->string('delivery_zone_id')->nullable()->index();
            }
            if (! Schema::hasColumn('ecommerce_orders', 'delivery_zone_name')) {
                $table->string('delivery_zone_name', 120)->nullable();
            }
            if (! Schema::hasColumn('ecommerce_orders', 'delivery_zone_fee')) {
                $table->unsignedInteger('delivery_zone_fee')->default(0);
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ecommerce_orders')) {
            return;
        }

        Schema::table('ecommerce_orders', function (Blueprint $table): void {
            foreach (['delivery_zone_id', 'delivery_zone_name', 'delivery_zone_fee'] as $column) {
                if (Schema::hasColumn('ecommerce_orders', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};