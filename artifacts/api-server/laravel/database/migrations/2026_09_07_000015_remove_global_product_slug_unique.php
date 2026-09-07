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
                $table->dropUnique('ecommerce_products_public_slug_unique');
            });
        }
    }

    public function down(): void
    {
        // Existing tenants may legitimately share a public slug, so this is not recreated.
    }
};