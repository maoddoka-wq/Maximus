<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

final class SellerWalletFeePolicy
{
    public const SETTING_KEY = 'seller_wallet_withdrawal_fee';

    private const DEFAULT_AMOUNT = 100;

    public function current(): array
    {
        $row = DB::table('maximus_platform_settings')->where('key', self::SETTING_KEY)->first();
        $stored = is_string($row?->value)
            ? json_decode($row->value, true)
            : ($row?->value ?? []);

        return $this->normalize(is_array($stored) ? $stored : []);
    }

    public function update(int $amount): array
    {
        $setting = $this->normalize(['amount' => $amount]);

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

    public function fixedAmount(): int
    {
        return $this->current()['amount'];
    }

    public function payload(?array $setting = null): array
    {
        $setting ??= $this->current();

        return [
            ...$setting,
            'label' => $this->label((int) $setting['amount']),
        ];
    }

    private function normalize(array $setting): array
    {
        $amount = isset($setting['amount']) && is_numeric($setting['amount'])
            ? (int) $setting['amount']
            : self::DEFAULT_AMOUNT;

        return [
            'amount' => max(0, min($amount, 1_000_000)),
        ];
    }

    private function label(int $amount): string
    {
        return sprintf('Frais de retrait : %d XOF par opération.', $amount);
    }
}
