<?php

namespace App\Http\Middleware;

use App\Support\DemoWorkspace;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class BlockDemoLiveConfiguration
{
    public function handle(Request $request, Closure $next): Response
    {
        $companyId = $request->attributes->get('companyId');
        if (is_string($companyId)
            && $companyId !== ''
            && DemoWorkspace::isEnabled($companyId)) {
            return response()->json([
                'error' => 'La configuration publique réelle est masquée en mode Démonstration. Utilisez le catalogue fictif du module E-commerce.',
                'code' => 'DEMO_LIVE_CONFIGURATION_BLOCKED',
            ], 403);
        }

        return $next($request);
    }
}
