<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('companies', 'custom_login_enabled')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->boolean('custom_login_enabled')->default(false)->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('companies', 'custom_login_enabled')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->dropColumn('custom_login_enabled');
            });
        }
    }
};