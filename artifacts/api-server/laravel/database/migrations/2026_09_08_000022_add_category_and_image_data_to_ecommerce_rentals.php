<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ecommerce_rentals')) {
            return;
        }

        Schema::table('ecommerce_rentals', function (Blueprint $table): void {
            if (! Schema::hasColumn('ecommerce_rentals', 'category_id')) {
                $table->string('category_id')->nullable()->index();
            }
            if (! Schema::hasColumn('ecommerce_rentals', 'image_url')) {
                $table->text('image_url')->default('');
            }
            if (! Schema::hasColumn('ecommerce_rentals', 'image_data')) {
                $table->text('image_data')->nullable();
            }
            if (! Schema::hasColumn('ecommerce_rentals', 'image_mime')) {
                $table->string('image_mime', 120)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ecommerce_rentals')) {
            return;
        }

        Schema::table('ecommerce_rentals', function (Blueprint $table): void {
            foreach (['category_id', 'image_url', 'image_data', 'image_mime'] as $column) {
                if (Schema::hasColumn('ecommerce_rentals', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};