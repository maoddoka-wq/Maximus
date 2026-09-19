<?php

namespace App\Http\Middleware;

use App\Services\EcommerceDomainVerifier;
use App\Support\CompanyRegistry;
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
        $installationCompanyId = InstallationContext::companyId();
        if (! InstallationContext::isCentral()
            && ($installationCompanyId === null || ! $this->isActiveCompany($installationCompanyId))) {
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
            return $this->allowsCompany($explicitCompany, $installationCompanyId)
                ? $next($request) : $this->notFound();
        }

        if (is_string($slug) && $slug !== '') {
            $storeCompanyId = DB::table('ecommerce_stores')
                ->where('slug', $slug)
                ->where('status', 'PUBLISHED')
                ->value('company_id');

            if ($storeCompanyId !== null) {
                return $this->allowsCompany((string) $storeCompanyId, $installationCompanyId)
                    ? $next($request) : $this->notFound();
            }

            return InstallationContext::isCentral() ? $next($request) : $this->notFound();
        }

        $domain = $this->domainVerifier->activeForHost($request->getHost());
        if ($domain) {
            return $this->allowsCompany((string) $domain->company_id, $installationCompanyId)
                ? $next($request) : $this->notFound();
        }

        // Central controllers retain their normal response for an unknown domain.
        // A company-only installation must never use an unresolved host as a tenant selector.
        return InstallationContext::isCentral() ? $next($request) : $this->notFound();
    }

    private function allowsCompany(string $companyId, ?string $installationCompanyId): bool
    {
        return (InstallationContext::isCentral() || $companyId === $installationCompanyId)
            && $this->isActiveCompany($companyId);
    }

    private function isActiveCompany(string $companyId): bool
    {
        return CompanyRegistry::isActive($companyId);
    }

    private function notFound(): Response
    {
        return response()->json([
            'error' => 'Cette ressource publique n’appartient pas à cette installation.',
            'code' => 'INSTALLATION_COMPANY_ONLY',
        ], 404);
    }
}