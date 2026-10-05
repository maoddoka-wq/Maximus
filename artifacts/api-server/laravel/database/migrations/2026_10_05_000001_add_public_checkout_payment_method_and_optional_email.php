<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ecommerce_orders')) {
            return;
        }

        Schema::table('ecommerce_orders', function (Blueprint $table): void {
            if (Schema::hasColumn('ecommerce_orders', 'customer_email')) {
                $table->text('customer_email')->nullable()->change();
            }

            if (! Schema::hasColumn('ecommerce_orders', 'payment_method')) {
                $table->string('payment_method', 24)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ecommerce_orders')) {
            return;
        }

        if (Schema::hasColumn('ecommerce_orders', 'customer_email')) {
            DB::table('ecommerce_orders')->whereNull('customer_email')->update(['customer_email' => '']);
            Schema::table('ecommerce_orders', function (Blueprint $table): void {
                $table->text('customer_email')->nullable(false)->change();
            });
        }

        if (Schema::hasColumn('ecommerce_orders', 'payment_method')) {
            Schema::table('ecommerce_orders', function (Blueprint $table): void {
                $table->dropColumn('payment_method');
            });
        }
    }
};