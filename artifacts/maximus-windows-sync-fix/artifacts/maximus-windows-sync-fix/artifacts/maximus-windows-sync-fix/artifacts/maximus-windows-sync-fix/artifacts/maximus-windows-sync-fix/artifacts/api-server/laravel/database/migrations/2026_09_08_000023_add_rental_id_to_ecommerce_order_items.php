<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ecommerce_order_items') && ! Schema::hasColumn('ecommerce_order_items', 'rental_id')) {
            Schema::table('ecommerce_order_items', function (Blueprint $table): void {
                $table->string('rental_id')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ecommerce_order_items') && Schema::hasColumn('ecommerce_order_items', 'rental_id')) {
            Schema::table('ecommerce_order_items', function (Blueprint $table): void {
                $table->dropColumn('rental_id');
            });
        }
    }
};