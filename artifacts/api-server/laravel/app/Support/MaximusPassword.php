<?php

namespace App\Support;

use Vinsaj9\Crypto\Scrypt\Scrypt;

final class MaximusPassword
{
    private const COST = 16384;
    private const BLOCK_SIZE = 8;
    private const PARALLELIZATION = 1;
    private const KEY_LENGTH = 64;

    public static function hash(string $password, ?string $salt = null): string
    {
        $salt ??= bin2hex(random_bytes(16));
        $derived = Scrypt::calc(
            $password,
            $salt,
            self::COST,
            self::BLOCK_SIZE,
            self::PARALLELIZATION,
            self::KEY_LENGTH,
        );

        return $salt.':'.bin2hex($derived);
    }

    public static function check(string $password, string $encoded): bool
    {
        [$salt, $expected] = array_pad(explode(':', $encoded, 2), 2, null);

        if (!is_string($salt) || $salt === '' || !is_string($expected) || !ctype_xdigit($expected)) {
            return false;
        }

        $actual = self::hash($password, $salt);
        $actualDigest = substr($actual, strlen($salt) + 1);

        return hash_equals(strtolower($expected), strtolower($actualDigest));
    }
}