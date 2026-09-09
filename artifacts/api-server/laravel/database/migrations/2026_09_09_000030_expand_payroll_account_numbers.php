<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payroll_beneficiaries', function (Blueprint $table): void {
            $table->text('account_number')->change();
        });
        Schema::table('payroll_batch_items', function (Blueprint $table): void {
            $table->text('account_number')->change();
        });
    }

    public function down(): void
    {
        Schema::table('payroll_beneficiaries', function (Blueprint $table): void {
            $table->string('account_number', 120)->change();
        });
        Schema::table('payroll_batch_items', function (Blueprint $table): void {
            $table->string('account_number', 120)->change();
        });
    }
};