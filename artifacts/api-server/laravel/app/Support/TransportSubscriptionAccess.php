<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class TransportSubscriptionAccess
{
    public static function isActive(string $companyId): bool
    {
        $subscription = DB::table('transport_subscriptions')
            ->where('company_id', $companyId)
            ->first(['status', 'payment_status', 'current_period_end']);

        if (! $subscription
            || $subscription->status !== 'ACTIVE'
            || $subscription->payment_status !== 'PAID'
            || ! $subscription->current_period_end) {
            return false;
        }

        return now()->lessThanOrEqualTo($subscription->current_period_end);
    }
}