<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->setMaximusPercent(0);
    }

    public function down(): void
    {
        $this->setMaximusPercent(2);
    }

    private function setMaximusPercent(int $percent): void
    {
        if (! Schema::hasTable('maximus_platform_settings')) {
            return;
        }

        $row = DB::table('maximus_platform_settings')->where('key', 'ecommerce_commission')->first();
        $stored = is_string($row?->value)
            ? json_decode($row->value, true)
            : ($row?->value ?? []);
        $providerPercent = is_array($stored) && isset($stored['providerPercent']) && is_numeric($stored['providerPercent'])
            ? (int) $stored['providerPercent']
            : 3;
        if ($providerPercent < 0 || $providerPercent > 100) {
            $providerPercent = 3;
        }

        $values = [
            'value' => json_encode([
                'providerPercent' => $providerPercent,
                'maximusPercent' => $percent,
            ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'updated_at' => now(),
        ];

        if ($row) {
            DB::table('maximus_platform_settings')
                ->where('key', 'ecommerce_commission')
                ->update($values);

            return;
        }

        DB::table('maximus_platform_settings')->insert([
            'key' => 'ecommerce_commission',
            ...$values,
            'created_at' => now(),
        ]);
    }
};