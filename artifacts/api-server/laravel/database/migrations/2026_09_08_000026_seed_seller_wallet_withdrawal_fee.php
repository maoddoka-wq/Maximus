<?php

use App\Services\SellerWalletFeePolicy;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('maximus_platform_settings')->where('key', SellerWalletFeePolicy::SETTING_KEY)->exists()) {
            DB::table('maximus_platform_settings')->insert([
                'key' => SellerWalletFeePolicy::SETTING_KEY,
                'value' => json_encode(['amount' => 100], JSON_THROW_ON_ERROR),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('maximus_platform_settings')->where('key', SellerWalletFeePolicy::SETTING_KEY)->delete();
    }
};