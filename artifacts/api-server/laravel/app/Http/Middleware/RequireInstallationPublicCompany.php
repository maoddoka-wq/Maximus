<?php

namespace App\Http\Middleware;

use App\Services\EcommerceDomainVerifier;
use App\Support\InstallationContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class RequireInstallationPublicCompany
{
    public function __construct(
        private readonly EcommerceDomainVerifier $domainVerifier,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        if (InstallationContext::isCentral()) {
            return $next($request);
        }

        $companyId = InstallationContext::companyId();
        if ($companyId === null) {
            return $this->notFound();
        }

        $route = $request->route();
        $slug = is_object($route) ? $route->parameter('slug') : null;
        $company = is_object($route) ? $route->parameter('company') : null;
        $companyIdParameter = is_object($route) ? $route->parameter('companyId') : null;

        $explicitCompany = is_string($company) && $company !== ''
            ? $company
            : $companyIdParameter;
        if (is_string($explicitCompany) && $explicitCompany !== '') {
            return $explicitCompany === $companyId
                ? $next($request)
                : $this->notFound();
        }

        if (is_string($slug) && $slug !== '') {
            $storeCompanyId = DB::table('ecommerce_stores')
                ->where('slug', $slug)
                ->where('status', 'PUBLISHED')
                ->value('company_id');

            return (string) $storeCompanyId === $companyId
                ? $next($request)
                : $this->notFound();
        }

        $domain = $this->domainVerifier->activeForHost($request->getHost());
        if ($domain && (string) $domain->company_id === $companyId) {
            return $next($request);
        }

        return $this->notFound();
    }

    private function notFound(): Response
    {
        return response()->json([
            'error' => 'Cette ressource publique n’appartient pas à cette installation.',
            'code' => 'INSTALLATION_COMPANY_ONLY',
        ], 404);
    }
}