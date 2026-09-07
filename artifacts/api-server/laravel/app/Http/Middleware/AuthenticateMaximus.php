<?php

namespace App\Http\Middleware;

use App\Support\MaximusAuth;
use App\Support\CompanyRegistry;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateMaximus
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = MaximusAuth::userFromRequest($request);

        if (!$user) {
            return response()->json([
                'error' => 'Session MAXIMUS absente ou expirée.',
            ], 401);
        }

        if ($user->company_id !== null && !CompanyRegistry::isActive((string) $user->company_id)) {
            return response()->json([
                'error' => 'Cette entreprise n’est plus active ou n’existe plus.',
                'code' => 'COMPANY_UNAVAILABLE',
            ], 403);
        }

        $request->attributes->set('authUser', $user);
        $request->attributes->set('authActor', MaximusAuth::actor($user));

        return $next($request);
    }
}