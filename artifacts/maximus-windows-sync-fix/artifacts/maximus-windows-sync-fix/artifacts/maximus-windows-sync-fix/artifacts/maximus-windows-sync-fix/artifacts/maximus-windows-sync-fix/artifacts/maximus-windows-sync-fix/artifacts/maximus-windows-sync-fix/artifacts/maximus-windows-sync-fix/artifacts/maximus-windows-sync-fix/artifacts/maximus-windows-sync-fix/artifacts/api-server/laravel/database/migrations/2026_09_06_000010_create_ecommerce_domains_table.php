<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ecommerce_domains')) {
            return;
        }

        Schema::create('ecommerce_domains', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('company_id')->index();
            $table->string('domain', 253)->unique();
            $table->string('target_host', 253);
            $table->string('verification_token', 100);
            $table->string('status', 20)->default('PENDING');
            $table->text('last_error')->default('');
            $table->timestampTz('verified_at')->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ecommerce_domains');
    }
};