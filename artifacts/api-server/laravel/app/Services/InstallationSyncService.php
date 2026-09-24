<?php

namespace App\Services;

use App\Models\Company;
use App\Support\ModuleCatalog;
use App\Support\ApplicationIdentity;
use App\Support\InstallationContext;
use App\Support\InstallationSyncState;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;

final class InstallationSyncService
{
    /** @return array<string, mixed> */
    public function fetch(bool $initial = false): array
    {
        InstallationSyncState::record(['lastAttemptAt' => now()->toIso8601String(), 'state' => 'syncing', 'lastError' => null]);
        try {
            return $this->fetchConfiguration($initial);
        } catch (ConnectionException $exception) {
            InstallationSyncState::record(['state' => 'unreachable', 'lastError' => 'MAXIMUS principal est injoignable. Dernière configuration locale conservée.']);
            throw new RuntimeException('MAXIMUS principal est injoignable. Dernière configuration locale conservée.', previous: $exception);
        } catch (\Throwable $exception) {
            if (InstallationSyncState::summary()['state'] === 'syncing') {
                InstallationSyncState::record(['state' => 'rejected', 'lastError' => 'Configuration centrale refusée. Dernière configuration locale conservée.']);
            }
            throw $exception;
        }
    }

    private function fetchConfiguration(bool $initial): array
    {
        $baseUrl = rtrim((string) config('maximus.central_url', ''), '/');
        $token = trim((string) config('maximus.installation_token', ''));
        if ($baseUrl === '' || $token === '') {
            throw new RuntimeException('MAXIMUS_CENTRAL_URL et MAXIMUS_INSTALLATION_TOKEN sont requis.');
        }

        $response = $this->centralRequest()
            ->withoutRedirecting()
            ->acceptJson()
            ->withToken($token)
            ->get($baseUrl.'/api/installation-sync/configuration');

        if (! $response->successful()) {
            $code = $response->json('code');
            $state = $code === 'INSTALLATION_REVOKED' ? 'revoked'
                : ($response->serverError() || in_array($response->status(), [408, 429], true) ? 'unreachable'
                    : (in_array($response->status(), [401, 403], true) ? 'authentication_rejected' : 'rejected'));
            $message = match ($state) {
                'revoked' => 'Enrôlement explicitement révoqué par MAXIMUS principal. Données locales conservées.',
                'authentication_rejected' => 'Authentification d’installation refusée : jeton invalide ou révoqué (HTTP '.$response->status().'). Ce n’est pas une panne réseau.',
                'unreachable' => 'MAXIMUS principal temporairement indisponible (HTTP '.$response->status().'). Dernière configuration locale conservée.',
                default => 'Configuration refusée par MAXIMUS principal (HTTP '.$response->status().'). Dernière configuration locale conservée.',
            };
            InstallationSyncState::record(['state' => $state, 'lastError' => $message]);
            throw new RuntimeException($message);
        }

        $payload = $response->json();
        if (! is_array($payload) || ! is_array($payload['company'] ?? null)) {
            throw new RuntimeException('La configuration reçue de MAXIMUS est invalide.');
        }
        $this->validatePayload($payload, $initial);
        return $payload;
    }

    private function validatePayload(array $payload, bool $initial): ?string
    {
        $companyId = InstallationContext::companyId();
        $installationId = trim((string) config('maximus.installation_id', ''));
        $identity = is_array($payload['installation'] ?? null) ? $payload['installation'] : [];
        if (! InstallationContext::isCompanyOnly() || $companyId === null || $installationId === ''
            || ($payload['company']['id'] ?? null) !== $companyId
            || ($payload['installationId'] ?? $identity['id'] ?? null) !== $installationId
            || (isset($identity['id']) && $identity['id'] !== $installationId)
            || (isset($identity['companyId']) && $identity['companyId'] !== $companyId)
            || (isset($identity['mode']) && $identity['mode'] !== InstallationContext::mode())) {
            throw new RuntimeException('Identité entreprise/installation reçue différente de la configuration locale.');
        }
        if ((int) ($payload['syncProtocolVersion'] ?? 0) !== ApplicationIdentity::SYNC_PROTOCOL_VERSION) {
            throw new RuntimeException('La version du protocole de synchronisation est incompatible.');
        }
        $centralVersion = trim((string) ($payload['applicationVersion'] ?? ''));
        $expectedVersion = ApplicationIdentity::expectedVersion();
        $packageVersion = ApplicationIdentity::packageVersion();
        if ($centralVersion === '' || $centralVersion === 'unknown') {
            throw new RuntimeException('MAXIMUS principal ne publie pas encore son identifiant de version. Déployez la version actuelle avant de synchroniser.');
        }
        $strict = $initial || InstallationSyncState::summary()['lastSuccessAt'] === null;
        if ($strict && ($expectedVersion === '' || $expectedVersion !== $centralVersion)) {
            throw new RuntimeException('Le bootstrap ne correspond pas à la version actuellement servie par MAXIMUS principal. Générez un nouveau bootstrap.');
        }
        if ($packageVersion === '' || $packageVersion === 'unknown') {
            throw new RuntimeException('Cette copie locale ne contient pas son identifiant de build. Utilisez une archive générée par l’outil de packaging à jour.');
        }
        if ($strict && $packageVersion !== $centralVersion) {
            throw new RuntimeException('La copie locale ('.$packageVersion.') ne correspond pas à MAXIMUS principal ('.$centralVersion.'). Recréez l’archive depuis le même commit déployé.');
        }
        return $packageVersion !== $centralVersion
            ? 'Versions applicatives différentes ; protocole compatible. Aucune mise à jour automatique du logiciel.'
            : null;
    }

    /** @param array<string, mixed> $payload */
    public function apply(array $payload, bool $initial = false): Company
    {
        try {
            $warning = $this->validatePayload($payload, $initial);
            $paymentAccess = array_key_exists('paymentAccess', $payload)
                ? $this->validatePaymentAccess($payload['paymentAccess'])
                : null;
            $access = array_key_exists('erpAccess', $payload)
                ? $this->validateErpAccess($payload['erpAccess']) : InstallationSyncState::erpAccess();
            $company = $this->applyValidated($payload, $paymentAccess);
            // Publish the entire access snapshot only after the database transaction succeeds.
            InstallationSyncState::record([
                'lastSuccessAt' => now()->toIso8601String(), 'state' => 'synced', 'lastError' => null,
                'versionWarning' => $warning, 'erpAccess' => $access,
                'configurationVersion' => (int) ($payload['configurationVersion'] ?? 0),
            ]);
            return $company;
        } catch (\Throwable $exception) {
            InstallationSyncState::record(['state' => 'rejected', 'lastError' => 'Configuration non appliquée intégralement. Vérifier le diagnostic local avant de réessayer.']);
            throw $exception;
        }
    }

    private function validateErpAccess(mixed $access): array
    {
        if (! is_array($access) || ! is_array($access['allowedHosts'] ?? null)) {
            throw new RuntimeException('Configuration des adresses ERP invalide.');
        }
        $hosts = [];
        foreach ($access['allowedHosts'] as $host) {
            if (! is_string($host) || strlen($host) > 253
                || ! filter_var($host, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME)
                || str_contains($host, '*')) {
                throw new RuntimeException('Hôte ERP invalide.');
            }
            $hosts[] = strtolower($host);
        }
        $url = $access['canonicalUrl'] ?? null;
        if ($url !== null) {
            $parts = is_string($url) ? parse_url($url) : false;
            if (! is_array($parts) || ! in_array($parts['scheme'] ?? '', ['https', 'http'], true)
                || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])
                || ! in_array(strtolower($parts['host'] ?? ''), $hosts, true)
                || ! in_array($parts['path'] ?? '', ['', '/'], true)) {
                throw new RuntimeException('URL ERP canonique invalide.');
            }
        }
        return ['canonicalUrl' => $url, 'allowedHosts' => array_values(array_unique($hosts))];
    }

    /** @return array{enabled: bool, providers: list<string>} */
    private function validatePaymentAccess(mixed $access): array
    {
        $companyId = InstallationContext::companyId();
        if (! is_array($access)
            || $companyId === null
            || ($access['companyId'] ?? null) !== $companyId
            || ! is_bool($access['enabled'] ?? null)
            || ! is_array($access['providers'] ?? null)) {
            throw new RuntimeException('Configuration des autorisations de paiement invalide.');
        }

        $providers = [];
        foreach ($access['providers'] as $provider) {
            if (! is_string($provider) || $provider !== \App\Support\CompanyPaymentAccess::PROVIDER_DIAMANOPAY) {
                throw new RuntimeException('Fournisseur de paiement non pris en charge par la configuration centrale.');
            }
            $providers[] = $provider;
        }

        return [
            'enabled' => $access['enabled'],
            'providers' => array_values(array_unique($providers)),
        ];
    }

    private function applyValidated(array $payload, ?array $paymentAccess = null): Company
    {
        $companyData = is_array($payload['company'] ?? null) ? $payload['company'] : [];
        $companyId = trim((string) ($companyData['id'] ?? ''));
        $moduleData = is_array($payload['modules'] ?? null) ? $payload['modules'] : [];
        $moduleIds = array_values(array_unique(array_map('strval', is_array($moduleData['ids'] ?? null) ? $moduleData['ids'] : [])));
        $catalog = is_array($payload['catalog'] ?? null) ? $payload['catalog'] : [];
        if ($companyId === '' || ! is_array($payload['modules']['ids'] ?? null)) {
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
                $paymentAccess,
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

            $branding = [];
            foreach (['primaryColor' => 'primary_color', 'accentColor' => 'accent_color', 'sidebarColor' => 'sidebar_color'] as $key => $column) {
                if (isset($companyData[$key]) && is_string($companyData[$key]) && preg_match('/^#[a-f0-9]{6}$/i', $companyData[$key])) {
                    $branding[$column] = $companyData[$key];
                }
            }
            // Central photo paths point to bytes held centrally, not on this server.
            // Never copy that URL or fetch arbitrary media. Keep the local upload and
            // its bytes intact; a sysadmin can upload the logo through the local UI.
            $existing = Company::query()->find($companyId);
            if (! $existing) {
                $branding += ['login_custom_allowed' => false, 'login_mode' => 'MAXIMUS'];
            }
            if (array_key_exists('loginSlug', $companyData)) {
                $branding['login_slug'] = trim((string) $companyData['loginSlug']) ?: null;
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
                    'deleted_at' => null,
                    'updated_at' => now(),
                ] + $branding,
            );

            if ($paymentAccess !== null) {
                if (! Schema::hasTable('company_payment_settings')) {
                    throw new RuntimeException('La table locale des autorisations de paiement est absente.');
                }

                $status = $paymentAccess['enabled'] ? 'ACTIF' : 'INACTIF';
                $encodedProviders = json_encode($paymentAccess['providers'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
                $existingPaymentSettings = DB::table('company_payment_settings')
                    ->where('company_id', $companyId)
                    ->first();

                if (! $existingPaymentSettings) {
                    DB::table('company_payment_settings')->insert([
                        'id' => 'company-payment-'.Str::slug($companyId),
                        'company_id' => $companyId,
                        'status' => $status,
                        'providers' => $encodedProviders,
                        'updated_by' => 'maximus-sync',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $existingProviders = json_decode($existingPaymentSettings->providers ?? '[]', true);
                    $existingProviders = is_array($existingProviders) ? array_values(array_unique($existingProviders)) : [];
                    if ($existingPaymentSettings->status !== $status || $existingProviders !== $paymentAccess['providers']) {
                        DB::table('company_payment_settings')
                            ->where('company_id', $companyId)
                            ->update([
                                'status' => $status,
                                'providers' => $encodedProviders,
                                'updated_by' => 'maximus-sync',
                                'updated_at' => now(),
                            ]);
                    }
                }
            }

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
        try {
            $response = $this->centralRequest()->withToken($token)->post($baseUrl.'/api/installation-sync/heartbeat', [
                'appliedVersion' => InstallationSyncState::configurationVersion(),
            ]);
            if (! $response->successful()) {
                throw new RuntimeException('Accusé de synchronisation indisponible.');
            }
        } catch (\Throwable $exception) {
            // The configuration is already committed. A lost acknowledgement does
            // not roll it back and is retried on the next scheduled synchronization.
            InstallationSyncState::record(['lastError' => 'Configuration appliquée ; accusé de synchronisation non reçu. Nouvel essai à la prochaine échéance.']);
        }
    }

    private function centralRequest(): PendingRequest
    {
        // Some Windows PHP/cURL installations time out while resolving Render
        // over IPv6 even though the operating system curl client succeeds.
        // Prefer IPv4 and retry transient DNS/connectivity failures.
        return Http::retry(
            3,
            250,
            static fn (\Throwable $exception): bool => $exception instanceof ConnectionException,
            false,
        )
            ->timeout(20)
            ->connectTimeout(10)
            ->withOptions(['force_ip_resolve' => 'v4']);
    }
}