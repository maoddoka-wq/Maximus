<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('transport_trips')) {
            return;
        }

        Schema::table('transport_trips', function (Blueprint $table): void {
            if (! Schema::hasColumn('transport_trips', 'route_pending')) {
                $table->boolean('route_pending')->default(false)->index();
            }
            if (! Schema::hasColumn('transport_trips', 'route_attempted_at')) {
                $table->timestampTz('route_attempted_at')->nullable();
            }
            if (! Schema::hasColumn('transport_trips', 'pickup_route_attempted_at')) {
                $table->timestampTz('pickup_route_attempted_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('transport_trips')) {
            return;
        }

        Schema::table('transport_trips', function (Blueprint $table): void {
            foreach (['route_pending', 'route_attempted_at', 'pickup_route_attempted_at'] as $column) {
                if (Schema::hasColumn('transport_trips', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};