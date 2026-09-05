<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('auth_users')) {
            return;
        }

        Schema::create('auth_users', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('email')->unique();
            $table->text('password_hash');
            $table->string('display_name');
            $table->string('role');
            $table->string('company_id')->nullable();
            $table->string('employee_id')->nullable();
            $table->json('sector_ids')->default('[]');
            $table->string('status')->default('ACTIF');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auth_users');
    }
};