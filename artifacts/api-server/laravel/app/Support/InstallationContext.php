<?php

namespace App\Support;

use App\Models\AuthUser;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class InstallationContext
{
    public const CENTRAL = 'central';
    public const DEDICATED = 'dedicated';
    public const ON_PREMISE = 'on_premise';

    /** @return list<string> */
    public static function supportedModes(): array
    {
        return [self::CENTRAL, self::DEDICATED, self::ON_PREMISE];
    }

    public static function mode(): string
    {
        return strtolower(trim((string) config('maximus.deployment_mode', self::CENTRAL)));
    }

    public static function isCentral(): bool
    {
        return self::mode() === self::CENTRAL;
    }

    public static function isCompanyOnly(): bool
    {
        return in_array(self::mode(), [self::DEDICATED, self::ON_PREMISE], true);
    }

    public static function companyId(): ?string
    {
        $companyId = trim((string) config('maximus.installation_company_id', ''));

        return $companyId !== '' ? $companyId : null;
    }

    public static function company(): ?Company
    {
        $companyId = self::companyId();

        if ($companyId === null) {
            return null;
        }

        return Company::query()
            ->whereKey($companyId)
            ->where('status', 'ACTIF')
            ->whereNull('deleted_at')
            ->first();
    }

    public static function allowsUser(?AuthUser $user): bool
    {
        if (!in_array(self::mode(), self::supportedModes(), true)) {
            return false;
        }
        if (!$user || !self::isCompanyOnly()) {
            return !self::isCompanyOnly();
        }

        $companyId = self::companyId();

        return $companyId !== null
            && $user->company_id !== null
            && (string) $user->company_id === $companyId;
    }

    public static function configuredLoginSlug(): ?string
    {
        $slug = trim((string) config('maximus.installation_login_slug', ''));

        return $slug !== '' ? $slug : null;
    }

    /** @return array<string, mixed> */
    public static function installationId(): ?string
    {
        $id = trim((string) config('maximus.installation_id', ''));
        return $id !== '' ? $id : null;
    }

    /** @return list<string> */
    public static function trustedHosts(): array
    {
        $hosts = [(string) parse_url((string) config('app.url'), PHP_URL_HOST)];
        if (in_array(strtolower(trim($hosts[0], '[]')), ['localhost', '127.0.0.1', '::1'], true)) {
            $hosts = array_merge($hosts, ['localhost', '127.0.0.1', '::1']);
        }
        if (self::isCentral()) {
            $hosts[] = (string) parse_url((string) config('maximus.central_public_url'), PHP_URL_HOST);
        }
        foreach ((array) config('maximus.preview_hosts', []) as $host) {
            if (is_string($host) && preg_match('/^[a-z0-9.-]+$/iD', $host)) {
                $hosts[] = $host;
            }
        }
        return array_values(array_unique(array_filter(array_map(fn ($host) => strtolower(rtrim(trim($host, '[]'), '.')), $hosts))));
    }

    /** Only state belonging to this configured installation can add hosts. */
    private static function erpAccess(): array
    {
        $empty = ['canonicalUrl' => null, 'allowedHosts' => []];
        if (!self::isCompanyOnly() || self::installationId() === null || self::companyId() === null) {
            return $empty;
        }
        $installation = DB::table('maximus_installations')->where('id', self::installationId())
            ->where('company_id', self::companyId())->where('mode', self::mode())->first();
        if ($installation) {
            if ($installation->revoked_at !== null || $installation->status === 'REVOKED') {
                return $empty;
            }
            $addresses = DB::table('maximus_installation_addresses')->where('installation_id', $installation->id)
                ->where('status', 'ACTIVE')->get();
            return [
                'canonicalUrl' => $addresses->firstWhere('is_primary', true)?->url,
                'allowedHosts' => $addresses->pluck('hostname')->unique()->values()->all(),
            ];
        }
        return class_exists(InstallationSyncState::class) ? InstallationSyncState::erpAccess() : $empty;
    }

    public static function entrypoint(?Request $request = null): string
    {
        if (!in_array(self::mode(), self::supportedModes(), true)) {
            return 'unknown';
        }
        $host = strtolower(rtrim(trim(($request ?? request())->getHost(), '[]'), '.'));
        if (in_array($host, self::trustedHosts(), true)) {
            return self::isCentral() ? 'central' : 'company';
        }
        $access = self::erpAccess();
        if (self::isCompanyOnly() && in_array($host, $access['allowedHosts'] ?? [], true)) {
            return 'company';
        }
        // Central installation rows are never a tenant selector on another server.
        $shop = DB::table('ecommerce_domains')
            ->where('domain', $host)
            ->where('status', 'ACTIVE')
            ->whereNull('deleted_at');
        if (self::isCompanyOnly()) {
            $shop->where('company_id', self::companyId() ?? '');
        }
        return $shop->exists() ? 'shop' : 'unknown';
    }

    public static function publicProfile(?Request $request = null): array
    {
        $company = self::company();
        $companyId = self::companyId();
        $companyOnly = self::isCompanyOnly();
        $entrypoint = self::entrypoint($request);
        $erp = in_array($entrypoint, ['central', 'company'], true);
        $canonical = null;
        if ($erp) {
            $canonical = $companyOnly ? (self::erpAccess()['canonicalUrl'] ?? null) : null;
            $canonical ??= rtrim((string) config('app.url'), '/');
        }

        return [
            'entrypoint' => $entrypoint,
            'canonicalUrl' => $canonical,
            'loginUrl' => $canonical ? rtrim($canonical, '/').'/' : null,
            'installationId' => self::installationId(),
            ...($companyOnly && class_exists(InstallationSyncState::class) ? ['sync' => InstallationSyncState::summary()] : []),
            'mode' => self::mode(),
            'companyOnly' => $companyOnly,
            'ready' => ($erp || $entrypoint === 'shop') && (!$companyOnly || ($companyId !== null && $company !== null)),
            'adminLoginEnabled' => $entrypoint === 'central',
            'registrationEnabled' => $entrypoint === 'central',
            'company' => $company ? [
                'id' => $company->id,
                'name' => (string) $company->name,
                'slug' => $company->login_slug ?: self::configuredLoginSlug(),
                'profilePhoto' => $company->profile_photo,
                'primaryColor' => $company->primary_color ?: '#F2B705',
                'accentColor' => $company->accent_color ?: ($company->primary_color ?: '#F2B705'),
                'sidebarColor' => $company->sidebar_color ?: '#161D27',
            ] : null,
        ];
    }
}