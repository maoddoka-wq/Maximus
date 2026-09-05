<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('presence_items')) {
            return;
        }

        Schema::create('presence_items', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('company_id');
            $table->string('type');
            $table->string('employee_id')->nullable();
            $table->string('work_date')->nullable();
            $table->string('start_date')->nullable();
            $table->string('end_date')->nullable();
            $table->string('status')->default('ACTIF');
            $table->json('payload')->default('{}');
            $table->text('created_by')->default('Utilisateur MAXIMUS');
            $table->text('updated_by')->default('Utilisateur MAXIMUS');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presence_items');
    }
};