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
                if (! Schema::hasColumn('transport_drivers', 'pricing_mode')) {
                    $table->string('pricing_mode')->default('NORMAL')->index();
                }
                if (! Schema::hasColumn('transport_drivers', 'pricing_mode_updated_at')) {
                    $table->timestampTz('pricing_mode_updated_at')->nullable();
                }
            });
        }

        if (Schema::hasTable('transport_trips')) {
            Schema::table('transport_trips', function (Blueprint $table): void {
                if (! Schema::hasColumn('transport_trips', 'pricing_mode')) {
                    $table->string('pricing_mode')->default('NORMAL')->index();
                }
            });
        }

        if (! Schema::hasTable('transport_driver_mode_events')) {
            Schema::create('transport_driver_mode_events', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('driver_id')->index();
                $table->string('driver_name');
                $table->string('actor_type')->default('employee');
                $table->string('actor_id')->nullable();
                $table->string('actor_name');
                $table->string('from_mode');
                $table->string('to_mode');
                $table->timestampTz('created_at')->index();
                $table->index(['company_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_driver_mode_events');

        if (Schema::hasTable('transport_trips') && Schema::hasColumn('transport_trips', 'pricing_mode')) {
            Schema::table('transport_trips', function (Blueprint $table): void {
                $table->dropColumn('pricing_mode');
            });
        }

        if (Schema::hasTable('transport_drivers')) {
            Schema::table('transport_drivers', function (Blueprint $table): void {
                foreach (['pricing_mode', 'pricing_mode_updated_at'] as $column) {
                    if (Schema::hasColumn('transport_drivers', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};