<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maximus_installations', function (Blueprint $table): void {
            $table->dropUnique(['company_id']);
            $table->index('company_id');
        });
        Schema::create('maximus_installation_addresses', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('installation_id')->index();
            $table->foreign('installation_id')->references('id')->on('maximus_installations')->cascadeOnDelete();
            $table->string('url', 500);
            $table->string('hostname', 253)->unique();
            $table->string('status', 20)->default('PENDING');
            $table->boolean('is_primary')->default(false);
            $table->string('validation_method', 20)->default('public');
            $table->string('verification_name')->nullable();
            $table->string('verification_value')->nullable();
            $table->text('last_error')->nullable();
            $table->timestampTz('verified_at')->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_installation_addresses');
        // Do not restore company uniqueness: multiple installations may now exist.
    }
};