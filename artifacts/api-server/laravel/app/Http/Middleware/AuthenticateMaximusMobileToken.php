<?php

namespace App\Http\Middleware;

use App\Models\AuthUser;
use App\Models\MobileAuthToken;
use App\Support\CompanyRegistry;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateMaximusMobileToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainToken = $request->bearerToken();
        if (! $plainToken) {
            return response()->json(['error' => 'Jeton mobile absent ou invalide.'], 401);
        }

        if (! $this->allowsRequest($request)) {
            return response()->json(['error' => 'Ce jeton chauffeur ne peut pas appeler cette route.'], 403);
        }

        $token = MobileAuthToken::query()
            ->where('token_hash', MaximusAuth::hashToken($plainToken))
            ->where('expires_at', '>', now())
            ->first();
        if (! $token) {
            return response()->json(['error' => 'Session chauffeur absente ou expirée.'], 401);
        }

        $user = AuthUser::query()
            ->whereKey($token->user_id)
            ->where('status', 'ACTIF')
            ->first();
        if (
            ! $user
            || $user->role !== 'employee'
            || empty($user->company_id)
            || empty($user->employee_id)
            || ! MaximusAuth::canAuthenticate($user)
            || ! CompanyRegistry::isActive((string) $user->company_id)
            || ! ModuleCatalog::isEnabled((string) $user->company_id, 'transport')
        ) {
            return response()->json(['error' => 'Compte chauffeur inactif ou accès Transport retiré.'], 403);
        }

        $driverExists = \Illuminate\Support\Facades\DB::table('transport_drivers')
            ->where('company_id', $user->company_id)
            ->where('employee_id', $user->employee_id)
            ->where('status', 'ACTIVE')
            ->exists();
        if (! $driverExists) {
            return response()->json(['error' => 'Le profil chauffeur n’est plus actif.'], 403);
        }

        if (! $token->last_used_at || $token->last_used_at->lt(now()->subMinutes(5))) {
            $token->forceFill(['last_used_at' => now()])->save();
        }

        $request->attributes->set('mobileAuthToken', $token);
        $request->attributes->set('authUser', $user);
        $request->attributes->set('authActor', MaximusAuth::actor($user));

        return $next($request);
    }

    private function allowsRequest(Request $request): bool
    {
        $path = trim($request->path(), '/');
        $method = strtoupper($request->method());

        if ($method === 'GET') {
            return in_array($path, [
                'api/auth/mobile/session',
                'api/transport/bootstrap',
                'api/transport/mobile/releases/latest',
                'api/transport/mobile/releases/latest/download',
            ], true);
        }

        if ($method === 'POST') {
            return $path === 'api/auth/mobile/logout';
        }

        if ($method !== 'PATCH') {
            return false;
        }

        return preg_match('#^api/transport/drivers/[^/]+/(location|availability)$#', $path) === 1
            || preg_match('#^api/transport/trips/[^/]+/status$#', $path) === 1;
    }
}