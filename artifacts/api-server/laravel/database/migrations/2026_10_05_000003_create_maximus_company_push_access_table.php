<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maximus_company_push_access', function (Blueprint $table): void {
            $table->string('company_id')->primary();
            $table->boolean('enabled')->default(false);
            $table->string('updated_by')->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_company_push_access');
    }
};
