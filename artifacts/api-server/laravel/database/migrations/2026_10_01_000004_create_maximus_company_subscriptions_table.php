<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\CarbonImmutable;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('maximus_company_subscriptions')) {
            Schema::create('maximus_company_subscriptions', function (Blueprint $table): void {
                $table->string('company_id')->primary();
                $table->string('last_payment_id')->nullable()->index();
                $table->timestampTz('current_period_started_at');
                $table->timestampTz('current_period_ends_at')->index();
                $table->timestampsTz();
            });

            DB::table('maximus_subscription_payments')
                ->where('status', 'PAID')
                ->whereNotNull('paid_at')
                ->orderBy('paid_at')
                ->get(['company_id', 'id', 'paid_at'])
                ->groupBy('company_id')
                ->each(function ($payments, string $companyId): void {
                    $lastPayment = $payments->last();
                    $paidAt = CarbonImmutable::parse($lastPayment->paid_at);

                    DB::table('maximus_company_subscriptions')->insert([
                        'company_id' => $companyId,
                        'last_payment_id' => (string) $lastPayment->id,
                        'current_period_started_at' => $paidAt->toDateTimeString(),
                        'current_period_ends_at' => $paidAt->addMonthNoOverflow()->toDateTimeString(),
                        'created_at' => $paidAt->toDateTimeString(),
                        'updated_at' => $paidAt->toDateTimeString(),
                    ]);
                });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_company_subscriptions');
    }
};