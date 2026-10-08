<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('amicale_records')) {
            Schema::create('amicale_records', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->string('type', 32);
                $table->string('reference', 48);
                $table->string('title', 180);
                $table->string('member_id')->nullable();
                $table->string('student_identifier', 80)->nullable();
                $table->unsignedBigInteger('amount')->nullable();
                $table->date('occurred_on')->nullable();
                $table->string('status', 24)->default('ACTIVE');
                $table->json('payload')->default('{}');
                $table->string('created_by_user_id')->nullable();
                $table->string('updated_by_user_id')->nullable();
                $table->text('created_by')->default('Utilisateur MAXIMUS');
                $table->text('updated_by')->default('Utilisateur MAXIMUS');
                $table->timestampsTz();

                $table->unique(['company_id', 'reference']);
                $table->unique(['company_id', 'student_identifier']);
                $table->index(['company_id', 'type', 'status']);
                $table->index(['company_id', 'type', 'occurred_on']);
                $table->index(['company_id', 'member_id']);
            });
        }

        if (! Schema::hasTable('amicale_record_history')) {
            Schema::create('amicale_record_history', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id');
                $table->string('record_id');
                $table->string('record_type', 32);
                $table->string('action', 40);
                $table->string('actor_user_id')->nullable();
                $table->text('actor_name')->default('Utilisateur MAXIMUS');
                $table->json('details')->default('{}');
                $table->timestampTz('created_at')->useCurrent();
                $table->index(['company_id', 'record_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('amicale_record_history');
        Schema::dropIfExists('amicale_records');
    }
};
