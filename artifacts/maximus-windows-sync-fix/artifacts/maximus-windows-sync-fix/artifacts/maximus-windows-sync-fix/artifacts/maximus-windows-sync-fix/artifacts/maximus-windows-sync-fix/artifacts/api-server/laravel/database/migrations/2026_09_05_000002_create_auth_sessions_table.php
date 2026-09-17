<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('auth_sessions')) {
            return;
        }

        Schema::create('auth_sessions', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('token_hash');
            $table->string('user_id');
            $table->timestampTz('expires_at');
            $table->timestampTz('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auth_sessions');
    }
};