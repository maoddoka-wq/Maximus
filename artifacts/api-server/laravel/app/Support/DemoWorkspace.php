<?php

namespace App\Support;

use App\Services\DemoWorkspaceSeeder;
use Illuminate\Support\Facades\DB;

final class DemoWorkspace
{
    private const MODE_SCOPE_PREFIX = 'demo-mode:';
    private const STATE_SCOPE_PREFIX = 'demo-workspace:';

    public static function isEnabled(string $companyId): bool
    {
        return self::mode($companyId)['enabled'];
    }

    /** @return array{enabled: bool, initialized: bool} */
    public static function mode(string $companyId): array
    {
        $row = DB::table('maximus_app_states')
            ->where('scope', self::modeScope($companyId))
            ->first(['payload']);
        $payload = is_string($row?->payload)
            ? json_decode($row->payload, true)
            : ($row?->payload ?? []);
        $payload = is_array($payload) ? $payload : [];

        return [
            'enabled' => ($payload['enabled'] ?? false) === true,
            'initialized' => ($payload['initialized'] ?? false) === true,
        ];
    }

    public static function setEnabled(string $companyId, bool $enabled): array
    {
        $mode = DB::transaction(function () use ($companyId, $enabled): array {
            DB::table('companies')
                ->where('id', $companyId)
                ->lockForUpdate()
                ->first(['id']);
            $scope = self::modeScope($companyId);
            $row = DB::table('maximus_app_states')
                ->where('scope', $scope)
                ->lockForUpdate()
                ->first(['payload', 'version', 'created_at']);
            $payload = is_string($row?->payload)
                ? json_decode($row->payload, true)
                : ($row?->payload ?? []);
            $payload = is_array($payload) ? $payload : [];

            if ($enabled && ($payload['initialized'] ?? false) !== true) {
                app(DemoWorkspaceSeeder::class)->seed($companyId);
                $payload['initialized'] = true;
            }

            $payload['enabled'] = $enabled;
            $payload['companyId'] = $companyId;
            $payload['datasetCompanyId'] = self::datasetCompanyId($companyId);

            DB::table('maximus_app_states')->updateOrInsert(
                ['scope' => $scope],
                [
                    'company_id' => $companyId,
                    'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'version' => ((int) ($row?->version ?? 0)) + 1,
                    'created_at' => $row?->created_at ?? now(),
                    'updated_at' => now(),
                ],
            );

            return [
                'enabled' => $enabled,
                'initialized' => ($payload['initialized'] ?? false) === true,
            ];
        });

        return $mode;
    }

    public static function stateScope(string $companyId): string
    {
        return self::STATE_SCOPE_PREFIX.hash('sha256', $companyId);
    }

    public static function modeScope(string $companyId): string
    {
        return self::MODE_SCOPE_PREFIX.hash('sha256', $companyId);
    }

    public static function datasetCompanyId(string $companyId): string
    {
        return 'demo-'.substr(hash('sha256', $companyId), 0, 32);
    }
}
