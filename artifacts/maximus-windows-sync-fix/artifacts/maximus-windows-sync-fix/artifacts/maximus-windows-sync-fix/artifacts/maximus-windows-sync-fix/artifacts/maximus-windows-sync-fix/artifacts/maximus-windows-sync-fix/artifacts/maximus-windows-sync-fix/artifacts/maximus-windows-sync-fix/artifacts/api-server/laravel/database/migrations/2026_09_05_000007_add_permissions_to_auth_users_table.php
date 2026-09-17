<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('auth_users', 'permissions')) {
            Schema::table('auth_users', function (Blueprint $table): void {
                $table->json('permissions')->default('{}');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('auth_users', 'permissions')) {
            Schema::table('auth_users', function (Blueprint $table): void {
                $table->dropColumn('permissions');
            });
        }
    }
};