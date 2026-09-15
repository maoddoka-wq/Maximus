<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('auth_users') || Schema::hasColumn('auth_users', 'is_general_direction')) {
            return;
        }

        Schema::table('auth_users', function (Blueprint $table): void {
            $table->boolean('is_general_direction')->default(false)->index();
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('auth_users') && Schema::hasColumn('auth_users', 'is_general_direction')) {
            Schema::table('auth_users', function (Blueprint $table): void {
                $table->dropColumn('is_general_direction');
            });
        }
    }
};