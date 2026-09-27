<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('transport_mobile_tokens', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('token_hash', 64)->unique();
            $table->string('company_id')->index();
            $table->string('driver_id')->index();
            $table->string('employee_id')->index();
            $table->string('device_name')->nullable();
            $table->timestampTz('expires_at');
            $table->timestampTz('created_at');
            $table->timestampTz('last_used_at')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->index(['driver_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_mobile_tokens');
    }
};