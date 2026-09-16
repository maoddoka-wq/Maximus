<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('companies', 'custom_login_domain')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->string('custom_login_domain', 253)->nullable()->unique();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('companies', 'custom_login_domain')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->dropUnique(['custom_login_domain']);
                $table->dropColumn('custom_login_domain');
            });
        }
    }
};