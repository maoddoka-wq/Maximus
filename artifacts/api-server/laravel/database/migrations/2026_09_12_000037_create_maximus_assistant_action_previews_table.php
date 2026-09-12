<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('maximus_assistant_action_previews')) {
            return;
        }

        Schema::create('maximus_assistant_action_previews', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('token_hash', 64)->unique();
            $table->json('action');
            $table->string('status', 24)->default('PENDING')->index();
            $table->timestampTz('expires_at')->index();
            $table->timestampTz('confirmed_at')->nullable();
            $table->string('created_by')->nullable()->index();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_assistant_action_previews');
    }
};