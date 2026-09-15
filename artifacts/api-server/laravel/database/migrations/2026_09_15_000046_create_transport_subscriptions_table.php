<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('transport_subscriptions')) {
            return;
        }

        Schema::create('transport_subscriptions', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('company_id')->unique();
            $table->unsignedBigInteger('monthly_amount')->default(15000);
            $table->string('currency', 3)->default('XOF');
            $table->string('status')->default('PENDING');
            $table->string('payment_status')->default('UNPAID');
            $table->string('payment_charge_id')->nullable()->index();
            $table->text('payment_checkout_url')->nullable();
            $table->text('payment_failure_reason')->default('');
            $table->timestampTz('current_period_start')->nullable();
            $table->timestampTz('current_period_end')->nullable();
            $table->timestampTz('next_due_at')->nullable();
            $table->timestampTz('last_paid_at')->nullable();
            $table->string('updated_by')->nullable();
            $table->timestampsTz();
            $table->index(['status', 'payment_status']);
            $table->index(['company_id', 'current_period_end']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_subscriptions');
    }
};