<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasColumn('ecommerce_stores', 'homepage_enabled')) {
            Schema::table('ecommerce_stores', function (Blueprint $table): void {
                $table->boolean('homepage_enabled')->default(true);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('ecommerce_stores', 'homepage_enabled')) {
            Schema::table('ecommerce_stores', function (Blueprint $table): void {
                $table->dropColumn('homepage_enabled');
            });
        }
    }
};