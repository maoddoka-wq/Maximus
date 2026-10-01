<?php

namespace App\Http\Middleware;

use App\Services\EcommerceDomainVerifier;
use App\Services\EcommerceSubscriptionService;
use App\Support\ModuleCatalog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class EnsureEcommerceSubscriptionCurrent
{
    public function __construct(
        private readonly EcommerceDomainVerifier $domainVerifier,
        private readonly EcommerceSubscriptionService $subscriptions,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $companyId = $this->companyId($request);
        if ($companyId === '') {
            return $next($request);
        }

        if (! $this->subscriptions->isManaged($companyId)) {
            return $next($request);
        }

        $moduleStatus = ModuleCatalog::statusFor($companyId, 'ecommerce');
        if (! in_array($moduleStatus, ['ACTIF', 'BETA'], true)) {
            return response()->json([
                'error' => 'Ce site public n’est pas disponible.',
                'code' => 'PUBLIC_SITE_UNAVAILABLE',
            ], 404);
        }

        if (! $this->subscriptions->hasCurrentPeriod($companyId)) {
            return response()->json([
                'error' => 'L’abonnement E-commerce est arrivé à échéance. Renouvelez-le pour rétablir l’accès à la boutique.',
                'code' => 'ECOMMERCE_SUBSCRIPTION_REQUIRED',
                'moduleId' => 'ecommerce',
            ], 403);
        }

        return $next($request);
    }

    private function companyId(Request $request): string
    {
        $route = $request->route();
        $assetCompanyId = is_object($route) ? $route->parameter('company') : null;
        if (is_string($assetCompanyId) && $assetCompanyId !== '') {
            return $assetCompanyId;
        }

        $slug = is_object($route) ? $route->parameter('slug') : null;
        $storeQuery = DB::table('ecommerce_stores')->where('status', 'PUBLISHED');
        if (is_string($slug) && $slug !== '') {
            return (string) ($storeQuery->where('slug', $slug)->value('company_id') ?? '');
        }

        $domain = $this->domainVerifier->activeForHost($request->getHost());
        if (! $domain) {
            return '';
        }

        return (string) ($storeQuery->where('company_id', (string) $domain->company_id)->value('company_id') ?? '');
    }
}