<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ecommerce_orders') && ! Schema::hasColumn('ecommerce_orders', 'currency')) {
            Schema::table('ecommerce_orders', function (Blueprint $table): void {
                $table->string('currency', 3)->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ecommerce_orders') && Schema::hasColumn('ecommerce_orders', 'currency')) {
            Schema::table('ecommerce_orders', function (Blueprint $table): void {
                $table->dropColumn('currency');
            });
        }
    }
};