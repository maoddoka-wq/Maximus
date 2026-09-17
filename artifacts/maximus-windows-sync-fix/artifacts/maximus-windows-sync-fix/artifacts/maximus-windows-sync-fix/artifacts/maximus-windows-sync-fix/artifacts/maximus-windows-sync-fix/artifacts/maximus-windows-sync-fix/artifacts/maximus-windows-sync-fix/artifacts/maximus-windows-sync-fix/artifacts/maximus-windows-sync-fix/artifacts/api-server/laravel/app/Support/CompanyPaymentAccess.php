<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CompanyPaymentAccess
{
    public const PROVIDER_DIAMANOPAY = 'DIAMANOPAY';

    public static function ensure(string $companyId, string $status = 'INACTIF'): object
    {
        $existing = DB::table('company_payment_settings')
            ->where('company_id', $companyId)
            ->first();
        if ($existing) {
            return $existing;
        }

        DB::table('company_payment_settings')->insert([
            'id' => 'company-payment-'.Str::slug($companyId),
            'company_id' => $companyId,
            'status' => $status,
            'providers' => json_encode([self::PROVIDER_DIAMANOPAY], JSON_UNESCAPED_UNICODE),
            'updated_at' => now(),
            'created_at' => now(),
        ]);

        return DB::table('company_payment_settings')
            ->where('company_id', $companyId)
            ->first();
    }

    public static function isEnabled(string $companyId): bool
    {
        return self::statusFor($companyId) === 'ACTIF';
    }

    public static function statusFor(string $companyId): string
    {
        return (string) (DB::table('company_payment_settings')
            ->where('company_id', $companyId)
            ->value('status') ?? 'INACTIF');
    }

    public static function payload(string $companyId): array
    {
        $settings = self::ensure($companyId);
        $providers = json_decode($settings->providers ?? '[]', true);

        return [
            'companyId' => $companyId,
            'status' => (string) $settings->status,
            'enabled' => $settings->status === 'ACTIF',
            'providers' => is_array($providers) ? array_values($providers) : [],
            'updatedAt' => $settings->updated_at ? (string) $settings->updated_at : null,
        ];
    }
}