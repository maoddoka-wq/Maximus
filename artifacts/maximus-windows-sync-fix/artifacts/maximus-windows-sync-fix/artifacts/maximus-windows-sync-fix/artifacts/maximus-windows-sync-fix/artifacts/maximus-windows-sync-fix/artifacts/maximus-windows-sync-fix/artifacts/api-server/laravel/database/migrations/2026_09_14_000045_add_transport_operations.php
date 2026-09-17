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
                if (! Schema::hasColumn('transport_drivers', 'availability')) {
                    $table->string('availability')->default('AVAILABLE')->index();
                }
                if (! Schema::hasColumn('transport_drivers', 'availability_updated_at')) {
                    $table->timestampTz('availability_updated_at')->nullable();
                }
            });
        }

        if (Schema::hasTable('transport_trips')) {
            Schema::table('transport_trips', function (Blueprint $table): void {
                if (! Schema::hasColumn('transport_trips', 'offer_expires_at')) {
                    $table->timestampTz('offer_expires_at')->nullable()->index();
                }
                if (! Schema::hasColumn('transport_trips', 'pickup_code')) {
                    $table->string('pickup_code', 8)->nullable();
                }
                if (! Schema::hasColumn('transport_trips', 'assigned_at')) {
                    $table->timestampTz('assigned_at')->nullable();
                }
                if (! Schema::hasColumn('transport_trips', 'started_at')) {
                    $table->timestampTz('started_at')->nullable();
                }
                if (! Schema::hasColumn('transport_trips', 'completed_at')) {
                    $table->timestampTz('completed_at')->nullable();
                }
            });
        }

        if (! Schema::hasTable('transport_trip_events')) {
            Schema::create('transport_trip_events', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('trip_id')->index();
                $table->string('actor_type')->default('system');
                $table->string('actor_id')->nullable();
                $table->string('event_type');
                $table->string('from_status')->nullable();
                $table->string('to_status')->nullable();
                $table->json('metadata')->nullable();
                $table->timestampTz('created_at')->index();
                $table->index(['company_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_trip_events');

        if (Schema::hasTable('transport_trips')) {
            Schema::table('transport_trips', function (Blueprint $table): void {
                foreach (['offer_expires_at', 'pickup_code', 'assigned_at', 'started_at', 'completed_at'] as $column) {
                    if (Schema::hasColumn('transport_trips', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('transport_drivers')) {
            Schema::table('transport_drivers', function (Blueprint $table): void {
                foreach (['availability', 'availability_updated_at'] as $column) {
                    if (Schema::hasColumn('transport_drivers', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};