<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            // No cascading null: only explicit administrative rollback restores SaaS access.
            $table->string('erp_installation_id')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            $table->dropIndex(['erp_installation_id']);
            $table->dropColumn('erp_installation_id');
        });
    }
};