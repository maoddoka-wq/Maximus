<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ecommerce_products', function (Blueprint $table): void {
            if (! Schema::hasColumn('ecommerce_products', 'image_data')) {
                $table->text('image_data')->nullable();
            }
            if (! Schema::hasColumn('ecommerce_products', 'image_mime')) {
                $table->string('image_mime', 100)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('ecommerce_products', function (Blueprint $table): void {
            if (Schema::hasColumn('ecommerce_products', 'image_data')) {
                $table->dropColumn('image_data');
            }
            if (Schema::hasColumn('ecommerce_products', 'image_mime')) {
                $table->dropColumn('image_mime');
            }
        });
    }
};