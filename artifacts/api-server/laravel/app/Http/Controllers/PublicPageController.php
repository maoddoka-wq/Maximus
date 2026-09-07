<?php

namespace App\Http\Controllers;

use App\Support\CompanyRegistry;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PublicPageController extends Controller
{
    public function shop(Request $request, string $slug, ?string $path = null): Response
    {
        if (! Schema::hasTable('ecommerce_stores')) {
            return $this->shell($request, [
                'title' => 'Boutique en ligne | MAXIMUS',
                'description' => 'Découvrez cette boutique en ligne.',
                'image' => $this->fallbackImage($request),
                'url' => $this->currentUrl($request),
            ]);
        }

        $store = DB::table('ecommerce_stores')
            ->where('slug', rawurldecode($slug))
            ->where('status', 'PUBLISHED')
            ->first();

        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return $this->shell($request, [
                'title' => 'Boutique en ligne | MAXIMUS',
                'description' => 'Découvrez cette boutique en ligne.',
                'image' => $this->fallbackImage($request),
                'url' => $this->currentUrl($request),
            ]);
        }

        return $this->storeShell($request, $store, $path);
    }

    public function root(Request $request, ?string $path = null): Response
    {
        if (! Schema::hasTable('ecommerce_domains') || ! Schema::hasTable('ecommerce_stores')) {
            return $this->shell($request, [
                'title' => 'MAXIMUS ERP',
                'description' => 'MAXIMUS réunit vos équipes, vos opérations et vos chiffres essentiels.',
                'image' => $this->fallbackImage($request),
                'url' => $this->currentUrl($request),
            ]);
        }

        $domain = strtolower(rtrim($request->getHost(), '.'));
        $domainRow = DB::table('ecommerce_domains')
            ->where('domain', $domain)
            ->where('status', 'ACTIVE')
            ->first();

        if ($domainRow) {
            $store = DB::table('ecommerce_stores')
                ->where('company_id', $domainRow->company_id)
                ->where('status', 'PUBLISHED')
                ->first();

            if ($store && CompanyRegistry::isActive((string) $store->company_id)) {
                return $this->storeShell($request, $store, $path);
            }
        }

        return $this->shell($request, [
            'title' => 'MAXIMUS ERP',
            'description' => 'MAXIMUS réunit vos équipes, vos opérations et vos chiffres essentiels.',
            'image' => $this->fallbackImage($request),
            'url' => $this->currentUrl($request),
        ]);
    }

    private function storeShell(Request $request, object $store, ?string $path): Response
    {
        $product = $this->productForPath($store, $path);
        $storeName = trim((string) $store->name) ?: 'Boutique en ligne';
        $storeDescription = trim((string) $store->description) ?: 'Découvrez notre sélection et commandez en ligne.';
        $title = $product
            ? trim((string) $product->name).' | '.$storeName
            : $storeName.' | Boutique en ligne';
        $description = $product
            ? (trim((string) $product->description) ?: 'Découvrez '.trim((string) $product->name).' dans '.$storeName.'.')
            : $storeDescription;

        return $this->shell($request, [
            'title' => $title,
            'description' => $description,
            'image' => $this->publicAssetUrl($request, $product?->image_url ?: $store->logo_url),
            'url' => $this->currentUrl($request),
            'imageAlt' => $product ? trim((string) $product->name) : $storeName,
        ]);
    }

    private function productForPath(object $store, ?string $path): ?object
    {
        $path = trim((string) $path, '/');
        if (! str_starts_with($path, 'produit/')) {
            return null;
        }

        $productSlug = rawurldecode(substr($path, strlen('produit/')));
        if ($productSlug === '' || str_contains($productSlug, '/')) {
            return null;
        }

        return DB::table('ecommerce_products')
            ->where('company_id', $store->company_id)
            ->where('slug', $productSlug)
            ->where('status', 'PUBLISHED')
            ->first();
    }

    private function shell(Request $request, array $meta): Response
    {
        $indexPath = public_path('index.html');
        $html = is_file($indexPath) ? file_get_contents($indexPath) : false;
        if (! is_string($html) || $html === '') {
            $html = <<<'HTML'
<!doctype html>
<html lang="fr">
  <head>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
HTML;
        }

        $title = $this->escape((string) ($meta['title'] ?? 'MAXIMUS ERP'));
        $description = $this->escape((string) ($meta['description'] ?? 'MAXIMUS ERP'));
        $image = $this->escape((string) ($meta['image'] ?? $this->fallbackImage($request)));
        $url = $this->escape((string) ($meta['url'] ?? $this->currentUrl($request)));
        $imageAlt = $this->escape((string) ($meta['imageAlt'] ?? 'MAXIMUS'));

        $html = preg_replace('/<title>.*?<\/title>/is', '', $html) ?? $html;
        $html = preg_replace('/<meta\s+name=["\']description["\'][^>]*>/i', '', $html) ?? $html;
        $html = preg_replace('/<meta\s+property=["\']og:(?:title|description|image|url|type|image:alt)["\'][^>]*>/i', '', $html) ?? $html;
        $html = preg_replace('/<meta\s+name=["\']twitter:(?:card|title|description|image)["\'][^>]*>/i', '', $html) ?? $html;
        $html = preg_replace('/<link\s+rel=["\']canonical["\'][^>]*>/i', '', $html) ?? $html;

        $tags = <<<HTML
    <title>{$title}</title>
    <meta name="description" content="{$description}" />
    <meta property="og:title" content="{$title}" />
    <meta property="og:description" content="{$description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{$url}" />
    <meta property="og:image" content="{$image}" />
    <meta property="og:image:alt" content="{$imageAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{$title}" />
    <meta name="twitter:description" content="{$description}" />
    <meta name="twitter:image" content="{$image}" />
    <link rel="canonical" href="{$url}" />
HTML;

        $html = str_replace('</head>', $tags."\n  </head>", $html);

        return response($html)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=300')
            ->header('Vary', 'Host');
    }

    private function publicAssetUrl(Request $request, ?string $value): string
    {
        $value = trim((string) $value);
        if ($value === '' || str_starts_with(strtolower($value), 'data:') || str_starts_with(strtolower($value), 'blob:')) {
            return $this->fallbackImage($request);
        }

        if (str_starts_with($value, '/')) {
            return $this->origin($request).$value;
        }

        if (filter_var($value, FILTER_VALIDATE_URL) && str_starts_with(strtolower($value), 'https://')) {
            return $value;
        }

        return $this->fallbackImage($request);
    }

    private function fallbackImage(Request $request): string
    {
        return $this->origin($request).'/maximus-og.svg';
    }

    private function currentUrl(Request $request): string
    {
        return $this->origin($request).($request->getPathInfo() ?: '/');
    }

    private function origin(Request $request): string
    {
        $host = $request->getHost();
        $forwardedProto = strtolower(trim(explode(',', (string) $request->header('X-Forwarded-Proto'))[0] ?? ''));
        $scheme = in_array($forwardedProto, ['http', 'https'], true)
            ? $forwardedProto
            : (in_array($host, ['localhost', '127.0.0.1'], true) ? $request->getScheme() : 'https');
        $forwardedPort = trim(explode(',', (string) $request->header('X-Forwarded-Port'))[0] ?? '');
        $port = ctype_digit($forwardedPort)
            ? (int) $forwardedPort
            : ($scheme === 'https' ? 443 : $request->getPort());
        $defaultPort = ($scheme === 'https' && $port === 443) || ($scheme === 'http' && $port === 80);

        return $scheme.'://'.$host.($defaultPort ? '' : ':'.$port);
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}