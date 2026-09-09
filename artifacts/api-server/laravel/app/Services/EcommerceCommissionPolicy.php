<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

final class EcommerceCommissionPolicy
{
    public const SETTING_KEY = 'ecommerce_commission';

    private const DEFAULT_PROVIDER_PERCENT = 3;

    private const DEFAULT_MAXIMUS_PERCENT = 2;

    public function current(): array
    {
        $row = DB::table('maximus_platform_settings')->where('key', self::SETTING_KEY)->first();
        $stored = is_string($row?->value)
            ? json_decode($row->value, true)
            : ($row?->value ?? []);

        return $this->normalize(is_array($stored) ? $stored : []);
    }

    public function update(int $providerPercent, int $maximusPercent): array
    {
        $setting = $this->normalize([
            'providerPercent' => $providerPercent,
            'maximusPercent' => $maximusPercent,
        ]);

        DB::table('maximus_platform_settings')->updateOrInsert(
            ['key' => self::SETTING_KEY],
            [
                'value' => json_encode($setting, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        return $setting;
    }

    public function payloadForUpdate(int $providerPercent, int $maximusPercent): array
    {
        return $this->payloadFor($this->update($providerPercent, $maximusPercent));
    }

    public function calculate(int $grossAmount): array
    {
        $policy = $this->current();
        $providerFee = intdiv($grossAmount * $policy['providerPercent'], 100);
        $maximusCommission = intdiv($grossAmount * $policy['maximusPercent'], 100);

        return [
            'grossAmount' => $grossAmount,
            'providerFee' => $providerFee,
            'maximusCommission' => $maximusCommission,
            'sellerNet' => max(0, $grossAmount - $providerFee - $maximusCommission),
        ];
    }

    public function payload(): array
    {
        $setting = $this->current();

        return $this->payloadFor($setting);
    }

    private function payloadFor(array $setting): array
    {
        $totalPercent = $setting['providerPercent'] + $setting['maximusPercent'];

        return [
            ...$setting,
            'totalPercent' => $totalPercent,
            'sellerPercent' => 100 - $totalPercent,
            'label' => sprintf(
                '%d %% DiamanoPay, %d %% MAXIMUS, %d %% vendeur.',
                $setting['providerPercent'],
                $setting['maximusPercent'],
                100 - $totalPercent,
            ),
        ];
    }

    private function normalize(array $setting): array
    {
        $providerPercent = isset($setting['providerPercent']) && is_numeric($setting['providerPercent'])
            ? (int) $setting['providerPercent']
            : self::DEFAULT_PROVIDER_PERCENT;
        $maximusPercent = isset($setting['maximusPercent']) && is_numeric($setting['maximusPercent'])
            ? (int) $setting['maximusPercent']
            : self::DEFAULT_MAXIMUS_PERCENT;

        if ($providerPercent < 0 || $maximusPercent < 0 || $providerPercent + $maximusPercent > 100) {
            return [
                'providerPercent' => self::DEFAULT_PROVIDER_PERCENT,
                'maximusPercent' => self::DEFAULT_MAXIMUS_PERCENT,
            ];
        }

        return [
            'providerPercent' => min($providerPercent, 100),
            'maximusPercent' => min($maximusPercent, 100),
        ];
    }
}
