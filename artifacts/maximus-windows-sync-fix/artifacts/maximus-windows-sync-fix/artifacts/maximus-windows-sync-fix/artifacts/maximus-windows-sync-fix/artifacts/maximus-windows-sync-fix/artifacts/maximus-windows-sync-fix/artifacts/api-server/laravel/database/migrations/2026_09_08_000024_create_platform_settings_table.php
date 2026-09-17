<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('maximus_platform_settings')) {
            return;
        }

        Schema::create('maximus_platform_settings', function (Blueprint $table): void {
            $table->string('key')->primary();
            $table->json('value')->default('{}');
            $table->timestampsTz();
        });

        DB::table('maximus_platform_settings')->insert([
            'key' => 'seller_wallet_maturity',
            'value' => json_encode(['mode' => 'AUTOMATIC', 'value' => null], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_platform_settings');
    }
};
