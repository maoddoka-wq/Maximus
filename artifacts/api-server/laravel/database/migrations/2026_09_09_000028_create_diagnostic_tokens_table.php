<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('diagnostic_tokens')) {
            return;
        }

        Schema::create('diagnostic_tokens', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('token_hash', 64)->unique();
            $table->string('token_prefix', 32);
            $table->string('label', 120);
            $table->string('created_by_user_id');
            $table->string('scope', 80)->default('health:read');
            $table->timestampTz('expires_at');
            $table->timestampTz('last_used_at')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->index(['revoked_at', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostic_tokens');
    }
};