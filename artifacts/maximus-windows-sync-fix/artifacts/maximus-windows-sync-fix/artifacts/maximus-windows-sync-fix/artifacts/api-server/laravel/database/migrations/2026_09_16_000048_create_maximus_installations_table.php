<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('maximus_installations')) {
            return;
        }

        Schema::create('maximus_installations', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('company_id')->unique();
            $table->string('mode', 20);
            $table->string('status', 20)->default('READY');
            $table->text('token_hash');
            $table->text('endpoint_url')->nullable();
            $table->unsignedBigInteger('configuration_version')->default(1);
            $table->timestampTz('last_seen_at')->nullable();
            $table->timestampTz('last_sync_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->timestampsTz();
            $table->index(['status', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_installations');
    }
};