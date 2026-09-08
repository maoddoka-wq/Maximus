<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('maximus_platform_settings')) {
            return;
        }

        DB::table('maximus_platform_settings')->insertOrIgnore([
            'key' => 'seller_wallet_maturity',
            'value' => json_encode(['mode' => 'AUTOMATIC', 'value' => null], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('maximus_platform_settings')->where('key', 'seller_wallet_maturity')->delete();
    }
};
