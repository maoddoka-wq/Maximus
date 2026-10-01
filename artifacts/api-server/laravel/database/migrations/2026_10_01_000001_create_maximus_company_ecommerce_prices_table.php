<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('maximus_company_ecommerce_prices')) {
            return;
        }

        Schema::create('maximus_company_ecommerce_prices', function (Blueprint $table): void {
            $table->string('company_id')->primary();
            $table->unsignedBigInteger('monthly_amount')->nullable();
            $table->string('updated_by')->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_company_ecommerce_prices');
    }
};