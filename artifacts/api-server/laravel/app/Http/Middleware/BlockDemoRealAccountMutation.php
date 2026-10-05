<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class BlockDemoRealAccountMutation
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->attributes->get('demoMode') === true && $request->isMethod('GET') === false) {
            return response()->json([
                'error' => 'La gestion des comptes de connexion réels est suspendue en mode Démonstration. Modifiez les fiches fictives dans l’espace de démonstration.',
                'code' => 'DEMO_REAL_ACCOUNT_MUTATION_BLOCKED',
            ], 403);
        }

        return $next($request);
    }
}
