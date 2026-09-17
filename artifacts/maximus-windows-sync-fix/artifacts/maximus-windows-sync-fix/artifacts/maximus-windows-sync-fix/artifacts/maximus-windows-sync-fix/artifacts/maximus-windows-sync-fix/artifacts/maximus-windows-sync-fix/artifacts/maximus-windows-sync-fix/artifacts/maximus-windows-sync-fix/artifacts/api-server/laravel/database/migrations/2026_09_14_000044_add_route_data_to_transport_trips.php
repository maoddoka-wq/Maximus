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
            if (! Schema::hasColumn('transport_trips', 'destination_latitude')) {
                $table->decimal('destination_latitude', 10, 7)->nullable();
            }
            if (! Schema::hasColumn('transport_trips', 'destination_longitude')) {
                $table->decimal('destination_longitude', 10, 7)->nullable();
            }
            if (! Schema::hasColumn('transport_trips', 'route_distance_km')) {
                $table->decimal('route_distance_km', 8, 2)->nullable();
            }
            if (! Schema::hasColumn('transport_trips', 'route_duration_minutes')) {
                $table->unsignedInteger('route_duration_minutes')->nullable();
            }
            if (! Schema::hasColumn('transport_trips', 'route_geometry')) {
                $table->text('route_geometry')->nullable();
            }
            if (! Schema::hasColumn('transport_trips', 'pickup_route_distance_km')) {
                $table->decimal('pickup_route_distance_km', 8, 2)->nullable();
            }
            if (! Schema::hasColumn('transport_trips', 'pickup_eta_minutes')) {
                $table->unsignedInteger('pickup_eta_minutes')->nullable();
            }
            if (! Schema::hasColumn('transport_trips', 'pickup_route_geometry')) {
                $table->text('pickup_route_geometry')->nullable();
            }
            if (! Schema::hasColumn('transport_trips', 'pickup_route_updated_at')) {
                $table->timestampTz('pickup_route_updated_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('transport_trips')) {
            return;
        }

        Schema::table('transport_trips', function (Blueprint $table): void {
            foreach ([
                'destination_latitude',
                'destination_longitude',
                'route_distance_km',
                'route_duration_minutes',
                'route_geometry',
                'pickup_route_distance_km',
                'pickup_eta_minutes',
                'pickup_route_geometry',
                'pickup_route_updated_at',
            ] as $column) {
                if (Schema::hasColumn('transport_trips', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};