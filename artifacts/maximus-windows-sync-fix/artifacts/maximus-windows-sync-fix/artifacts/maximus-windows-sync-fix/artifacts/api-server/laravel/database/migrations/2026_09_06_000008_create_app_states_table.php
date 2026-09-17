<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('maximus_app_states')) {
            return;
        }

        Schema::create('maximus_app_states', function (Blueprint $table): void {
            $table->string('scope')->primary();
            $table->string('company_id')->nullable()->index();
            $table->json('payload')->default('{}');
            $table->unsignedBigInteger('version')->default(1);
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_app_states');
    }
};