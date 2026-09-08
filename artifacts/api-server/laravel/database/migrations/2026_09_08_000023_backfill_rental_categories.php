<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('ecommerce_rentals')
            ->where(function ($query): void {
                $query->whereNull('category')->orWhere('category', '');
            })
            ->update(['category' => 'Général']);

        DB::table('ecommerce_products')
            ->where('product_type', 'RENTAL')
            ->where(function ($query): void {
                $query->whereNull('category')->orWhere('category', '');
            })
            ->update(['category' => 'Général']);
    }

    public function down(): void
    {
        // Category backfills are intentionally not reverted.
    }
};