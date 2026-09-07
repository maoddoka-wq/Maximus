<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payments')) {
            Schema::create('payments', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('public_reference')->unique();
                $table->string('tenant_id')->index();
                $table->string('customer_id')->nullable()->index();
                $table->string('seller_id')->nullable()->index();
                $table->string('source_module')->index();
                $table->string('source_type');
                $table->string('source_id')->index();
                $table->string('provider')->default('diamanopay');
                $table->string('provider_transaction_id')->nullable()->index();
                $table->bigInteger('amount');
                $table->string('currency', 3);
                $table->string('payment_method')->nullable();
                $table->string('status')->default('PENDING')->index();
                $table->text('description')->default('');
                $table->json('metadata')->nullable();
                $table->string('idempotency_key')->nullable();
                $table->string('request_id')->nullable()->index();
                $table->timestampTz('initiated_at')->nullable();
                $table->timestampTz('paid_at')->nullable();
                $table->timestampTz('failed_at')->nullable();
                $table->timestampsTz();
                $table->unique(['tenant_id', 'source_type', 'source_id', 'idempotency_key'], 'payments_source_idempotency_unique');
            });
        }

        if (! Schema::hasTable('payment_events')) {
            Schema::create('payment_events', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('payment_id')->nullable()->index();
                $table->string('provider')->index();
                $table->string('event_type');
                $table->string('provider_event_id')->nullable();
                $table->json('payload');
                $table->text('signature')->nullable();
                $table->string('processing_status')->default('RECEIVED')->index();
                $table->timestampTz('processed_at')->nullable();
                $table->text('error_message')->nullable();
                $table->timestampsTz();
                $table->unique(['provider', 'provider_event_id'], 'payment_events_provider_event_unique');
            });
        }

        if (! Schema::hasTable('wallets')) {
            Schema::create('wallets', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('tenant_id')->index();
                $table->string('owner_type');
                $table->string('owner_id')->index();
                $table->string('currency', 3);
                $table->bigInteger('available_balance')->default(0);
                $table->bigInteger('pending_balance')->default(0);
                $table->bigInteger('withdrawn_balance')->default(0);
                $table->string('status')->default('ACTIVE');
                $table->timestampsTz();
                $table->unique(['tenant_id', 'owner_type', 'owner_id', 'currency'], 'wallets_owner_currency_unique');
            });
        }

        if (! Schema::hasTable('ledger_entries')) {
            Schema::create('ledger_entries', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('tenant_id')->index();
                $table->string('wallet_id')->index();
                $table->string('payment_id')->nullable()->index();
                $table->string('transaction_id')->nullable()->index();
                $table->string('type')->index();
                $table->string('direction');
                $table->bigInteger('amount');
                $table->string('currency', 3);
                $table->string('reference')->index();
                $table->text('description')->default('');
                $table->string('status')->default('POSTED')->index();
                $table->json('metadata')->nullable();
                $table->timestampsTz();
                $table->unique(['tenant_id', 'reference'], 'ledger_entries_tenant_reference_unique');
            });
        }

        if (! Schema::hasTable('commission_rules')) {
            Schema::create('commission_rules', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('tenant_id')->nullable()->index();
                $table->string('source_module')->nullable()->index();
                $table->string('name');
                $table->string('calculation_type')->default('PERCENTAGE');
                $table->decimal('percentage', 8, 4)->default(0);
                $table->bigInteger('fixed_amount')->default(0);
                $table->string('currency', 3)->default('XOF');
                $table->boolean('is_active')->default(true);
                $table->unsignedInteger('priority')->default(0);
                $table->timestampsTz();
            });
        }

        if (! Schema::hasTable('commissions')) {
            Schema::create('commissions', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('tenant_id')->index();
                $table->string('payment_id')->index();
                $table->string('seller_id')->nullable()->index();
                $table->string('rule_id')->nullable()->index();
                $table->bigInteger('gross_amount');
                $table->bigInteger('commission_amount');
                $table->string('currency', 3);
                $table->string('status')->default('POSTED')->index();
                $table->json('metadata')->nullable();
                $table->timestampsTz();
                $table->unique(['tenant_id', 'payment_id'], 'commissions_tenant_payment_unique');
            });
        }

        if (! Schema::hasTable('payout_accounts')) {
            Schema::create('payout_accounts', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('tenant_id')->index();
                $table->string('seller_id')->index();
                $table->string('provider')->default('diamanopay');
                $table->string('account_type');
                $table->string('operator')->nullable();
                $table->text('account_number_encrypted');
                $table->text('beneficiary_name');
                $table->string('country', 2);
                $table->string('status')->default('PENDING_VERIFICATION');
                $table->timestampTz('verified_at')->nullable();
                $table->timestampsTz();
            });
        }

        if (! Schema::hasTable('withdrawals')) {
            Schema::create('withdrawals', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('tenant_id')->index();
                $table->string('seller_id')->index();
                $table->string('wallet_id')->index();
                $table->string('payout_account_id')->index();
                $table->bigInteger('amount');
                $table->bigInteger('fees')->default(0);
                $table->bigInteger('net_amount');
                $table->string('currency', 3);
                $table->string('provider')->default('diamanopay');
                $table->string('provider_reference')->nullable()->index();
                $table->string('status')->default('REQUESTED')->index();
                $table->string('idempotency_key')->nullable();
                $table->text('failure_reason')->nullable();
                $table->timestampTz('requested_at')->nullable();
                $table->timestampTz('processed_at')->nullable();
                $table->timestampsTz();
                $table->unique(['tenant_id', 'seller_id', 'idempotency_key'], 'withdrawals_idempotency_unique');
            });
        }

        if (! Schema::hasTable('refunds')) {
            Schema::create('refunds', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('tenant_id')->index();
                $table->string('payment_id')->index();
                $table->bigInteger('amount');
                $table->string('refund_type');
                $table->text('reason')->default('');
                $table->string('provider_reference')->nullable()->index();
                $table->string('status')->default('REQUESTED')->index();
                $table->string('idempotency_key')->nullable();
                $table->json('metadata')->nullable();
                $table->timestampTz('completed_at')->nullable();
                $table->timestampsTz();
                $table->unique(['tenant_id', 'payment_id', 'idempotency_key'], 'refunds_idempotency_unique');
            });
        }

        if (! Schema::hasTable('payment_reconciliations')) {
            Schema::create('payment_reconciliations', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('tenant_id')->index();
                $table->string('payment_id')->nullable()->index();
                $table->string('provider')->index();
                $table->string('provider_transaction_id')->nullable()->index();
                $table->string('status')->default('OPEN')->index();
                $table->string('mismatch_type')->nullable();
                $table->json('details')->nullable();
                $table->timestampTz('resolved_at')->nullable();
                $table->timestampsTz();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_reconciliations');
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('withdrawals');
        Schema::dropIfExists('payout_accounts');
        Schema::dropIfExists('commissions');
        Schema::dropIfExists('commission_rules');
        Schema::dropIfExists('ledger_entries');
        Schema::dropIfExists('wallets');
        Schema::dropIfExists('payment_events');
        Schema::dropIfExists('payments');
    }
};