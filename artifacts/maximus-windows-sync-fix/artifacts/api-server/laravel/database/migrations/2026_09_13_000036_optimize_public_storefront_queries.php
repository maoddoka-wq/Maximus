<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ecommerce_products', function (Blueprint $table): void {
            $table->index(
                ['company_id', 'status', 'featured', 'name'],
                'ecommerce_products_public_storefront_idx',
            );
        });

        Schema::table('ecommerce_rentals', function (Blueprint $table): void {
            $table->index(
                ['company_id', 'status', 'availability', 'name'],
                'ecommerce_rentals_public_storefront_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::table('ecommerce_rentals', function (Blueprint $table): void {
            $table->dropIndex('ecommerce_rentals_public_storefront_idx');
        });

        Schema::table('ecommerce_products', function (Blueprint $table): void {
            $table->dropIndex('ecommerce_products_public_storefront_idx');
        });
    }
};