<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('maximus_company_subscription_prices')) {
            Schema::create('maximus_company_subscription_prices', function (Blueprint $table): void {
                $table->string('company_id')->primary();
                $table->unsignedBigInteger('custom_monthly_amount')->nullable();
                $table->string('updated_by')->nullable();
                $table->timestampsTz();
            });
        }

        if (! Schema::hasTable('maximus_subscription_payments')) {
            Schema::create('maximus_subscription_payments', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('reference')->unique();
                $table->unsignedBigInteger('amount');
                $table->string('currency', 3)->default('XOF');
                $table->string('status', 20)->default('PENDING')->index();
                $table->string('provider_charge_id')->nullable()->unique();
                $table->text('checkout_url')->nullable();
                $table->string('provider', 30)->default('WAVE');
                $table->text('failure_reason')->nullable();
                $table->timestampTz('paid_at')->nullable();
                $table->timestampsTz();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_subscription_payments');
        Schema::dropIfExists('maximus_company_subscription_prices');
    }
};