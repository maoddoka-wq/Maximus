<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('ecommerce_gallery_images')) {
            return;
        }

        Schema::create('ecommerce_gallery_images', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('company_id')->index();
            $table->string('owner_type', 20);
            $table->string('owner_id')->index();
            $table->string('collection', 20)->default('gallery');
            $table->text('image_data');
            $table->string('image_mime', 120);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestampsTz();
            $table->index(['company_id', 'owner_type', 'owner_id', 'collection'], 'gallery_owner_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ecommerce_gallery_images');
    }
};