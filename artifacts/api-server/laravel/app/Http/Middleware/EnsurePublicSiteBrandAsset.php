<?php

namespace App\Http\Middleware;

use App\Support\CompanyRegistry;
use App\Support\PublicSiteRegistry;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class EnsurePublicSiteBrandAsset
{
    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        $companyId = is_object($route) ? $route->parameter('company') : null;
        $filename = is_object($route) ? $route->parameter('filename') : null;

        if (! is_string($companyId) || $companyId === ''
            || ! is_string($filename) || $filename === ''
            || ! CompanyRegistry::isActive($companyId)
            || ! PublicSiteRegistry::isSiteEnabled($companyId)) {
            return $this->notFound();
        }

        $logoUrl = '/api/store-logos/'.$companyId.'/'.$filename;
        $isPublishedBrand = DB::table('ecommerce_stores')
            ->where('company_id', $companyId)
            ->where('status', 'PUBLISHED')
            ->where('logo_url', $logoUrl)
            ->exists();

        if (! $isPublishedBrand) {
            return $this->notFound();
        }

        return $next($request);
    }

    private function notFound(): Response
    {
        return response()->json([
            'error' => 'Cette image de marque n’est pas publiée sur le site de l’entreprise.',
            'code' => 'PUBLIC_SITE_BRAND_UNAVAILABLE',
        ], 404);
    }
}