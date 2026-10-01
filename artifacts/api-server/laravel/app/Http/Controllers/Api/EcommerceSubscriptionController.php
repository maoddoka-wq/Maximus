<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\EcommerceSubscriptionPaymentService;
use App\Services\EcommerceSubscriptionService;
use App\Support\ModuleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class EcommerceSubscriptionController extends Controller
{
    private const MODULE_ID = 'ecommerce';

    public function index(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Seul MAXIMUS peut consulter ces abonnements.'], 403);
        }
        if (! Schema::hasTable('maximus_company_ecommerce_prices')) {
            return response()->json(['error' => 'La configuration de l’abonnement E-commerce n’est pas encore déployée.'], 503);
        }

        $companies = Company::query()
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get(['id', 'name']);
        $companyIds = $companies->pluck('id')->all();

        $moduleAccess = DB::table('maximus_company_modules')
            ->where('module_id', self::MODULE_ID)
            ->whereIn('company_id', $companyIds)
            ->get()
            ->keyBy('company_id');
        $prices = DB::table('maximus_company_ecommerce_prices')
            ->whereIn('company_id', $companyIds)
            ->get()
            ->keyBy('company_id');

        return response()->json([
            'subscriptions' => $companies->map(function (Company $company) use ($moduleAccess, $prices): array {
                $access = $moduleAccess->get($company->id);
                $price = $prices->get($company->id);
                $status = (string) ($access?->status ?? 'INACTIF');
                $latestPayment = app(EcommerceSubscriptionPaymentService::class)->latestForCompany($company->id);
                $subscription = app(EcommerceSubscriptionService::class)->snapshot($company->id, $latestPayment);

                if (! in_array($status, ['ACTIF', 'BETA', 'MAINTENANCE', 'INACTIF'], true)) {
                    $status = 'INACTIF';
                }

                return [
                    'companyId' => $company->id,
                    'companyName' => $company->name,
                    'status' => $status,
                    'monthlyAmount' => $price?->monthly_amount === null
                        ? null
                        : (int) $price->monthly_amount,
                    'subscriptionStatus' => $subscription['status'],
                    'paidThroughAt' => $subscription['paidThroughAt'],
                    'daysRemaining' => $subscription['daysRemaining'],
                    'lastPaymentStatus' => $subscription['payment']['status'] ?? null,
                    'updatedAt' => $price?->updated_at,
                ];
            })->values(),
        ]);
    }

    public function update(Request $request, string $companyId): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Seul MAXIMUS peut modifier ces abonnements.'], 403);
        }
        if (! Schema::hasTable('maximus_company_ecommerce_prices')) {
            return response()->json(['error' => 'La configuration de l’abonnement E-commerce n’est pas encore déployée.'], 503);
        }

        $input = $request->validate([
            'status' => ['required', 'in:ACTIF,BETA,MAINTENANCE,INACTIF'],
            'monthlyAmount' => ['present', 'nullable', 'integer', 'min:0', 'max:2147483647'],
        ]);

        if ($input['status'] !== 'INACTIF'
            && ($input['monthlyAmount'] === null || (int) $input['monthlyAmount'] < 1)) {
            return response()->json([
                'error' => 'Définissez d’abord un tarif mensuel strictement supérieur à 0 FCFA avant d’activer l’abonnement.',
            ], 422);
        }

        if (! collect(ModuleCatalog::definitionsWithCustom())->contains('id', self::MODULE_ID)) {
            return response()->json(['error' => 'Le module E-commerce est introuvable dans le catalogue.'], 404);
        }

        return DB::transaction(function () use ($companyId, $input, $request): JsonResponse {
            $company = Company::query()
                ->whereKey($companyId)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->first();

            if (! $company) {
                return response()->json(['error' => 'Entreprise introuvable.'], 404);
            }

            $existingAccess = DB::table('maximus_company_modules')
                ->where('company_id', $companyId)
                ->where('module_id', self::MODULE_ID)
                ->lockForUpdate()
                ->first();

            if ($existingAccess) {
                $featureIds = $this->decodeArray($existingAccess->feature_ids ?? null);
                $configuration = $this->decodeArray($existingAccess->configuration ?? null);
            } else {
                try {
                    [$featureIds, $configuration] = $this->initialFeatureSelection($company);
                } catch (\InvalidArgumentException $exception) {
                    return response()->json(['error' => $exception->getMessage()], 422);
                }
            }

            $now = now();
            DB::table('maximus_company_modules')->updateOrInsert(
                ['company_id' => $companyId, 'module_id' => self::MODULE_ID],
                [
                    'id' => $existingAccess?->id ?? 'company-module-'.Str::slug($companyId.'-'.self::MODULE_ID),
                    'status' => $input['status'],
                    'feature_ids' => json_encode($featureIds, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'configuration' => json_encode($configuration, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'created_at' => $existingAccess?->created_at ?? $now,
                    'updated_at' => $now,
                ],
            );

            $requestedModules = array_values(array_unique(array_map(
                'strval',
                is_array($company->requested_modules) ? $company->requested_modules : [],
            )));
            if (in_array($input['status'], ['ACTIF', 'BETA', 'MAINTENANCE'], true)) {
                if (! in_array(self::MODULE_ID, $requestedModules, true)) {
                    $requestedModules[] = self::MODULE_ID;
                }
            } else {
                $requestedModules = array_values(array_filter(
                    $requestedModules,
                    static fn (string $moduleId): bool => $moduleId !== self::MODULE_ID,
                ));
            }
            $company->update(['requested_modules' => $requestedModules]);

            $existingPrice = DB::table('maximus_company_ecommerce_prices')
                ->where('company_id', $companyId)
                ->lockForUpdate()
                ->first();
            DB::table('maximus_company_ecommerce_prices')->updateOrInsert(
                ['company_id' => $companyId],
                [
                    'monthly_amount' => $input['monthlyAmount'],
                    'updated_by' => $request->attributes->get('authUser')?->id,
                    'created_at' => $existingPrice?->created_at ?? $now,
                    'updated_at' => $now,
                ],
            );

            $subscription = app(EcommerceSubscriptionService::class)->snapshot($companyId);
            $lastPaymentStatus = app(EcommerceSubscriptionPaymentService::class)
                ->latestForCompany($companyId)?->status;

            return response()->json([
                'subscription' => [
                    'companyId' => $companyId,
                    'companyName' => $company->name,
                    'status' => $input['status'],
                    'monthlyAmount' => $input['monthlyAmount'] === null ? null : (int) $input['monthlyAmount'],
                    'subscriptionStatus' => $subscription['status'],
                    'paidThroughAt' => $subscription['paidThroughAt'],
                    'daysRemaining' => $subscription['daysRemaining'],
                    'lastPaymentStatus' => $lastPaymentStatus,
                    'updatedAt' => $now->toISOString(),
                ],
            ]);
        });
    }

    private function isMaximusAdmin(Request $request): bool
    {
        $actor = $request->attributes->get('authActor');

        return is_array($actor) && ($actor['role'] ?? null) === 'maximus_admin';
    }

    private function initialFeatureSelection(Company $company): array
    {
        $requestedFeatures = is_array($company->requested_module_features)
            ? $company->requested_module_features
            : [];
        $requestedPacks = is_array($company->requested_module_pack_ids)
            ? $company->requested_module_pack_ids
            : [];
        $requestedPermissions = is_array($company->requested_module_permissions)
            ? $company->requested_module_permissions
            : [];
        $hasExplicitFeatures = array_key_exists(self::MODULE_ID, $requestedFeatures);
        $featureIds = $this->decodeArray($requestedFeatures[self::MODULE_ID] ?? null);
        $packIds = $this->decodeArray($requestedPacks[self::MODULE_ID] ?? null);
        $featurePermissions = is_array($requestedPermissions[self::MODULE_ID] ?? null)
            ? $requestedPermissions[self::MODULE_ID]
            : [];

        $configuration = [
            'packIds' => $packIds,
            'featurePermissions' => $featurePermissions,
        ];
        if ($hasExplicitFeatures || $packIds === []) {
            $configuration['featureScope'] = 'explicit';
        }

        $selection = ModuleCatalog::normalizeSelection(self::MODULE_ID, $featureIds, $configuration);
        $selectionConfiguration = is_array($selection['configuration'] ?? null)
            ? $selection['configuration']
            : [];
        $selectionConfiguration['featureScope'] = 'explicit';

        return [
            is_array($selection['featureIds'] ?? null) ? $selection['featureIds'] : [],
            $selectionConfiguration,
        ];
    }

    private function decodeArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value)) {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }
}