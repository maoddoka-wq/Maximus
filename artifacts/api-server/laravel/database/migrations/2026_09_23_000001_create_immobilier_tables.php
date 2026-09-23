<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('immobilier_listings')) {
            Schema::create('immobilier_listings', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('title');
                $table->string('slug');
                $table->string('property_type', 40);
                $table->string('transaction_type', 20);
                $table->string('status', 20)->default('DRAFT')->index();
                $table->text('description')->nullable();
                $table->string('city', 100);
                $table->string('neighborhood', 120)->nullable();
                $table->string('address', 240)->nullable();
                $table->unsignedBigInteger('price')->default(0);
                $table->unsignedInteger('area_m2')->nullable();
                $table->unsignedTinyInteger('bedrooms')->nullable();
                $table->unsignedTinyInteger('bathrooms')->nullable();
                $table->boolean('furnished')->default(false);
                $table->boolean('featured')->default(false);
                $table->timestamps();
                $table->unique(['company_id', 'slug']);
                $table->index(['company_id', 'status']);
            });
        }

        if (! Schema::hasTable('immobilier_leads')) {
            Schema::create('immobilier_leads', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('listing_id')->nullable()->index();
                $table->string('request_type', 20)->default('CONTACT');
                $table->string('status', 20)->default('NEW')->index();
                $table->string('name');
                $table->string('email');
                $table->string('phone', 40)->nullable();
                $table->date('preferred_date')->nullable();
                $table->text('message')->nullable();
                $table->timestamps();
                $table->index(['company_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('immobilier_leads');
        Schema::dropIfExists('immobilier_listings');
    }
};