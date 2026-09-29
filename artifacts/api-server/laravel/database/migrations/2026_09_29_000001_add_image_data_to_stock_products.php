<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_products')) {
            return;
        }

        Schema::table('stock_products', function (Blueprint $table): void {
            if (! Schema::hasColumn('stock_products', 'image_data')) {
                $table->text('image_data')->nullable();
            }
            if (! Schema::hasColumn('stock_products', 'image_mime')) {
                $table->string('image_mime', 100)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('stock_products')) {
            return;
        }

        Schema::table('stock_products', function (Blueprint $table): void {
            $columns = [];
            if (Schema::hasColumn('stock_products', 'image_data')) {
                $columns[] = 'image_data';
            }
            if (Schema::hasColumn('stock_products', 'image_mime')) {
                $columns[] = 'image_mime';
            }
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};