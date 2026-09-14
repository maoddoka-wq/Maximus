<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('seller_wallet_ledger')) {
            Schema::table('seller_wallet_ledger', function (Blueprint $table): void {
                $table->index(
                    ['company_id', 'reference_id', 'type'],
                    'seller_wallet_ledger_reconcile_lookup',
                );
            });
        }

        if (Schema::hasTable('maximus_wallet_ledger')) {
            Schema::table('maximus_wallet_ledger', function (Blueprint $table): void {
                $table->index(
                    ['reference_id', 'type'],
                    'maximus_wallet_ledger_reconcile_lookup',
                );
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('seller_wallet_ledger')) {
            Schema::table('seller_wallet_ledger', function (Blueprint $table): void {
                $table->dropIndex('seller_wallet_ledger_reconcile_lookup');
            });
        }

        if (Schema::hasTable('maximus_wallet_ledger')) {
            Schema::table('maximus_wallet_ledger', function (Blueprint $table): void {
                $table->dropIndex('maximus_wallet_ledger_reconcile_lookup');
            });
        }
    }
};