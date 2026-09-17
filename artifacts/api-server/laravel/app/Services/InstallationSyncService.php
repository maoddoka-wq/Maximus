<?php

namespace App\Services;

use App\Models\Company;
use App\Support\ModuleCatalog;
use App\Support\ApplicationIdentity;
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

        $response = Http::timeout(20)
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
        $centralVersion = trim((string) ($payload['applicationVersion'] ?? ''));
        $expectedVersion = ApplicationIdentity::expectedVersion();
        $packageVersion = ApplicationIdentity::packageVersion();
        if ($centralVersion === '' || $centralVersion === 'unknown') {
            throw new RuntimeException('MAXIMUS principal ne publie pas encore son identifiant de version. Déployez la version actuelle avant de synchroniser.');
        }
        if ($expectedVersion === '' || $expectedVersion !== $centralVersion) {
            throw new RuntimeException('Le bootstrap ne correspond pas à la version actuellement servie par MAXIMUS principal. Générez un nouveau bootstrap.');
        }
        if ($packageVersion === '' || $packageVersion === 'unknown') {
            throw new RuntimeException('Cette copie locale ne contient pas son identifiant de build. Utilisez une archive générée par l’outil de packaging à jour.');
        }
        if ($packageVersion !== $centralVersion) {
            throw new RuntimeException('La copie locale ('.$packageVersion.') ne correspond pas à MAXIMUS principal ('.$centralVersion.'). Recréez l’archive depuis le même commit déployé.');
        }
        if ((int) ($payload['syncProtocolVersion'] ?? 0) !== ApplicationIdentity::SYNC_PROTOCOL_VERSION) {
            throw new RuntimeException('La version du protocole de synchronisation est incompatible. Générez une archive depuis la version actuelle.');
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
        $catalog = is_array($payload['catalog'] ?? null) ? $payload['catalog'] : [];
        if ($companyId === '' || $moduleIds === []) {
            throw new RuntimeException('La configuration centrale ne contient pas d’entreprise ou de module.');
        }

        $packIds = is_array($moduleData['packIds'] ?? null) ? $moduleData['packIds'] : [];
        $featureIds = is_array($moduleData['featureIds'] ?? null) ? $moduleData['featureIds'] : [];
        $permissions = is_array($moduleData['permissions'] ?? null) ? $moduleData['permissions'] : [];

        $company = DB::transaction(function () use (
            $companyData,
            $companyId,
            $moduleIds,
            $catalog,
            $packIds,
            $featureIds,
            $permissions,
            $payload,
        ): Company {
            ModuleCatalog::importPublishedCatalog($catalog);
            ModuleCatalog::ensureCatalog();
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
                        true,
                    );
                } catch (\InvalidArgumentException $exception) {
                    throw new RuntimeException($exception->getMessage(), previous: $exception);
                }
                $normalizedPacks[$moduleId] = $selection['configuration']['packIds'];
                $normalizedFeatures[$moduleId] = $selection['featureIds'];
                $normalizedPermissions[$moduleId] = $selection['configuration']['featurePermissions'];
            }

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