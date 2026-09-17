<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('system_health_incidents')) {
            return;
        }

        Schema::create('system_health_incidents', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('key')->unique();
            $table->string('severity')->default('error');
            $table->string('status')->default('ACTIVE');
            $table->text('title');
            $table->text('message');
            $table->json('details')->nullable();
            $table->unsignedInteger('occurrence_count')->default(1);
            $table->timestampTz('first_seen_at')->useCurrent();
            $table->timestampTz('last_seen_at')->useCurrent();
            $table->timestampTz('resolved_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->index(['status', 'last_seen_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_health_incidents');
    }
};