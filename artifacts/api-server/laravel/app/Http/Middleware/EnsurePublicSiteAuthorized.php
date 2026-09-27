<?php

namespace App\Http\Middleware;

use App\Services\EcommerceDomainVerifier;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class EnsurePublicSiteAuthorized
{
    public function __construct(
        private readonly EcommerceDomainVerifier $domainVerifier,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        $slug = is_object($route) ? $route->parameter('slug') : null;
        $storeQuery = DB::table('ecommerce_stores')->where('status', 'PUBLISHED');

        if (is_string($slug) && $slug !== '') {
            $storeQuery->where('slug', $slug);
        } else {
            $domain = $this->domainVerifier->activeForHost($request->getHost());
            if (! $domain) {
                return $this->notFound();
            }
            $storeQuery->where('company_id', (string) $domain->company_id);
        }

        $store = $storeQuery->first(['company_id']);
        if (! $store || ! DB::table('company_public_site_access')
            ->where('company_id', $store->company_id)
            ->where('enabled', true)
            ->exists()) {
            return $this->notFound();
        }

        return $next($request);
    }

    private function notFound(): Response
    {
        return response()->json([
            'error' => 'Ce site public n’est pas disponible.',
            'code' => 'PUBLIC_SITE_UNAVAILABLE',
        ], 404);
    }
}