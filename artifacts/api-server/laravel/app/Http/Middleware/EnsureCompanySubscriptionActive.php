<?php

namespace App\Http\Middleware;

use App\Services\CompanySubscriptionEntitlement;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureCompanySubscriptionActive
{
    public function __construct(
        private readonly CompanySubscriptionEntitlement $entitlement,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $actor = $request->attributes->get('authActor');
        if (! is_array($actor) || ($actor['role'] ?? null) === 'maximus_admin') {
            return $next($request);
        }

        $companyId = $request->attributes->get('companyId') ?? ($actor['companyId'] ?? null);
        if (! is_string($companyId) || $companyId === '') {
            return $next($request);
        }

        $subscription = $this->entitlement->statusForCompany($companyId);
        if (in_array($subscription['status'], ['FREE', 'ACTIVE'], true)) {
            return $next($request);
        }

        return response()->json([
            'error' => $subscription['status'] === 'EXPIRED'
                ? 'Votre abonnement a expiré. Réglez l’échéance pour rétablir l’accès.'
                : 'Aucun abonnement actif n’est enregistré pour cette entreprise.',
            'code' => 'SUBSCRIPTION_REQUIRED',
            'subscription' => $subscription,
        ], 402)->header('Cache-Control', 'private, no-store');
    }
}