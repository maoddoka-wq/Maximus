<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ecommerce_rentals')) {
            return;
        }

        Schema::create('ecommerce_rentals', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('company_id')->index();
            $table->string('name');
            $table->text('description')->default('');
            $table->string('category')->default('Général');
            $table->unsignedBigInteger('price')->default(0);
            $table->string('billing_unit', 16)->default('JOUR');
            $table->unsignedInteger('availability')->default(0);
            $table->string('status', 16)->default('DRAFT')->index();
            $table->timestampsTz();
            $table->unique(['company_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ecommerce_rentals');
    }
};