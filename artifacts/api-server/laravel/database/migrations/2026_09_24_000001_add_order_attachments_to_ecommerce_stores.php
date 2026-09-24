<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasColumn('ecommerce_stores', 'allow_order_attachments')) {
            Schema::table('ecommerce_stores', function (Blueprint $table): void {
                $table->boolean('allow_order_attachments')->default(false);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('ecommerce_stores', 'allow_order_attachments')) {
            Schema::table('ecommerce_stores', function (Blueprint $table): void {
                $table->dropColumn('allow_order_attachments');
            });
        }
    }
};