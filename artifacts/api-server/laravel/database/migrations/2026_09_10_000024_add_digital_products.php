<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ecommerce_products')) {
            return;
        }

        Schema::table('ecommerce_products', function (Blueprint $table): void {
            if (! Schema::hasColumn('ecommerce_products', 'digital_file_name')) {
                $table->text('digital_file_name')->nullable();
            }
            if (! Schema::hasColumn('ecommerce_products', 'digital_file_size')) {
                $table->integer('digital_file_size')->nullable();
            }
            if (! Schema::hasColumn('ecommerce_products', 'digital_file_mime')) {
                $table->string('digital_file_mime', 160)->nullable();
            }
            if (! Schema::hasColumn('ecommerce_products', 'digital_file_data')) {
                $table->text('digital_file_data')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ecommerce_products')) {
            return;
        }

        Schema::table('ecommerce_products', function (Blueprint $table): void {
            foreach (['digital_file_name', 'digital_file_size', 'digital_file_mime', 'digital_file_data'] as $column) {
                if (Schema::hasColumn('ecommerce_products', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};