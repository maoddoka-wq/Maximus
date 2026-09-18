<?php

namespace App\Http\Middleware;

use App\Support\InstallationContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RequireInstallationHost
{
    public function handle(Request $request, Closure $next): Response
    {
        $validMode = in_array(InstallationContext::mode(), InstallationContext::supportedModes(), true);
        // Keep the identity endpoint accessible before ownership verification/activation.
        if (!$request->is('api/installation') && (!$validMode || ($request->is('api/auth/*')
            && !in_array(InstallationContext::entrypoint($request), ['central', 'company'], true)))) {
            return response()->json([
                'error' => 'Ce nom d’hôte ou mode ne permet pas l’accès à cette installation ERP.',
                'code' => 'INSTALLATION_HOST_NOT_ALLOWED',
            ], 403);
        }
        return $next($request);
    }
}