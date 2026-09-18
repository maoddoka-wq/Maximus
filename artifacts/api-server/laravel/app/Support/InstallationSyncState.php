<?php

namespace App\Support;

use RuntimeException;

/**
 * Public contract: summary() never exposes credentials; erpAccess() returns only
 * the last committed mapping for THIS configured company and installation.
 * This is operational status, never an authentication/expiry gate.
 */
final class InstallationSyncState
{
    public static function summary(): array
    {
        $state = self::read();
        return array_intersect_key($state, array_flip([
            'lastAttemptAt', 'lastSuccessAt', 'state', 'lastError', 'versionWarning',
        ]));
    }

    public static function erpAccess(): array
    {
        return self::read()['erpAccess'] ?? ['canonicalUrl' => null, 'allowedHosts' => []];
    }

    public static function configurationVersion(): int
    {
        return (int) (self::read()['configurationVersion'] ?? 0);
    }

    public static function record(array $values): void
    {
        $path = self::path();
        $directory = dirname($path);
        if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('Le stockage local de synchronisation est inaccessible.');
        }
        $lock = fopen($path.'.lock', 'c');
        if ($lock === false) {
            throw new RuntimeException('Le verrou local de synchronisation est inaccessible.');
        }
        $temporary = null;
        try {
            if (! flock($lock, LOCK_EX)) {
                throw new RuntimeException('Impossible de verrouiller l’état local.');
            }
            $allowed = array_flip(['lastAttemptAt', 'lastSuccessAt', 'state', 'lastError', 'versionWarning', 'erpAccess', 'configurationVersion']);
            $state = array_replace(self::read(), array_intersect_key($values, $allowed));
            $state['companyId'] = InstallationContext::companyId();
            $state['installationId'] = (string) config('maximus.installation_id', '');
            $state['mode'] = InstallationContext::mode();
            $json = json_encode($state, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
            $temporary = tempnam($directory, '.sync-');
            if ($temporary === false || file_put_contents($temporary, $json) !== strlen($json)) {
                throw new RuntimeException('Impossible d’écrire l’état local de synchronisation.');
            }
            chmod($temporary, 0600);
            if (! rename($temporary, $path)) {
                throw new RuntimeException('Impossible de publier l’état local de synchronisation.');
            }
        } finally {
            if ($temporary && is_file($temporary)) {
                unlink($temporary);
            }
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private static function path(): string
    {
        $scope = (string) InstallationContext::companyId()."\0".(string) config('maximus.installation_id', '')."\0".InstallationContext::mode();
        return storage_path('app/installation-sync/'.hash('sha256', $scope).'.json');
    }

    private static function read(): array
    {
        $empty = [
            'lastAttemptAt' => null, 'lastSuccessAt' => null, 'state' => 'never_synced',
            'lastError' => null, 'versionWarning' => null,
        ];
        $path = self::path();
        if (! is_file($path)) {
            return $empty;
        }
        $json = file_get_contents($path);
        $state = is_string($json) ? json_decode($json, true) : null;
        if (! is_array($state)
            || ($state['companyId'] ?? null) !== InstallationContext::companyId()
            || ($state['installationId'] ?? null) !== (string) config('maximus.installation_id', '')
            || ($state['mode'] ?? null) !== InstallationContext::mode()) {
            return array_replace($empty, [
                'state' => 'storage_error',
                'lastError' => 'État local invalide : restaurer la sauvegarde ou refaire un enrôlement strict.',
            ]);
        }
        return array_replace($empty, $state);
    }
}