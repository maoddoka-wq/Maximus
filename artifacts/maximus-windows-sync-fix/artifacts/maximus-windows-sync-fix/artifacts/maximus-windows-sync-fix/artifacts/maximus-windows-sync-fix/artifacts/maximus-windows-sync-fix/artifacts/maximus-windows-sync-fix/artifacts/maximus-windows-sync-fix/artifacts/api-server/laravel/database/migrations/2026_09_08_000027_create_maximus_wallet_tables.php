<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('maximus_wallets')) {
            Schema::create('maximus_wallets', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('currency', 3)->default('XOF');
                $table->bigInteger('available_balance')->default(0);
                $table->bigInteger('reserved_balance')->default(0);
                $table->bigInteger('total_credited')->default(0);
                $table->string('payout_mobile', 40)->default('');
                $table->string('payout_name', 120)->default('');
                $table->timestampsTz();
            });
        }

        if (! Schema::hasTable('maximus_wallet_ledger')) {
            Schema::create('maximus_wallet_ledger', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('wallet_id')->index();
                $table->string('type', 40);
                $table->string('direction', 8);
                $table->bigInteger('amount');
                $table->string('reference_type', 40)->nullable();
                $table->string('reference_id')->nullable();
                $table->string('idempotency_key')->unique();
                $table->json('metadata')->nullable();
                $table->timestampsTz();
            });
        }

        if (! Schema::hasTable('maximus_withdrawals')) {
            Schema::create('maximus_withdrawals', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('wallet_id')->index();
                $table->bigInteger('amount');
                $table->bigInteger('fee')->default(0);
                $table->bigInteger('net_amount');
                $table->string('provider', 32)->default('WAVE');
                $table->string('mobile', 40);
                $table->string('beneficiary_name', 120);
                $table->string('status', 24)->default('PROCESSING')->index();
                $table->string('provider_payout_id')->nullable()->index();
                $table->string('idempotency_key')->nullable()->unique();
                $table->text('failure_reason')->default('');
                $table->timestampTz('requested_at');
                $table->timestampTz('processed_at')->nullable();
                $table->timestampsTz();
            });
        }

        DB::table('maximus_wallets')->insertOrIgnore([
            'id' => 'maximus-main-wallet',
            'currency' => 'XOF',
            'available_balance' => 0,
            'reserved_balance' => 0,
            'total_credited' => 0,
            'payout_mobile' => '',
            'payout_name' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('maximus_platform_settings')->insertOrIgnore([
            'key' => 'ecommerce_commission',
            'value' => json_encode(['providerPercent' => 3, 'maximusPercent' => 2], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('maximus_platform_settings')->where('key', 'ecommerce_commission')->delete();
        Schema::dropIfExists('maximus_withdrawals');
        Schema::dropIfExists('maximus_wallet_ledger');
        Schema::dropIfExists('maximus_wallets');
    }
};