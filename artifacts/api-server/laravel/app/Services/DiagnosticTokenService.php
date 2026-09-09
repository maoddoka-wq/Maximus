<?php

namespace App\Services;

use App\Models\AuthUser;
use App\Models\DiagnosticToken;
use App\Support\MaximusAuth;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

final class DiagnosticTokenService
{
    public const SCOPE = 'health:read';

    public function issue(AuthUser $creator, string $label, int $expiresInHours): array
    {
        $plainToken = 'mxdiag_'.Str::random(64);
        $expiresAt = Carbon::now()->addHours($expiresInHours);

        $record = DiagnosticToken::query()->create([
            'id' => (string) Str::uuid(),
            'token_hash' => MaximusAuth::hashToken($plainToken),
            'token_prefix' => substr($plainToken, 0, 16),
            'label' => $label,
            'created_by_user_id' => $creator->id,
            'scope' => self::SCOPE,
            'expires_at' => $expiresAt,
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        return [
            'id' => $record->id,
            'token' => $plainToken,
            'tokenPrefix' => $record->token_prefix,
            'label' => $record->label,
            'scope' => $record->scope,
            'expiresAt' => $record->expires_at?->toISOString(),
        ];
    }

    public function resolve(string $plainToken): ?DiagnosticToken
    {
        $record = DiagnosticToken::query()
            ->where('token_hash', MaximusAuth::hashToken($plainToken))
            ->whereNull('revoked_at')
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if ($record) {
            $record->forceFill([
                'last_used_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ])->save();
        }

        return $record;
    }

    public function summary(DiagnosticToken $token): array
    {
        $status = $token->revoked_at
            ? 'REVOKED'
            : ($token->expires_at?->isPast() ? 'EXPIRED' : 'ACTIVE');

        return [
            'id' => $token->id,
            'tokenPrefix' => $token->token_prefix,
            'label' => $token->label,
            'scope' => $token->scope,
            'status' => $status,
            'expiresAt' => $token->expires_at?->toISOString(),
            'lastUsedAt' => $token->last_used_at?->toISOString(),
            'createdAt' => $token->created_at?->toISOString(),
        ];
    }
}