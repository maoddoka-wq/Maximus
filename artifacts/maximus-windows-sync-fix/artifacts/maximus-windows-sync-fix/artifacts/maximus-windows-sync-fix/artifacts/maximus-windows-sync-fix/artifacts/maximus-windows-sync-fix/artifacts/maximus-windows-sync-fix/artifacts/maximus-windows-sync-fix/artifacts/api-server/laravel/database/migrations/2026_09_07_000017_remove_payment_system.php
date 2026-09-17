<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach ([
            'payment_reconciliations',
            'refunds',
            'withdrawals',
            'payout_accounts',
            'commissions',
            'commission_rules',
            'ledger_entries',
            'wallets',
            'payment_events',
            'payments',
        ] as $tableName) {
            Schema::dropIfExists($tableName);
        }

        if (Schema::hasTable('ecommerce_orders')) {
            foreach ([
                'ecommerce_orders_payment_id_index',
                'ecommerce_orders_payment_status_index',
            ] as $index) {
                DB::statement('DROP INDEX IF EXISTS "'.$index.'"');
            }
            Schema::table('ecommerce_orders', function (Blueprint $table): void {
                if (Schema::hasColumn('ecommerce_orders', 'payment_id')) {
                    $table->dropColumn('payment_id');
                }
                if (Schema::hasColumn('ecommerce_orders', 'payment_status')) {
                    $table->dropColumn('payment_status');
                }
            });
        }
    }

    public function down(): void
    {
        // The payment system was intentionally removed and is not restored by rollback.
    }
};