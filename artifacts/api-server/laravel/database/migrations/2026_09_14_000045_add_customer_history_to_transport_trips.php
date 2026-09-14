<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('transport_trips') && ! Schema::hasColumn('transport_trips', 'customer_id')) {
            Schema::table('transport_trips', function (Blueprint $table): void {
                $table->string('customer_id')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('transport_trips') && Schema::hasColumn('transport_trips', 'customer_id')) {
            Schema::table('transport_trips', function (Blueprint $table): void {
                $table->dropColumn('customer_id');
            });
        }
    }
};