<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ecommerce_customers')) {
            Schema::create('ecommerce_customers', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('email');
                $table->text('name');
                $table->text('phone')->default('');
                $table->text('password_hash');
                $table->text('status')->default('ACTIF');
                $table->timestampsTz();
                $table->unique(['company_id', 'email']);
            });
        }

        if (! Schema::hasTable('ecommerce_customer_sessions')) {
            Schema::create('ecommerce_customer_sessions', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('customer_id')->index();
                $table->string('company_id')->index();
                $table->string('token_hash')->unique();
                $table->timestampTz('expires_at')->index();
                $table->timestampTz('created_at')->nullable();
            });
        }

        if (! Schema::hasTable('ecommerce_customer_addresses')) {
            Schema::create('ecommerce_customer_addresses', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('customer_id')->index();
                $table->string('company_id')->index();
                $table->text('label');
                $table->text('recipient_name');
                $table->text('phone');
                $table->text('line1');
                $table->text('line2')->default('');
                $table->text('city');
                $table->text('region')->default('');
                $table->text('postal_code')->default('');
                $table->text('country')->default('Sénégal');
                $table->boolean('is_default')->default(false);
                $table->timestampsTz();
            });
        }

        if (! Schema::hasTable('ecommerce_customer_favorites')) {
            Schema::create('ecommerce_customer_favorites', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('customer_id')->index();
                $table->string('company_id')->index();
                $table->string('product_id')->index();
                $table->timestampTz('created_at')->nullable();
                $table->unique(['customer_id', 'product_id']);
            });
        }

        if (! Schema::hasTable('ecommerce_customer_cart_items')) {
            Schema::create('ecommerce_customer_cart_items', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('customer_id')->index();
                $table->string('company_id')->index();
                $table->string('product_id')->index();
                $table->unsignedInteger('quantity')->default(1);
                $table->timestampsTz();
                $table->unique(['customer_id', 'product_id']);
            });
        }

        if (Schema::hasTable('ecommerce_orders') && ! Schema::hasColumn('ecommerce_orders', 'customer_id')) {
            Schema::table('ecommerce_orders', function (Blueprint $table): void {
                $table->string('customer_id')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ecommerce_orders') && Schema::hasColumn('ecommerce_orders', 'customer_id')) {
            Schema::table('ecommerce_orders', function (Blueprint $table): void {
                $table->dropColumn('customer_id');
            });
        }
        Schema::dropIfExists('ecommerce_customer_cart_items');
        Schema::dropIfExists('ecommerce_customer_favorites');
        Schema::dropIfExists('ecommerce_customer_addresses');
        Schema::dropIfExists('ecommerce_customer_sessions');
        Schema::dropIfExists('ecommerce_customers');
    }
};