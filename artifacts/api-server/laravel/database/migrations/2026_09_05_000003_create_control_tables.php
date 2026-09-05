<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('control_tasks')) {
            Schema::create('control_tasks', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->string('sector_id')->nullable();
                $table->text('title');
                $table->text('description');
                $table->string('module_id')->nullable();
                $table->string('assignee_employee_id')->nullable();
                $table->text('assignee_name')->nullable();
                $table->text('created_by');
                $table->string('status')->default('À FAIRE');
                $table->string('priority')->default('NORMALE');
                $table->boolean('requires_approval')->default(false);
                $table->text('due_date')->nullable();
                $table->text('related_object')->nullable();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->useCurrent();
            });
        }

        if (!Schema::hasTable('control_events')) {
            Schema::create('control_events', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('type');
                $table->text('label');
                $table->text('summary');
                $table->string('company_id');
                $table->string('module_id')->nullable();
                $table->text('actor_name');
                $table->string('entity_type');
                $table->string('entity_id')->nullable();
                $table->string('severity')->default('info');
                $table->timestampTz('created_at')->useCurrent();
            });
        }

        if (!Schema::hasTable('control_audit_entries')) {
            Schema::create('control_audit_entries', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->text('action');
                $table->text('summary');
                $table->string('company_id');
                $table->string('module_id')->nullable();
                $table->text('actor_name');
                $table->string('entity_type');
                $table->string('entity_id')->nullable();
                $table->timestampTz('created_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('control_audit_entries');
        Schema::dropIfExists('control_events');
        Schema::dropIfExists('control_tasks');
    }
};