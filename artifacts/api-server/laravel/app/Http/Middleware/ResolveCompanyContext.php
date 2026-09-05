<?php

namespace App\Http\Middleware;

use Closure;
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
            if (!$companyId) {
                return response()->json(['error' => 'companyId requis.'], 400);
            }
        }

        $request->attributes->set('companyId', $companyId);
        $request->merge(['companyId' => $companyId]);

        return $next($request);
    }
}