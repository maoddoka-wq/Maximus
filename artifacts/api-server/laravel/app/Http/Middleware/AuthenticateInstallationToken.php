<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateInstallationToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $authorization = trim((string) $request->header('Authorization', ''));
        $token = str_starts_with($authorization, 'Bearer ')
            ? trim(substr($authorization, 7))
            : trim((string) $request->header('X-MAXIMUS-INSTALLATION-TOKEN', ''));

        if ($token === '') {
            return response()->json(['error' => 'Jeton d’installation absent.'], 401);
        }

        $installation = DB::table('maximus_installations')
            ->where('token_hash', hash('sha256', $token))
            ->first();

        if (! $installation) {
            return response()->json(['error' => 'Jeton d’installation invalide ou révoqué.'], 401);
        }
        if ($installation->revoked_at !== null || $installation->status === 'REVOKED') {
            return response()->json([
                'error' => 'Cette installation a été révoquée par MAXIMUS.',
                'code' => 'INSTALLATION_REVOKED',
            ], 401);
        }

        $request->attributes->set('installation', $installation);

        return $next($request);
    }
}