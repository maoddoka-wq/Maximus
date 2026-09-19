<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('companies', 'deletion_locked')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->boolean('deletion_locked')->default(true);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('companies', 'deletion_locked')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->dropColumn('deletion_locked');
            });
        }
    }
};