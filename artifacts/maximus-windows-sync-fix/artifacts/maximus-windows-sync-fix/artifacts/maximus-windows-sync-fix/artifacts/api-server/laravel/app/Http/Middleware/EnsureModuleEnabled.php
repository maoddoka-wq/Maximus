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

        if (($actor['role'] ?? null) === 'maximus_admin') {
            return $next($request);
        }

        $status = ModuleCatalog::statusFor($companyId, $moduleId);
        if ($status === 'MAINTENANCE') {
            return response()->json([
                'error' => 'Ce module est temporairement en maintenance.',
                'code' => 'MODULE_MAINTENANCE',
                'moduleId' => $moduleId,
                'status' => $status,
            ], 503);
        }

        if (!in_array($status, ['ACTIF', 'BETA'], true)) {
            return response()->json([
                'error' => 'Ce module n’est pas activé pour cette entreprise.',
                'moduleId' => $moduleId,
                'status' => $status,
            ], 403);
        }

        return $next($request);
    }
}