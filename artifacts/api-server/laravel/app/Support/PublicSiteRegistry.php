<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class PublicSiteRegistry
{
    /** @return list<array{id:string,label:string,path:string}> */
    public static function definitions(): array
    {
        $paths = [
            'ecommerce' => '/boutique',
            'transport' => '/transport',
            'immobilier' => '/immobilier',
        ];

        return collect(ModuleCatalog::definitionsWithCustom())
            ->filter(fn (array $definition): bool => isset($paths[$definition['id']]))
            ->map(fn (array $definition): array => [
                'id' => (string) $definition['id'],
                'label' => (string) ($definition['name'] ?? $definition['id']),
                'path' => $paths[$definition['id']],
            ])
            ->values()
            ->all();
    }

    public static function isRegistered(string $moduleId): bool
    {
        return collect(self::definitions())->contains('id', $moduleId);
    }

    /** @return list<array{id:string,label:string,path:string}> */
    public static function availableModules(string $companyId): array
    {
        return collect(self::definitions())
            ->filter(fn (array $module): bool => in_array(
                ModuleCatalog::statusFor($companyId, $module['id']),
                ['ACTIF', 'BETA'],
                true,
            ))
            ->values()
            ->all();
    }

    /** @return list<string> */
    public static function validModuleIds(string $companyId): array
    {
        return array_values(array_map(
            static fn (array $module): string => $module['id'],
            self::availableModules($companyId),
        ));
    }

    public static function site(string $companyId): ?object
    {
        return DB::table('company_public_sites')->where('company_id', $companyId)->first();
    }

    /** @return list<string> */
    public static function selectedModules(string $companyId): array
    {
        $site = self::site($companyId);
        $selected = is_string($site?->module_ids)
            ? json_decode($site->module_ids, true)
            : ($site?->module_ids ?? []);

        return is_array($selected) ? array_values(array_map('strval', $selected)) : [];
    }

    public static function isSiteEnabled(string $companyId): bool
    {
        $site = self::site($companyId);

        return $site
            && (bool) $site->maximus_enabled
            && (bool) $site->company_enabled;
    }

    public static function isEnabled(string $companyId, string $moduleId): bool
    {
        return self::isSiteEnabled($companyId)
            && in_array($moduleId, self::selectedModules($companyId), true)
            && in_array(ModuleCatalog::statusFor($companyId, $moduleId), ['ACTIF', 'BETA'], true)
            && self::isRegistered($moduleId);
    }
}