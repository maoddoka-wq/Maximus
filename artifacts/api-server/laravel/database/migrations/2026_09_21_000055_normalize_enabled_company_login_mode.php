<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('companies')
            ->where('login_custom_allowed', true)
            ->where(function ($query): void {
                $query->whereNull('login_mode')
                    ->orWhere('login_mode', 'MAXIMUS');
            })
            ->update([
                'login_mode' => 'CUSTOM',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Do not silently disable a company's branded login during a rollback.
    }
};