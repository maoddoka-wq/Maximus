<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            $table->string('module_navigation_mode', 16)->default('menu');
            $table->boolean('navigation_custom_allowed')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            $table->dropColumn(['module_navigation_mode', 'navigation_custom_allowed']);
        });
    }
};
