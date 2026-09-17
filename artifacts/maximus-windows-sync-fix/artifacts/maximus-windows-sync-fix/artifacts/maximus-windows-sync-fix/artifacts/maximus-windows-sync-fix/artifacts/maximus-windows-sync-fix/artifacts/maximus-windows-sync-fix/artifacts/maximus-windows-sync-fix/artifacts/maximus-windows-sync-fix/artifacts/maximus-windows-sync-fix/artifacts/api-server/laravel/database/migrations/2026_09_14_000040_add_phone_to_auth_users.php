<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('auth_users') && ! Schema::hasColumn('auth_users', 'phone')) {
            Schema::table('auth_users', function (Blueprint $table): void {
                $table->string('phone')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('auth_users') && Schema::hasColumn('auth_users', 'phone')) {
            Schema::table('auth_users', function (Blueprint $table): void {
                $table->dropColumn('phone');
            });
        }
    }
};