<?php

namespace App\Services;

use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;

final class SellerWalletMaturityPolicy
{
    public const MODE_AUTOMATIC = 'AUTOMATIC';

    public const MODE_DAYS = 'DAYS';

    public const MODE_WEEKS = 'WEEKS';

    private const SETTING_KEY = 'seller_wallet_maturity';

    private const DEFAULT_MODE = self::MODE_AUTOMATIC;

    private const DEFAULT_VALUE = null;

    public function current(): array
    {
        $row = DB::table('maximus_platform_settings')->where('key', self::SETTING_KEY)->first();
        $stored = is_string($row?->value)
            ? json_decode($row->value, true)
            : ($row?->value ?? []);

        return $this->normalize(is_array($stored) ? $stored : []);
    }

    public function update(string $mode, ?int $value): array
    {
        $setting = $this->normalize([
            'mode' => $mode,
            'value' => $value,
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

    public function availableAt(string $orderStatus, DateTimeInterface|string|null $paidAt = null): ?Carbon
    {
        $base = $paidAt instanceof DateTimeInterface
            ? Carbon::instance($paidAt)
            : ($paidAt ? Carbon::parse($paidAt) : now());

        if ($orderStatus === 'LIVRÉE') {
            return $base->copy();
        }

        $setting = $this->current();
        if ($setting['mode'] === self::MODE_AUTOMATIC) {
            return null;
        }

        $days = $setting['mode'] === self::MODE_WEEKS
            ? $setting['value'] * 7
            : $setting['value'];

        return $base->copy()->addDays($days);
    }

    public function payload(): array
    {
        return $this->payloadFor($this->current());
    }

    public function payloadFor(array $setting): array
    {

        return [
            ...$setting,
            'label' => $this->label($setting),
        ];
    }

    private function normalize(array $setting): array
    {
        $mode = strtoupper(trim((string) ($setting['mode'] ?? self::DEFAULT_MODE)));
        if (! in_array($mode, [self::MODE_AUTOMATIC, self::MODE_DAYS, self::MODE_WEEKS], true)) {
            $mode = self::DEFAULT_MODE;
        }

        $value = isset($setting['value']) && is_numeric($setting['value'])
            ? (int) $setting['value']
            : self::DEFAULT_VALUE;
        if ($mode === self::MODE_AUTOMATIC) {
            $value = null;
        } else {
            $value = max(1, min($value, 3650));
        }

        return [
            'mode' => $mode,
            'value' => $value,
        ];
    }

    private function label(array $setting): string
    {
        return match ($setting['mode']) {
            self::MODE_AUTOMATIC => 'Libération automatique à la livraison.',
            self::MODE_WEEKS => sprintf(
                'Après %d semaine%s, ou dès la livraison.',
                $setting['value'],
                $setting['value'] > 1 ? 's' : '',
            ),
            default => sprintf(
                'Après %d jour%s, ou dès la livraison.',
                $setting['value'],
                $setting['value'] > 1 ? 's' : '',
            ),
        };
    }
}
