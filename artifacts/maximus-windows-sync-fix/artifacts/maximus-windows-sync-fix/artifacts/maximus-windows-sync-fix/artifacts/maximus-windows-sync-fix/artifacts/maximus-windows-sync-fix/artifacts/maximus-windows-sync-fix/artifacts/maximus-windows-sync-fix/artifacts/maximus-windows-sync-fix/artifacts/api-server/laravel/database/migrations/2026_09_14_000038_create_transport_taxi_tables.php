<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('transport_drivers')) {
            Schema::create('transport_drivers', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('name');
                $table->string('phone');
                $table->string('license_number');
                $table->string('status')->default('ACTIVE');
                $table->timestampsTz();
                $table->index(['company_id', 'status']);
            });
        }

        if (! Schema::hasTable('transport_vehicles')) {
            Schema::create('transport_vehicles', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('registration');
                $table->string('model');
                $table->string('vehicle_type')->default('TAXI');
                $table->string('status')->default('AVAILABLE');
                $table->timestampsTz();
                $table->index(['company_id', 'status']);
                $table->unique(['company_id', 'registration']);
            });
        }

        if (! Schema::hasTable('transport_trips')) {
            Schema::create('transport_trips', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('reference');
                $table->string('pickup');
                $table->string('destination');
                $table->string('passenger_name');
                $table->string('passenger_phone');
                $table->unsignedBigInteger('fare');
                $table->string('driver_id')->nullable();
                $table->string('vehicle_id')->nullable();
                $table->string('status')->default('REQUESTED');
                $table->timestampTz('requested_at');
                $table->timestampsTz();
                $table->index(['company_id', 'status']);
                $table->index(['company_id', 'requested_at']);
                $table->unique(['company_id', 'reference']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_trips');
        Schema::dropIfExists('transport_vehicles');
        Schema::dropIfExists('transport_drivers');
    }
};