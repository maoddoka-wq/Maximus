<?php

namespace App\Http\Middleware;

use App\Support\MaximusAuth;
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

        $request->attributes->set('authUser', $user);
        $request->attributes->set('authActor', MaximusAuth::actor($user));

        return $next($request);
    }
}