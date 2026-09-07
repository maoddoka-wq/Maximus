<?php

namespace App\Support;

use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Support\CompanyRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

final class MaximusAuth
{
    public const COOKIE = 'maximus_session';

    public static function actor(AuthUser $user): array
    {
        return [
            'role' => $user->role,
            'displayName' => $user->display_name,
            'companyId' => $user->company_id,
            'employeeId' => $user->employee_id,
            'sectorIds' => is_array($user->sector_ids) ? $user->sector_ids : [],
            'permissions' => is_array($user->permissions) ? $user->permissions : [],
        ];
    }

    public static function userFromRequest(Request $request): ?AuthUser
    {
        $token = $request->cookie(self::COOKIE);

        if (! $token) {
            return null;
        }

        $session = AuthSession::query()
            ->where('token_hash', self::hashToken($token))
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if (! $session) {
            return null;
        }

        $user = AuthUser::query()
            ->whereKey($session->user_id)
            ->where('status', 'ACTIF')
            ->first();

        return $user && self::canAuthenticate($user) ? $user : null;
    }

    public static function canAuthenticate(AuthUser $user): bool
    {
        if ($user->status !== 'ACTIF') {
            return false;
        }

        return $user->company_id === null
            || CompanyRegistry::isActive((string) $user->company_id);
    }

    public static function issueSession(AuthUser $user): string
    {
        if (! self::canAuthenticate($user)) {
            throw new \LogicException('Impossible de créer une session pour un compte ou une entreprise inactive.');
        }

        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');

        AuthSession::query()->create([
            'id' => (string) str()->uuid(),
            'token_hash' => self::hashToken($token),
            'user_id' => $user->id,
            'expires_at' => Carbon::now()->addHours(8),
            'created_at' => Carbon::now(),
        ]);

        return $token;
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }
}
