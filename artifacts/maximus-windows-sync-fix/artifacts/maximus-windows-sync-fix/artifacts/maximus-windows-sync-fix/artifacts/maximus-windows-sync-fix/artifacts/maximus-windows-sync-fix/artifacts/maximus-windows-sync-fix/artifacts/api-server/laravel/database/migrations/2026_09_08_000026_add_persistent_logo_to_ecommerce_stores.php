<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('ecommerce_stores', 'logo_data')) {
            Schema::table('ecommerce_stores', function (Blueprint $table): void {
                $table->text('logo_data')->nullable();
            });
        }

        if (! Schema::hasColumn('ecommerce_stores', 'logo_mime')) {
            Schema::table('ecommerce_stores', function (Blueprint $table): void {
                $table->string('logo_mime', 100)->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('ecommerce_stores', 'logo_mime')) {
            Schema::table('ecommerce_stores', function (Blueprint $table): void {
                $table->dropColumn('logo_mime');
            });
        }

        if (Schema::hasColumn('ecommerce_stores', 'logo_data')) {
            Schema::table('ecommerce_stores', function (Blueprint $table): void {
                $table->dropColumn('logo_data');
            });
        }
    }
};