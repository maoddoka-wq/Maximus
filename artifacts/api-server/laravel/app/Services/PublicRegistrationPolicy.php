<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

final class PublicRegistrationPolicy
{
    public const SETTING_KEY = 'public_registration_enabled';

    public function enabled(): bool
    {
        $row = DB::table('maximus_platform_settings')->where('key', self::SETTING_KEY)->first();
        if (! $row) {
            return true;
        }

        $stored = is_string($row->value) ? json_decode($row->value, true) : ($row->value ?? null);

        return is_array($stored) ? (bool) ($stored['enabled'] ?? true) : true;
    }

    /** @return array{enabled:bool,label:string} */
    public function payload(): array
    {
        $enabled = $this->enabled();

        return [
            'enabled' => $enabled,
            'label' => $enabled
                ? 'Les nouvelles entreprises peuvent s’inscrire.'
                : 'L’inscription publique est actuellement masquée.',
        ];
    }

    public function update(bool $enabled): array
    {
        DB::table('maximus_platform_settings')->updateOrInsert(
            ['key' => self::SETTING_KEY],
            [
                'value' => json_encode(['enabled' => $enabled], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        return $this->payload();
    }
}