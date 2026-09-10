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
                if (! Schema::hasColumn('ecommerce_products', 'fulfillment_type')) {
                    $table->string('fulfillment_type', 16)->default('PHYSICAL')->index();
                }
                if (! Schema::hasColumn('ecommerce_products', 'digital_file_path')) {
                    $table->text('digital_file_path')->nullable();
                }
                if (! Schema::hasColumn('ecommerce_products', 'digital_file_name')) {
                    $table->text('digital_file_name')->nullable();
                }
                if (! Schema::hasColumn('ecommerce_products', 'digital_file_mime')) {
                    $table->string('digital_file_mime', 160)->nullable();
                }
                if (! Schema::hasColumn('ecommerce_products', 'digital_file_size')) {
                    $table->unsignedBigInteger('digital_file_size')->nullable();
                }
            });
        }

        if (Schema::hasTable('ecommerce_order_items')) {
            Schema::table('ecommerce_order_items', function (Blueprint $table): void {
                if (! Schema::hasColumn('ecommerce_order_items', 'fulfillment_type')) {
                    $table->string('fulfillment_type', 16)->default('PHYSICAL')->index();
                }
                if (! Schema::hasColumn('ecommerce_order_items', 'digital_file_name')) {
                    $table->text('digital_file_name')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ecommerce_order_items')) {
            Schema::table('ecommerce_order_items', function (Blueprint $table): void {
                foreach (['fulfillment_type', 'digital_file_name'] as $column) {
                    if (Schema::hasColumn('ecommerce_order_items', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('ecommerce_products')) {
            Schema::table('ecommerce_products', function (Blueprint $table): void {
                foreach (['fulfillment_type', 'digital_file_path', 'digital_file_name', 'digital_file_mime', 'digital_file_size'] as $column) {
                    if (Schema::hasColumn('ecommerce_products', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};