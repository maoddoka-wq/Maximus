<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('transport_vehicles')) {
            return;
        }

        Schema::table('transport_vehicles', function (Blueprint $table): void {
            if (! Schema::hasColumn('transport_vehicles', 'image_data')) {
                $table->text('image_data')->nullable();
            }
            if (! Schema::hasColumn('transport_vehicles', 'image_mime')) {
                $table->string('image_mime', 80)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('transport_vehicles')) {
            return;
        }

        Schema::table('transport_vehicles', function (Blueprint $table): void {
            foreach (['image_data', 'image_mime'] as $column) {
                if (Schema::hasColumn('transport_vehicles', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};