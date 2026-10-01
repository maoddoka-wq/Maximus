<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class EcommerceSubscriptionService
{
    public function isManaged(string $companyId): bool
    {
        if (! Schema::hasTable('maximus_company_ecommerce_prices')) {
            return false;
        }

        return DB::table('maximus_company_ecommerce_prices')
            ->where('company_id', $companyId)
            ->exists();
    }

    /**
     * Legacy companies without a configured subscription keep their existing module access.
     * Once MAXIMUS creates a subscription price row, only a paid current period grants access.
     */
    public function hasCurrentPeriod(string $companyId): bool
    {
        if (! Schema::hasTable('maximus_company_ecommerce_prices')) {
            return true;
        }

        $price = DB::table('maximus_company_ecommerce_prices')
            ->where('company_id', $companyId)
            ->first(['monthly_amount', 'paid_through_at']);

        if (! $price) {
            return true;
        }

        if ($price->monthly_amount === null || (int) $price->monthly_amount < 1 || ! $price->paid_through_at) {
            return false;
        }

        return Carbon::parse($price->paid_through_at)->isAfter(now());
    }

    public function snapshot(string $companyId, ?object $latestPayment = null): array
    {
        $price = Schema::hasTable('maximus_company_ecommerce_prices')
            ? DB::table('maximus_company_ecommerce_prices')
                ->where('company_id', $companyId)
                ->first(['monthly_amount', 'paid_through_at'])
            : null;
        $moduleStatus = (string) (DB::table('maximus_company_modules')
            ->where('company_id', $companyId)
            ->where('module_id', 'ecommerce')
            ->value('status') ?? 'INACTIF');

        $required = $price !== null;
        $monthlyAmount = $price?->monthly_amount === null ? null : (int) $price->monthly_amount;
        $paidThrough = $price?->paid_through_at
            ? Carbon::parse($price->paid_through_at)
            : null;
        $hasCurrentPeriod = ! $required || (
            $monthlyAmount !== null
            && $monthlyAmount > 0
            && $paidThrough !== null
            && $paidThrough->isAfter(now())
        );
        $moduleAvailable = in_array($moduleStatus, ['ACTIF', 'BETA'], true);

        if (! $required) {
            $status = 'NOT_MANAGED';
        } elseif (! $moduleAvailable) {
            $status = 'UNAVAILABLE';
        } elseif ($monthlyAmount === null || $monthlyAmount < 1) {
            $status = 'UNAVAILABLE';
        } elseif ($hasCurrentPeriod) {
            $status = 'ACTIVE';
        } elseif ($paidThrough !== null) {
            $status = 'EXPIRED';
        } else {
            $status = 'PAYMENT_REQUIRED';
        }

        $daysRemaining = null;
        if ($paidThrough !== null && $paidThrough->isAfter(now())) {
            $secondsRemaining = $paidThrough->getTimestamp() - now()->getTimestamp();
            $daysRemaining = (int) max(1, ceil($secondsRemaining / 86400));
        } elseif ($paidThrough !== null) {
            $daysRemaining = 0;
        }

        return [
            'required' => $required,
            'available' => $required
                && $monthlyAmount !== null
                && $monthlyAmount > 0
                && $moduleAvailable,
            'status' => $status,
            'moduleStatus' => $moduleStatus,
            'monthlyAmount' => $monthlyAmount,
            'currency' => 'XOF',
            'paidThroughAt' => $paidThrough?->toISOString(),
            'daysRemaining' => $daysRemaining,
            'hasCurrentPeriod' => $hasCurrentPeriod,
            'payment' => $latestPayment ? [
                'id' => (string) $latestPayment->id,
                'reference' => (string) $latestPayment->reference,
                'amount' => (int) $latestPayment->amount,
                'currency' => (string) $latestPayment->currency,
                'provider' => (string) $latestPayment->provider,
                'status' => (string) $latestPayment->status,
                'checkoutUrl' => $latestPayment->checkout_url,
                'paidAt' => $latestPayment->paid_at
                    ? Carbon::parse($latestPayment->paid_at)->toISOString()
                    : null,
            ] : null,
        ];
    }
}