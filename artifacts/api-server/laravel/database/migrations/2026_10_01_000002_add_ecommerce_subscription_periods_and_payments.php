<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maximus_company_ecommerce_prices', function (Blueprint $table): void {
            $table->timestampTz('paid_through_at')->nullable();
        });

        Schema::create('maximus_company_ecommerce_subscription_payments', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('company_id')->index();
            $table->string('reference')->unique();
            $table->unsignedBigInteger('amount');
            $table->string('currency', 3)->default('XOF');
            $table->string('provider', 32);
            $table->string('status', 24)->index();
            $table->string('idempotency_key')->unique();
            $table->string('provider_charge_id')->nullable()->unique();
            $table->text('checkout_url')->nullable();
            $table->timestampTz('paid_at')->nullable();
            $table->timestampTz('period_started_at')->nullable();
            $table->timestampTz('period_ends_at')->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_company_ecommerce_subscription_payments');

        Schema::table('maximus_company_ecommerce_prices', function (Blueprint $table): void {
            $table->dropColumn('paid_through_at');
        });
    }
};