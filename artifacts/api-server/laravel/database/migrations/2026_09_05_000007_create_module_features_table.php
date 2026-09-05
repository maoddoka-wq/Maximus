<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('maximus_module_features')) {
            return;
        }

        Schema::create('maximus_module_features', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('module_id');
            $table->string('feature_key');
            $table->text('label');
            $table->text('description')->default('');
            $table->json('actions')->default('["voir","créer","modifier"]');
            $table->json('dependencies')->default('[]');
            $table->string('status')->default('ACTIF');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestampsTz();
            $table->unique(['module_id', 'feature_key']);
            $table->index(['module_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_module_features');
    }
};