<?php

namespace App\Support;

use App\Models\AuthUser;
use App\Models\Company;

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
    public static function publicProfile(): array
    {
        $company = self::company();
        $companyId = self::companyId();
        $companyOnly = self::isCompanyOnly();

        return [
            'mode' => self::mode(),
            'companyOnly' => $companyOnly,
            'ready' => !$companyOnly || ($companyId !== null && $company !== null),
            'adminLoginEnabled' => self::isCentral(),
            'registrationEnabled' => self::isCentral(),
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