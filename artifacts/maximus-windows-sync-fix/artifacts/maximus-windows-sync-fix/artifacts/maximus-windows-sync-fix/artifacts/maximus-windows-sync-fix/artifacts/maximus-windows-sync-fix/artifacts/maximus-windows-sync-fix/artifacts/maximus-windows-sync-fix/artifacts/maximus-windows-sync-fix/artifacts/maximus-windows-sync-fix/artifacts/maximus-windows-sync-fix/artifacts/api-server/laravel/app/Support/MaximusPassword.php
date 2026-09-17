<?php

namespace App\Support;

use Vinsaj9\Crypto\Scrypt\Scrypt;

final class MaximusPassword
{
    private const BCRYPT_COST = 12;
    private const COST = 16384;
    private const BLOCK_SIZE = 8;
    private const PARALLELIZATION = 1;
    private const KEY_LENGTH = 64;

    public static function hash(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, [
            'cost' => self::BCRYPT_COST,
        ]);
    }

    public static function needsRehash(string $encoded): bool
    {
        return ! str_starts_with($encoded, '$2y$')
            || password_needs_rehash($encoded, PASSWORD_BCRYPT, ['cost' => self::BCRYPT_COST]);
    }

    public static function check(string $password, string $encoded): bool
    {
        if (! self::needsRehash($encoded)) {
            return password_verify($password, $encoded);
        }

        return self::checkLegacyScrypt($password, $encoded);
    }

    private static function checkLegacyScrypt(string $password, string $encoded): bool
    {
        [$salt, $expected] = array_pad(explode(':', $encoded, 2), 2, null);

        if (!is_string($salt) || $salt === '' || !is_string($expected) || !ctype_xdigit($expected)) {
            return false;
        }

        $derived = Scrypt::calc(
            $password,
            $salt,
            self::COST,
            self::BLOCK_SIZE,
            self::PARALLELIZATION,
            self::KEY_LENGTH,
        );

        return hash_equals(strtolower($expected), strtolower(bin2hex($derived)));
    }
}