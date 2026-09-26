<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('transport_trip_shares')) {
            return;
        }

        Schema::create('transport_trip_shares', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('company_id');
            $table->string('trip_id');
            $table->char('token_hash', 64)->unique();
            $table->timestampTz('expires_at');
            $table->timestampTz('revoked_at')->nullable();
            $table->timestampsTz();
            $table->index(['company_id', 'trip_id', 'expires_at'], 'transport_trip_shares_scope_expiry');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_trip_shares');
    }
};