<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ecommerce_taxi_drivers')) {
            Schema::create('ecommerce_taxi_drivers', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('employee_id')->index();
                $table->string('verification_status')->default('PENDING')->index();
                $table->string('status')->default('OFFLINE')->index();
                $table->string('vehicle_make', 80)->default('');
                $table->string('vehicle_model', 80)->default('');
                $table->string('vehicle_color', 40)->default('');
                $table->string('license_plate', 30)->default('');
                $table->json('documents')->default('{}');
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->timestampTz('last_location_at')->nullable();
                $table->timestampsTz();
                $table->unique(['company_id', 'employee_id']);
            });
        }

        if (! Schema::hasTable('ecommerce_taxi_requests')) {
            Schema::create('ecommerce_taxi_requests', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('customer_id')->nullable()->index();
                $table->string('reference')->index();
                $table->string('requester_name', 120);
                $table->string('requester_email', 160);
                $table->string('requester_phone', 40)->default('');
                $table->string('pickup_address', 500);
                $table->decimal('pickup_latitude', 10, 7);
                $table->decimal('pickup_longitude', 10, 7);
                $table->string('destination_address', 500);
                $table->decimal('destination_latitude', 10, 7)->nullable();
                $table->decimal('destination_longitude', 10, 7)->nullable();
                $table->unsignedTinyInteger('passenger_count')->default(1);
                $table->string('status')->default('DEMANDEE')->index();
                $table->string('assigned_driver_id')->nullable()->index();
                $table->json('rejected_driver_ids')->default('[]');
                $table->decimal('assigned_distance_km', 8, 2)->nullable();
                $table->timestampTz('offered_at')->nullable();
                $table->timestampTz('accepted_at')->nullable();
                $table->timestampTz('approaching_at')->nullable();
                $table->timestampTz('boarded_at')->nullable();
                $table->timestampTz('completed_at')->nullable();
                $table->timestampTz('cancelled_at')->nullable();
                $table->string('cancelled_by')->nullable();
                $table->text('note')->default('');
                $table->timestampsTz();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ecommerce_taxi_requests');
        Schema::dropIfExists('ecommerce_taxi_drivers');
    }
};