<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('labo_records')) {
            Schema::create('labo_records', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('module_id');
                $table->string('feature_id');
                $table->json('data');
                $table->string('status')->nullable();
                $table->unsignedInteger('version')->default(1);
                $table->timestamps();
                $table->softDeletes();
                $table->index(['company_id', 'module_id', 'feature_id']);
            });
        }
        if (! Schema::hasTable('labo_record_events')) {
            Schema::create('labo_record_events', function (Blueprint $table): void {
                $table->id();
                $table->string('record_id')->index();
                $table->string('company_id')->index();
                $table->string('event');
                $table->json('payload')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('labo_record_events');
        Schema::dropIfExists('labo_records');
    }
};