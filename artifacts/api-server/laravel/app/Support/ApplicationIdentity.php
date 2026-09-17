<?php

namespace App\Support;

final class ApplicationIdentity
{
    public const SYNC_PROTOCOL_VERSION = 2;

    public static function deployedVersion(): string
    {
        $configured = trim((string) config('maximus.application_version', ''));
        return $configured !== '' ? $configured : 'unknown';
    }

    public static function packageVersion(): string
    {
        $configured = trim((string) env('MAXIMUS_BUILD_VERSION', ''));
        if ($configured !== '') {
            return $configured;
        }

        $path = base_path('MAXIMUS_BUILD_VERSION');
        if (is_file($path)) {
            $version = trim((string) file_get_contents($path));
            if ($version !== '') {
                return $version;
            }
        }

        return 'unknown';
    }

    public static function expectedVersion(): string
    {
        return trim((string) config('maximus.expected_application_version', ''));
    }
}