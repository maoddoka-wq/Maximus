<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('onboarding_drafts')) {
            return;
        }

        Schema::create('onboarding_drafts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('description');
            $table->json('proposal');
            $table->string('status', 32)->default('ANALYZED')->index();
            $table->string('company_id')->nullable()->index();
            $table->string('request_id')->nullable()->index();
            $table->timestampTz('expires_at')->nullable()->index();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        // The original migration owns this table; this repair migration only
        // restores it when the recorded schema is incomplete.
    }
};