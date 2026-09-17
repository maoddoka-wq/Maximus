<?php

namespace App\Http\Middleware;

use Closure;
use App\Support\CompanyRegistry;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveCompanyContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $actor = $request->attributes->get('authActor');
        if (!is_array($actor)) {
            return response()->json(['error' => 'Acteur MAXIMUS introuvable.'], 401);
        }

        $requestedCompany = $request->query('companyId', $request->input('companyId'));
        $requestedCompany = is_string($requestedCompany) && $requestedCompany !== ''
            ? $requestedCompany
            : null;
        $actorCompany = is_string($actor['companyId'] ?? null) && $actor['companyId'] !== ''
            ? $actor['companyId']
            : null;

        if ($actor['role'] !== 'maximus_admin') {
            if (!$actorCompany) {
                return response()->json(['error' => 'Aucune entreprise n’est associée à cet acteur.'], 403);
            }
            if ($requestedCompany && $requestedCompany !== $actorCompany) {
                return response()->json(['error' => 'Accès à cette entreprise non autorisé.'], 403);
            }
            $companyId = $actorCompany;
        } else {
            $companyId = $requestedCompany ?? $actorCompany;
        }

        if ($companyId !== null && !CompanyRegistry::isActive($companyId)) {
            $legacyModuleProvisioning = ($actor['role'] ?? null) === 'maximus_admin'
                && str_ends_with($request->path(), '/access');
            if (!$legacyModuleProvisioning) {
                return response()->json([
                    'error' => 'Cette entreprise n’est plus active ou n’existe plus.',
                    'code' => 'COMPANY_UNAVAILABLE',
                ], 403);
            }
        }

        $request->attributes->set('companyId', $companyId);
        $request->merge(['companyId' => $companyId]);

        return $next($request);
    }
}