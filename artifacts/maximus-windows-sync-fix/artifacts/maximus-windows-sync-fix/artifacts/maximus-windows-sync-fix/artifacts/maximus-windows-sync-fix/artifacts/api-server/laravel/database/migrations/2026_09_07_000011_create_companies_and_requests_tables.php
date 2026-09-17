<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('companies')) {
            Schema::create('companies', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('name');
                $table->string('manager');
                $table->string('email')->unique();
                $table->string('phone')->default('');
                $table->string('country')->default('');
                $table->string('sector')->default('');
                $table->string('status')->default('EN ATTENTE');
                $table->json('requested_modules')->default('[]');
                $table->json('requested_module_pack_ids')->default('{}');
                $table->json('requested_module_features')->default('{}');
                $table->json('requested_module_permissions')->default('{}');
                $table->text('rejection_reason')->nullable();
                $table->timestampTz('deleted_at')->nullable();
                $table->timestampsTz();
                $table->index(['status', 'deleted_at']);
            });
        }

        if (! Schema::hasTable('company_requests')) {
            Schema::create('company_requests', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->string('status')->default('PENDING');
                $table->text('admin_password_hash');
                $table->text('rejection_reason')->nullable();
                $table->timestampsTz();
                $table->unique(['company_id']);
                $table->index(['status', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('company_requests');
        Schema::dropIfExists('companies');
    }
};