<?php

namespace App\Http\Middleware;

use App\Support\ModuleCatalog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleEnabled
{
    public function handle(Request $request, Closure $next, string $moduleId): Response
    {
        $companyId = $request->attributes->get('companyId');
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) === 'maximus_admin' && !$companyId) {
            return $next($request);
        }

        if (!is_string($companyId) || $companyId === '') {
            return response()->json(['error' => 'Contexte entreprise requis pour ce module.'], 400);
        }

        if (!ModuleCatalog::isEnabled($companyId, $moduleId)) {
            return response()->json([
                'error' => 'Ce module n’est pas activé pour cette entreprise.',
                'moduleId' => $moduleId,
            ], 403);
        }

        return $next($request);
    }
}