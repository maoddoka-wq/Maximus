<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('maximus_modules') && !Schema::hasColumn('maximus_modules', 'employee_profiles')) {
            Schema::table('maximus_modules', function (Blueprint $table): void {
                $table->json('employee_profiles')->default('[]');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('maximus_modules') && Schema::hasColumn('maximus_modules', 'employee_profiles')) {
            Schema::table('maximus_modules', function (Blueprint $table): void {
                $table->dropColumn('employee_profiles');
            });
        }
    }
};