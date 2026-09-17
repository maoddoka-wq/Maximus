<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_beneficiaries')) {
            Schema::create('payroll_beneficiaries', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('employee_id')->nullable()->index();
                $table->string('full_name', 160);
                $table->string('mobile', 40);
                $table->text('account_number');
                $table->string('provider', 32)->default('WAVE');
                $table->bigInteger('monthly_salary');
                $table->unsignedSmallInteger('payment_day')->default(28);
                $table->boolean('active')->default(true);
                $table->timestampsTz();
                $table->index(['company_id', 'active']);
            });
        }

        if (! Schema::hasTable('payroll_wallets')) {
            Schema::create('payroll_wallets', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->unique();
                $table->string('currency', 3)->default('XOF');
                $table->bigInteger('available_balance')->default(0);
                $table->bigInteger('reserved_balance')->default(0);
                $table->bigInteger('total_funded')->default(0);
                $table->timestampsTz();
            });
        }

        if (! Schema::hasTable('payroll_wallet_ledger')) {
            Schema::create('payroll_wallet_ledger', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('wallet_id')->index();
                $table->string('company_id')->index();
                $table->string('type', 40);
                $table->string('direction', 8);
                $table->bigInteger('amount');
                $table->string('reference_type', 40)->nullable();
                $table->string('reference_id')->nullable();
                $table->string('idempotency_key')->nullable();
                $table->json('metadata')->nullable();
                $table->timestampsTz();
                $table->unique(['company_id', 'idempotency_key'], 'payroll_ledger_idempotency_unique');
            });
        }

        if (! Schema::hasTable('payroll_topups')) {
            Schema::create('payroll_topups', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('wallet_id')->index();
                $table->bigInteger('amount');
                $table->string('status', 24)->default('PENDING')->index();
                $table->string('provider', 32)->default('WAVE');
                $table->string('provider_charge_id')->nullable()->unique();
                $table->text('checkout_url')->nullable();
                $table->string('idempotency_key')->nullable();
                $table->text('failure_reason')->default('');
                $table->timestampTz('confirmed_at')->nullable();
                $table->timestampsTz();
                $table->unique(['company_id', 'idempotency_key'], 'payroll_topups_idempotency_unique');
            });
        }

        if (! Schema::hasTable('payroll_batches')) {
            Schema::create('payroll_batches', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('period', 32);
                $table->date('payment_date');
                $table->bigInteger('total_amount')->default(0);
                $table->string('status', 32)->default('DRAFT')->index();
                $table->string('created_by', 160);
                $table->string('approved_by', 160)->nullable();
                $table->timestampTz('approved_at')->nullable();
                $table->timestampTz('processed_at')->nullable();
                $table->timestampsTz();
            });
        }

        if (! Schema::hasTable('payroll_batch_items')) {
            Schema::create('payroll_batch_items', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('batch_id')->index();
                $table->string('company_id')->index();
                $table->string('beneficiary_id')->index();
                $table->string('beneficiary_name', 160);
                $table->string('mobile', 40);
                $table->text('account_number');
                $table->string('provider', 32)->default('WAVE');
                $table->bigInteger('amount');
                $table->string('status', 24)->default('PENDING')->index();
                $table->string('provider_payout_id')->nullable();
                $table->string('idempotency_key')->unique();
                $table->text('failure_reason')->default('');
                $table->timestampTz('processed_at')->nullable();
                $table->timestampsTz();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_batch_items');
        Schema::dropIfExists('payroll_batches');
        Schema::dropIfExists('payroll_topups');
        Schema::dropIfExists('payroll_wallet_ledger');
        Schema::dropIfExists('payroll_wallets');
        Schema::dropIfExists('payroll_beneficiaries');
    }
};