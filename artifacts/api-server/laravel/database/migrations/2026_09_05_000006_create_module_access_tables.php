<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('maximus_modules')) {
            Schema::create('maximus_modules', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->text('name');
                $table->text('description')->default('');
                $table->json('features')->default('[]');
                $table->json('feature_dependencies')->default('{}');
                $table->string('status')->default('ACTIF');
                $table->timestampsTz();
            });
        }

        if (!Schema::hasTable('maximus_company_modules')) {
            Schema::create('maximus_company_modules', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->string('module_id');
                $table->string('status')->default('INACTIF');
                $table->json('feature_ids')->default('[]');
                $table->json('configuration')->default('{}');
                $table->timestampsTz();
                $table->unique(['company_id', 'module_id']);
                $table->index(['company_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_company_modules');
        Schema::dropIfExists('maximus_modules');
    }
};