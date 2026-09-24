<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('ecommerce_order_attachments')) {
            return;
        }

        Schema::create('ecommerce_order_attachments', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('company_id')->index();
            $table->string('order_id')->index();
            $table->string('customer_id')->nullable()->index();
            $table->string('file_path', 500);
            $table->string('original_name', 255);
            $table->string('mime_type', 120);
            $table->unsignedInteger('file_size')->default(0);
            $table->timestampsTz();
            $table->index(['company_id', 'order_id'], 'ecommerce_order_attachments_scope_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ecommerce_order_attachments');
    }
};