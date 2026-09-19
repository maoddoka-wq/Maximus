<?php

namespace App\Services;

use App\Models\Company;
use App\Models\CompanyRequest;
use App\Support\MaximusPassword;
use App\Support\ModuleCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

final class CompanyRequestCreationService
{
    /**
     * @param array<string, mixed> $input
     * @return array{company: Company, request: CompanyRequest}
     */
    public function create(array $input): array
    {
        $email = Str::lower(trim((string) $input['email']));

        if (Company::query()->where('email', $email)->whereNull('deleted_at')->exists()) {
            throw new RuntimeException('Une demande ou une entreprise utilise déjà cette adresse email.');
        }

        $requestedModules = array_values(array_unique(array_map('strval', is_array($input['requestedModules'] ?? null) ? $input['requestedModules'] : [])));

        if ($requestedModules === []) {
            throw new RuntimeException('Sélectionnez au moins un module valide.');
        }
        foreach ($requestedModules as $moduleId) {
            if (! ModuleCatalog::isPublishedModule($moduleId)) {
                throw new RuntimeException("Le module « {$moduleId} » n’est pas publié.");
            }
        }

        $rawPacks = is_array($input['requestedModulePackIds'] ?? null) ? $input['requestedModulePackIds'] : [];
        $rawFeatures = is_array($input['requestedModuleFeatures'] ?? null) ? $input['requestedModuleFeatures'] : [];
        $rawPermissions = is_array($input['requestedModulePermissions'] ?? null) ? $input['requestedModulePermissions'] : [];
        $requestedPacks = [];
        $requestedFeatures = [];
        $requestedPermissions = [];
        foreach ($requestedModules as $moduleId) {
            try {
                $selection = ModuleCatalog::normalizeSelection(
                    $moduleId,
                    is_array($rawFeatures[$moduleId] ?? null) ? $rawFeatures[$moduleId] : [],
                    [
                        'featureScope' => array_key_exists($moduleId, $rawFeatures) ? 'explicit' : null,
                        'packIds' => is_array($rawPacks[$moduleId] ?? null) ? $rawPacks[$moduleId] : [],
                        'featurePermissions' => is_array($rawPermissions[$moduleId] ?? null) ? $rawPermissions[$moduleId] : [],
                    ],
                );
            } catch (\InvalidArgumentException $exception) {
                throw new RuntimeException($exception->getMessage());
            }
            $requestedPacks[$moduleId] = $selection['configuration']['packIds'];
            $requestedFeatures[$moduleId] = $selection['featureIds'];
            $requestedPermissions[$moduleId] = $selection['configuration']['featurePermissions'];
        }

        $companyId = (string) Str::uuid();
        $company = DB::transaction(function () use (
            $input,
            $email,
            $requestedModules,
            $requestedPacks,
            $requestedFeatures,
            $requestedPermissions,
            $companyId,
        ): Company {
            $company = Company::query()->create([
                'id' => $companyId,
                'name' => trim((string) $input['name']),
                'manager' => trim((string) $input['manager']),
                'email' => $email,
                'phone' => trim((string) ($input['phone'] ?? '')),
                'country' => trim((string) ($input['country'] ?? '')),
                'sector' => trim((string) ($input['sector'] ?? '')),
                'status' => 'EN ATTENTE',
                'requested_modules' => $requestedModules,
                'requested_module_pack_ids' => $requestedPacks,
                'requested_module_features' => $requestedFeatures,
                'requested_module_permissions' => $requestedPermissions,
            ]);

            CompanyRequest::query()->create([
                'id' => (string) Str::uuid(),
                'company_id' => $company->id,
                'status' => 'PENDING',
                'admin_password_hash' => MaximusPassword::hash((string) $input['password']),
            ]);

            return $company;
        });

        return [
            'company' => $company,
            'request' => CompanyRequest::query()->where('company_id', $company->id)->firstOrFail(),
        ];
    }
}