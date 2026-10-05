<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class BlockDemoMoneyMovement
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->attributes->get('demoMode') === true) {
            return response()->json([
                'error' => 'Les paiements et virements réels sont désactivés en mode Démonstration.',
                'code' => 'DEMO_MONEY_MOVEMENT_BLOCKED',
            ], 403);
        }

        return $next($request);
    }
}
