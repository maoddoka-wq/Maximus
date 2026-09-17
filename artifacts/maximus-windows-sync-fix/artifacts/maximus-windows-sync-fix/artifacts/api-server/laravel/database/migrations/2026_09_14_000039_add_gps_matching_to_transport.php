<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('transport_drivers')) {
            Schema::table('transport_drivers', function (Blueprint $table): void {
                if (! Schema::hasColumn('transport_drivers', 'employee_id')) {
                    $table->string('employee_id')->nullable()->index();
                }
                if (! Schema::hasColumn('transport_drivers', 'latitude')) {
                    $table->decimal('latitude', 10, 7)->nullable();
                }
                if (! Schema::hasColumn('transport_drivers', 'longitude')) {
                    $table->decimal('longitude', 10, 7)->nullable();
                }
                if (! Schema::hasColumn('transport_drivers', 'location_updated_at')) {
                    $table->timestampTz('location_updated_at')->nullable()->index();
                }
            });
        }

        if (Schema::hasTable('transport_trips')) {
            Schema::table('transport_trips', function (Blueprint $table): void {
                if (! Schema::hasColumn('transport_trips', 'pickup_latitude')) {
                    $table->decimal('pickup_latitude', 10, 7)->nullable();
                }
                if (! Schema::hasColumn('transport_trips', 'pickup_longitude')) {
                    $table->decimal('pickup_longitude', 10, 7)->nullable();
                }
                if (! Schema::hasColumn('transport_trips', 'matched_distance_km')) {
                    $table->decimal('matched_distance_km', 8, 2)->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('transport_trips')) {
            Schema::table('transport_trips', function (Blueprint $table): void {
                foreach (['pickup_latitude', 'pickup_longitude', 'matched_distance_km'] as $column) {
                    if (Schema::hasColumn('transport_trips', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('transport_drivers')) {
            Schema::table('transport_drivers', function (Blueprint $table): void {
                foreach (['employee_id', 'latitude', 'longitude', 'location_updated_at'] as $column) {
                    if (Schema::hasColumn('transport_drivers', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};