<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CommissionService
{
    public function settle(object $payment, string $sellerId): object
    {
        $existing = DB::table('commissions')->where('tenant_id', $payment->tenant_id)->where('payment_id', $payment->id)->first();
        if ($existing) {
            return $existing;
        }

        $rule = DB::table('commission_rules')
            ->where(function ($query) use ($payment): void {
                $query->whereNull('tenant_id')->orWhere('tenant_id', $payment->tenant_id);
            })
            ->where(function ($query) use ($payment): void {
                $query->whereNull('source_module')->orWhere('source_module', $payment->source_module);
            })
            ->where('is_active', true)
            ->orderByDesc('priority')
            ->first();
        $percentage = $rule ? (float) $rule->percentage : 0.0;
        $fixed = $rule ? (int) $rule->fixed_amount : 0;
        $commissionAmount = min((int) $payment->amount, max(0, (int) round(((int) $payment->amount * $percentage) / 100) + $fixed));
        $row = [
            'id' => 'commission-'.Str::uuid(),
            'tenant_id' => $payment->tenant_id,
            'payment_id' => $payment->id,
            'seller_id' => $sellerId,
            'rule_id' => $rule?->id,
            'gross_amount' => (int) $payment->amount,
            'commission_amount' => $commissionAmount,
            'currency' => $payment->currency,
            'status' => 'POSTED',
            'metadata' => json_encode(['percentage' => $percentage, 'fixed_amount' => $fixed], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('commissions')->insert($row);

        return (object) $row;
    }
}