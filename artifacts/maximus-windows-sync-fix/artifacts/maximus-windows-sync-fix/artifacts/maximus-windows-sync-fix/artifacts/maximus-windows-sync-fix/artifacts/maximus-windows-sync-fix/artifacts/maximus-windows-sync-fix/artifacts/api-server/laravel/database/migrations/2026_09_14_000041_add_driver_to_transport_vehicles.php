<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('transport_vehicles') && ! Schema::hasColumn('transport_vehicles', 'driver_id')) {
            Schema::table('transport_vehicles', function (Blueprint $table): void {
                $table->string('driver_id')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('transport_vehicles') && Schema::hasColumn('transport_vehicles', 'driver_id')) {
            Schema::table('transport_vehicles', function (Blueprint $table): void {
                $table->dropColumn('driver_id');
            });
        }
    }
};