<?php

namespace App\Http\Middleware;

use App\Support\CompanyRegistry;
use App\Support\ModuleCatalog;
use App\Support\PublicSiteRegistry;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class EnsurePublicSiteGalleryImage
{
    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        $companyParameter = is_object($route) ? $route->parameter('company') : null;
        $imageId = is_object($route) ? $route->parameter('imageId') : null;

        if (! is_string($companyParameter) || $companyParameter === ''
            || ! is_string($imageId) || $imageId === '') {
            return $this->notFound();
        }

        $image = DB::table('ecommerce_gallery_images')
            ->where('id', $imageId)
            ->first(['company_id', 'owner_type', 'owner_id', 'collection']);

        if (! $image || (string) $image->company_id !== $companyParameter) {
            return $this->notFound();
        }

        $companyId = (string) $image->company_id;
        if (! CompanyRegistry::isActive($companyId) || ! $this->isPublishedOnSite($image, $companyId)) {
            return $this->notFound();
        }

        return $next($request);
    }

    private function isPublishedOnSite(object $image, string $companyId): bool
    {
        $ownerId = (string) $image->owner_id;
        $collection = (string) $image->collection;
        $hasPublishedStore = fn (): bool => DB::table('ecommerce_stores')
            ->where('company_id', $companyId)
            ->where('status', 'PUBLISHED')
            ->exists();

        return match ((string) $image->owner_type) {
            'store' => $collection === 'hero'
                && PublicSiteRegistry::isEnabled($companyId, 'ecommerce')
                && DB::table('ecommerce_stores')
                    ->where('id', $ownerId)
                    ->where('company_id', $companyId)
                    ->where('status', 'PUBLISHED')
                    ->exists(),
            'product' => $collection === 'gallery'
                && PublicSiteRegistry::isEnabled($companyId, 'ecommerce')
                && $hasPublishedStore()
                && DB::table('ecommerce_products')
                    ->where('id', $ownerId)
                    ->where('company_id', $companyId)
                    ->where('status', 'PUBLISHED')
                    ->exists(),
            'rental' => $collection === 'gallery'
                && PublicSiteRegistry::isEnabled($companyId, 'ecommerce')
                && $hasPublishedStore()
                && DB::table('ecommerce_rentals')
                    ->where('id', $ownerId)
                    ->where('company_id', $companyId)
                    ->where('status', 'PUBLISHED')
                    ->exists(),
            'immobilier_listing' => $collection === 'gallery'
                && DB::table('immobilier_listings')
                    ->where('id', $ownerId)
                    ->where('company_id', $companyId)
                    ->where('status', 'PUBLISHED')
                    ->exists()
                && (
                    PublicSiteRegistry::isEnabled($companyId, 'immobilier')
                    || (
                        PublicSiteRegistry::isEnabled($companyId, 'ecommerce')
                        && $hasPublishedStore()
                        && ModuleCatalog::allowsFeature($companyId, 'immobilier', 'vitrine-publique')
                    )
                ),
            default => false,
        };
    }

    private function notFound(): Response
    {
        return response()->json([
            'error' => 'Cette image n’est pas publiée sur le site public.',
            'code' => 'PUBLIC_SITE_MEDIA_UNAVAILABLE',
        ], 404);
    }
}