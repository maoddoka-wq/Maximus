<?php

namespace App\Http\Middleware;

use App\Support\PublicSiteRegistry;
use App\Support\CompanyRegistry;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class EnsurePublicSiteModule
{
    public function handle(Request $request, Closure $next, string $moduleId): Response
    {
        $companyId = null;
        $route = $request->route();
        $slug = is_object($route) ? $route->parameter('slug') : null;
        if (is_string($slug) && $slug !== '') {
            $companyId = DB::table('ecommerce_stores')
                ->where('slug', $slug)
                ->where('status', 'PUBLISHED')
                ->value('company_id');
        } else {
            $domain = DB::table('ecommerce_domains')
                ->where('domain', strtolower(rtrim($request->getHost(), '.')))
                ->where('status', 'ACTIVE')
                ->whereNull('deleted_at')
                ->first();
            $companyId = $domain?->company_id;
        }

        if (! is_string($companyId) || $companyId === '' || ! CompanyRegistry::isActive($companyId)
            || ! PublicSiteRegistry::isEnabled($companyId, $moduleId)) {
            return response()->json([
                'error' => 'Ce module n’est pas publié sur le site public de cette entreprise.',
                'code' => 'PUBLIC_SITE_MODULE_UNAVAILABLE',
                'moduleId' => $moduleId,
            ], 404);
        }

        return $next($request);
    }
}