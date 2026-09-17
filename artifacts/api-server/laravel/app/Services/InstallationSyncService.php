<?php

namespace App\Services;

use App\Models\Company;
use App\Support\ModuleCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;

final class InstallationSyncService
{
    /** @return array<string, mixed> */
    public function fetch(): array
    {
        $baseUrl = rtrim((string) config('maximus.central_url', ''), '/');
        $token = trim((string) config('maximus.installation_token', ''));
        if ($baseUrl === '' || $token === '') {
            throw new RuntimeException('MAXIMUS_CENTRAL_URL et MAXIMUS_INSTALLATION_TOKEN sont requis.');
        }

        $response = Http::retry(3, 1500)
            ->connectTimeout(10)
            ->timeout(30)
            ->acceptJson()
            ->withToken($token)
            ->get($baseUrl.'/api/installation-sync/configuration');

        if (! $response->successful()) {
            throw new RuntimeException('MAXIMUS principal a refusé la synchronisation (HTTP '.$response->status().').');
        }

        $payload = $response->json();
        if (! is_array($payload) || ! is_array($payload['company'] ?? null)) {
            throw new RuntimeException('La configuration reçue de MAXIMUS est invalide.');
        }

        return $payload;
    }

    /** @param array<string, mixed> $payload */
    public function apply(array $payload): Company
    {
        $companyData = is_array($payload['company'] ?? null) ? $payload['company'] : [];
        $companyId = trim((string) ($companyData['id'] ?? ''));
        $moduleData = is_array($payload['modules'] ?? null) ? $payload['modules'] : [];
        $moduleIds = array_values(array_unique(array_map('strval', is_array($moduleData['ids'] ?? null) ? $moduleData['ids'] : [])));
        if ($companyId === '' || $moduleIds === []) {
            throw new RuntimeException('La configuration centrale ne contient pas d’entreprise ou de module.');
        }

        $this->applyPublishedCatalog(
            is_array($payload['catalog'] ?? null) ? $payload['catalog'] : [],
        );
        ModuleCatalog::ensureCatalog();
        $packIds = is_array($moduleData['packIds'] ?? null) ? $moduleData['packIds'] : [];
        $featureIds = is_array($moduleData['featureIds'] ?? null) ? $moduleData['featureIds'] : [];
        $permissions = is_array($moduleData['permissions'] ?? null) ? $moduleData['permissions'] : [];
        $normalizedPacks = [];
        $normalizedFeatures = [];
        $normalizedPermissions = [];
        foreach ($moduleIds as $moduleId) {
            if (! ModuleCatalog::isPublishedModule($moduleId)) {
                throw new RuntimeException("Le module « {$moduleId} » n’est pas publié localement.");
            }
            try {
                $selection = ModuleCatalog::normalizeSelection(
                    $moduleId,
                    is_array($featureIds[$moduleId] ?? null) ? $featureIds[$moduleId] : [],
                    [
                        'packIds' => is_array($packIds[$moduleId] ?? null) ? $packIds[$moduleId] : [],
                        'featurePermissions' => is_array($permissions[$moduleId] ?? null) ? $permissions[$moduleId] : [],
                    ],
                );
            } catch (\InvalidArgumentException $exception) {
                throw new RuntimeException($exception->getMessage(), previous: $exception);
            }
            $normalizedPacks[$moduleId] = $selection['configuration']['packIds'];
            $normalizedFeatures[$moduleId] = $selection['featureIds'];
            $normalizedPermissions[$moduleId] = $selection['configuration']['featurePermissions'];
        }

        $company = DB::transaction(function () use (
            $companyData,
            $companyId,
            $moduleIds,
            $normalizedPacks,
            $normalizedFeatures,
            $normalizedPermissions,
            $payload,
        ): Company {
            $company = Company::query()->updateOrCreate(
                ['id' => $companyId],
                [
                    'name' => trim((string) ($companyData['name'] ?? '')),
                    'manager' => trim((string) ($companyData['manager'] ?? '')),
                    'email' => Str::lower(trim((string) ($companyData['email'] ?? ''))),
                    'phone' => trim((string) ($companyData['phone'] ?? '')),
                    'country' => trim((string) ($companyData['country'] ?? '')),
                    'sector' => trim((string) ($companyData['sector'] ?? '')),
                    'status' => 'ACTIF',
                    'requested_modules' => $moduleIds,
                    'requested_module_pack_ids' => $normalizedPacks,
                    'requested_module_features' => $normalizedFeatures,
                    'requested_module_permissions' => $normalizedPermissions,
                    'login_custom_allowed' => false,
                    'login_mode' => 'MAXIMUS',
                    'login_slug' => trim((string) ($companyData['loginSlug'] ?? '')) ?: null,
                    'deleted_at' => null,
                    'updated_at' => now(),
                ],
            );

            DB::table('maximus_company_modules')->where('company_id', $companyId)->delete();
            foreach ($moduleIds as $moduleId) {
                DB::table('maximus_company_modules')->insert([
                    'id' => 'company-module-'.Str::slug($companyId.'-'.$moduleId),
                    'company_id' => $companyId,
                    'module_id' => $moduleId,
                    'status' => 'ACTIF',
                    'feature_ids' => json_encode($normalizedFeatures[$moduleId], JSON_UNESCAPED_UNICODE),
                    'configuration' => json_encode(['packIds' => $normalizedPacks[$moduleId], 'featurePermissions' => $normalizedPermissions[$moduleId]], JSON_UNESCAPED_UNICODE),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            if (Schema::hasTable('ecommerce_domains')) {
                DB::table('ecommerce_domains')->where('company_id', $companyId)->delete();
                foreach ((array) ($payload['domains'] ?? []) as $domain) {
                    if (! is_array($domain) || trim((string) ($domain['domain'] ?? '')) === '') {
                        continue;
                    }
                    DB::table('ecommerce_domains')->insert([
                        'id' => (string) ($domain['id'] ?? 'domain-'.Str::uuid()),
                        'company_id' => $companyId,
                        'domain' => (string) $domain['domain'],
                        'target_host' => (string) ($domain['targetHost'] ?? ''),
                        'verification_token' => (string) ($domain['verificationValue'] ?? ''),
                        'status' => (string) ($domain['status'] ?? 'PENDING'),
                        'last_error' => (string) ($domain['lastError'] ?? ''),
                        'verified_at' => $domain['verifiedAt'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            return $company->fresh();
        });

        return $company;
    }

    /** @param array<string, mixed> $catalog */
    private function applyPublishedCatalog(array $catalog): void
    {
        DB::transaction(function () use ($catalog): void {
            $current = DB::table('maximus_app_states')
                ->where('scope', 'workspace')
                ->lockForUpdate()
                ->first();
            $payload = is_string($current?->payload)
                ? json_decode($current->payload, true)
                : ($current?->payload ?? []);
            $state = is_array($payload) ? $payload : [];

            foreach (['moduleOverrides', 'moduleStatuses', 'customModules', 'removedModules'] as $key) {
                if (array_key_exists($key, $catalog) && is_array($catalog[$key])) {
                    $state[$key] = $catalog[$key];
                }
            }
            if (array_key_exists('catalogVersion', $catalog)) {
                $state['catalogVersion'] = (int) $catalog['catalogVersion'];
            }

            DB::table('maximus_app_states')->updateOrInsert(
                ['scope' => 'workspace'],
                [
                    'company_id' => null,
                    'payload' => json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'version' => ((int) ($current?->version ?? 0)) + 1,
                    'updated_at' => now(),
                    'created_at' => $current?->created_at ?? now(),
                ],
            );
        });
    }

    public function heartbeat(): void
    {
        $baseUrl = rtrim((string) config('maximus.central_url', ''), '/');
        $token = trim((string) config('maximus.installation_token', ''));
        if ($baseUrl === '' || $token === '') {
            return;
        }
        Http::timeout(10)->withToken($token)->post($baseUrl.'/api/installation-sync/heartbeat', [
            'appliedVersion' => (int) DB::table('maximus_installations')->max('configuration_version'),
        ]);
    }
}