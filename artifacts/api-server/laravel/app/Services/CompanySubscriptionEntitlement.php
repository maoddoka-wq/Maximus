<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class CompanySubscriptionEntitlement
{
    public function statusForCompany(string $companyId): array
    {
        $customAmount = DB::table('maximus_company_subscription_prices')
            ->where('company_id', $companyId)
            ->value('custom_monthly_amount');
        $customAmount = $customAmount === null ? null : (int) $customAmount;

        $period = DB::table('maximus_company_subscriptions')
            ->where('company_id', $companyId)
            ->first(['current_period_started_at', 'current_period_ends_at']);
        $now = CarbonImmutable::now();
        $periodEndsAt = $period?->current_period_ends_at
            ? CarbonImmutable::parse($period->current_period_ends_at)
            : null;
        $periodStartsAt = $period?->current_period_started_at
            ? CarbonImmutable::parse($period->current_period_started_at)
            : null;
        $remainingSeconds = $periodEndsAt && $periodEndsAt->greaterThan($now)
            ? $periodEndsAt->getTimestamp() - $now->getTimestamp()
            : 0;
        $status = $customAmount === 0
            ? 'FREE'
            : ($remainingSeconds > 0 ? 'ACTIVE' : ($period ? 'EXPIRED' : 'UNPAID'));

        return [
            'billingMode' => $customAmount === 0 ? 'FREE' : 'PAID',
            'status' => $status,
            'currentPeriodStartsAt' => $periodStartsAt?->toISOString(),
            'currentPeriodEndsAt' => $periodEndsAt?->toISOString(),
            'remainingSeconds' => $remainingSeconds,
        ];
    }

    public function allowsAccess(string $companyId): bool
    {
        return in_array($this->statusForCompany($companyId)['status'], ['FREE', 'ACTIVE'], true);
    }

    public function grantOneMonth(string $companyId, string $paymentId, CarbonImmutable $paidAt): void
    {
        $current = DB::table('maximus_company_subscriptions')
            ->where('company_id', $companyId)
            ->lockForUpdate()
            ->first(['current_period_ends_at']);
        $currentPeriodEnd = $current?->current_period_ends_at
            ? CarbonImmutable::parse($current->current_period_ends_at)
            : null;
        $periodStartsAt = $currentPeriodEnd && $currentPeriodEnd->greaterThan($paidAt)
            ? $currentPeriodEnd
            : $paidAt;
        $periodEndsAt = $periodStartsAt->addMonthNoOverflow();

        $values = [
            'last_payment_id' => $paymentId,
            'current_period_started_at' => $periodStartsAt->toDateTimeString(),
            'current_period_ends_at' => $periodEndsAt->toDateTimeString(),
            'updated_at' => $paidAt->toDateTimeString(),
        ];
        if ($current) {
            DB::table('maximus_company_subscriptions')
                ->where('company_id', $companyId)
                ->update($values);

            return;
        }

        DB::table('maximus_company_subscriptions')->insert([
            'company_id' => $companyId,
            ...$values,
            'created_at' => $paidAt->toDateTimeString(),
        ]);
    }
}