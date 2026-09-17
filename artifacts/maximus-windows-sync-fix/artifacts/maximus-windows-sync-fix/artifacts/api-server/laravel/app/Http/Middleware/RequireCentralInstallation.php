<?php

namespace App\Http\Middleware;

use App\Support\InstallationContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireCentralInstallation
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!InstallationContext::isCentral()) {
            return response()->json([
                'error' => 'Cette fonctionnalité appartient à l’installation centrale MAXIMUS.',
                'code' => 'CENTRAL_INSTALLATION_ONLY',
            ], 404);
        }

        return $next($request);
    }
}