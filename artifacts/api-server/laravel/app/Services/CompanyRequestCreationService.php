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

        $knownModules = collect(ModuleCatalog::definitionsWithCustom())
            ->map(fn (array $module): string => (string) ($module['id'] ?? ''))
            ->filter()
            ->values()
            ->all();
        $requestedModules = array_values(array_unique(array_intersect(
            is_array($input['requestedModules'] ?? null) ? $input['requestedModules'] : [],
            $knownModules,
        )));

        if ($requestedModules === []) {
            throw new RuntimeException('Sélectionnez au moins un module valide.');
        }

        $companyId = (string) Str::uuid();
        $company = DB::transaction(function () use ($input, $email, $requestedModules, $companyId): Company {
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
                'requested_module_pack_ids' => $input['requestedModulePackIds'] ?? [],
                'requested_module_features' => $input['requestedModuleFeatures'] ?? [],
                'requested_module_permissions' => $input['requestedModulePermissions'] ?? [],
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