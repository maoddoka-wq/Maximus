<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ecommerce_categories')) {
            Schema::create('ecommerce_categories', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('name');
                $table->string('slug');
                $table->text('description')->default('');
                $table->boolean('is_active')->default(true);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestampsTz();
                $table->unique(['company_id', 'slug']);
            });
        }

        if (Schema::hasTable('ecommerce_products') && ! Schema::hasColumn('ecommerce_products', 'category_id')) {
            Schema::table('ecommerce_products', function (Blueprint $table): void {
                $table->string('category_id')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ecommerce_products') && Schema::hasColumn('ecommerce_products', 'category_id')) {
            Schema::table('ecommerce_products', function (Blueprint $table): void {
                $table->dropColumn('category_id');
            });
        }

        Schema::dropIfExists('ecommerce_categories');
    }
};