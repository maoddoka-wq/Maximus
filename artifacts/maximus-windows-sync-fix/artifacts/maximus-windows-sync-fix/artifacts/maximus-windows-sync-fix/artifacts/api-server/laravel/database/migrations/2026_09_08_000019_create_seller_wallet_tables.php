<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ecommerce_orders')) {
            Schema::table('ecommerce_orders', function (Blueprint $table): void {
                if (! Schema::hasColumn('ecommerce_orders', 'payment_status')) {
                    $table->string('payment_status', 24)->default('UNPAID')->index();
                }
                if (! Schema::hasColumn('ecommerce_orders', 'payment_charge_id')) {
                    $table->string('payment_charge_id')->nullable()->unique();
                }
                if (! Schema::hasColumn('ecommerce_orders', 'payment_checkout_url')) {
                    $table->text('payment_checkout_url')->nullable();
                }
                if (! Schema::hasColumn('ecommerce_orders', 'payment_failure_reason')) {
                    $table->text('payment_failure_reason')->default('');
                }
                if (! Schema::hasColumn('ecommerce_orders', 'paid_at')) {
                    $table->timestampTz('paid_at')->nullable();
                }
                if (! Schema::hasColumn('ecommerce_orders', 'funds_available_at')) {
                    $table->timestampTz('funds_available_at')->nullable();
                }
                if (! Schema::hasColumn('ecommerce_orders', 'stock_restored_at')) {
                    $table->timestampTz('stock_restored_at')->nullable();
                }
            });
        }

        if (! Schema::hasTable('seller_wallets')) {
            Schema::create('seller_wallets', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->unique();
                $table->string('currency', 3)->default('XOF');
                $table->bigInteger('pending_balance')->default(0);
                $table->bigInteger('available_balance')->default(0);
                $table->bigInteger('reserved_balance')->default(0);
                $table->bigInteger('total_credited')->default(0);
                $table->string('payout_provider', 32)->default('WAVE');
                $table->string('payout_mobile', 40)->default('');
                $table->string('payout_name', 120)->default('');
                $table->timestampsTz();
            });
        }

        if (! Schema::hasTable('seller_wallet_ledger')) {
            Schema::create('seller_wallet_ledger', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('wallet_id')->index();
                $table->string('company_id')->index();
                $table->string('type', 40);
                $table->string('bucket', 16);
                $table->string('direction', 8);
                $table->bigInteger('amount');
                $table->string('reference_type', 40)->nullable();
                $table->string('reference_id')->nullable();
                $table->string('idempotency_key')->nullable();
                $table->timestampTz('available_at')->nullable();
                $table->timestampTz('released_at')->nullable();
                $table->timestampTz('reversed_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestampsTz();
                $table->unique(['company_id', 'idempotency_key'], 'seller_wallet_ledger_idempotency_unique');
            });
        }

        if (! Schema::hasTable('seller_withdrawals')) {
            Schema::create('seller_withdrawals', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('wallet_id')->index();
                $table->string('company_id')->index();
                $table->bigInteger('amount');
                $table->bigInteger('fee')->default(0);
                $table->bigInteger('net_amount');
                $table->string('provider', 32)->default('WAVE');
                $table->string('mobile', 40);
                $table->string('beneficiary_name', 120);
                $table->string('status', 24)->default('PROCESSING')->index();
                $table->string('provider_payout_id')->nullable();
                $table->string('idempotency_key')->nullable();
                $table->text('failure_reason')->default('');
                $table->timestampTz('requested_at');
                $table->timestampTz('processed_at')->nullable();
                $table->timestampsTz();
                $table->unique(['company_id', 'idempotency_key'], 'seller_withdrawals_idempotency_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_withdrawals');
        Schema::dropIfExists('seller_wallet_ledger');
        Schema::dropIfExists('seller_wallets');

        if (Schema::hasTable('ecommerce_orders')) {
            Schema::table('ecommerce_orders', function (Blueprint $table): void {
                foreach (['payment_status', 'payment_charge_id', 'payment_checkout_url', 'payment_failure_reason', 'paid_at', 'funds_available_at', 'stock_restored_at'] as $column) {
                    if (Schema::hasColumn('ecommerce_orders', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};