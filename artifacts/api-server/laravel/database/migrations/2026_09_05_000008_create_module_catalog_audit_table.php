<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('maximus_module_catalog_audits')) {
            return;
        }

        Schema::create('maximus_module_catalog_audits', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('action');
            $table->string('module_id');
            $table->string('feature_id')->nullable();
            $table->text('summary');
            $table->text('actor_name');
            $table->json('metadata')->default('{}');
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['module_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_module_catalog_audits');
    }
};