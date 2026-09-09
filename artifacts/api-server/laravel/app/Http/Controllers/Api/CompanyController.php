<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Models\Company;
use App\Models\CompanyRequest;
use App\Support\CompanyRegistry;
use App\Support\MaximusPassword;
use App\Support\ModuleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CompanyController extends Controller
{
    public function createRequest(Request $request): JsonResponse
    {
        $input = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:2', 'max:160'],
            'manager' => ['required', 'string', 'min:2', 'max:180'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:200'],
            'phone' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'max:100'],
            'sector' => ['nullable', 'string', 'max:120'],
            'requestedModules' => ['required', 'array', 'min:1'],
            'requestedModules.*' => ['string', 'min:1'],
            'requestedModulePackIds' => ['nullable', 'array'],
            'requestedModuleFeatures' => ['nullable', 'array'],
            'requestedModulePermissions' => ['nullable', 'array'],
        ])->validate();

        $email = Str::lower(trim($input['email']));
        if (Company::query()->where('email', $email)->whereNull('deleted_at')->exists()) {
            return response()->json(['error' => 'Une demande ou une entreprise utilise déjà cette adresse email.'], 409);
        }

        $knownModules = collect(ModuleCatalog::definitions())->pluck('id')->all();
        $requestedModules = array_values(array_unique(array_intersect($input['requestedModules'], $knownModules)));
        if ($requestedModules === []) {
            return response()->json(['error' => 'Sélectionnez au moins un module valide.'], 422);
        }

        $companyId = (string) Str::uuid();
        $company = DB::transaction(function () use ($input, $email, $requestedModules, $companyId): Company {
            $company = Company::query()->create([
                'id' => $companyId,
                'name' => trim($input['name']),
                'manager' => trim($input['manager']),
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
                'admin_password_hash' => MaximusPassword::hash($input['password']),
            ]);

            return $company;
        });

        return response()->json([
            'ok' => true,
            'requestId' => CompanyRequest::query()->where('company_id', $company->id)->value('id'),
            'status' => 'PENDING',
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        if (($request->attributes->get('authActor')['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Accès réservé à MAXIMUS.'], 403);
        }

        $requests = CompanyRequest::query()
            ->with('company')
            ->where('status', 'PENDING')
            ->latest()
            ->get()
            ->map(fn (CompanyRequest $companyRequest): array => $this->requestPayload($companyRequest))
            ->values();

        return response()->json(['requests' => $requests]);
    }

    public function approve(Request $request, string $companyId): JsonResponse
    {
        if (($request->attributes->get('authActor')['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Accès réservé à MAXIMUS.'], 403);
        }

        try {
            $result = DB::transaction(function () use ($companyId): array {
                $company = Company::query()->whereKey($companyId)->lockForUpdate()->first();
                $companyRequest = CompanyRequest::query()->where('company_id', $companyId)->lockForUpdate()->first();
                if (! $company || ! $companyRequest) {
                    throw new \RuntimeException('Demande d’entreprise introuvable.');
                }
                if ($companyRequest->status === 'APPROVED' && $company->status === 'ACTIF') {
                    return [$company, $companyRequest];
                }
                if ($companyRequest->status !== 'PENDING' || $company->status !== 'EN ATTENTE') {
                    throw new \DomainException('Cette demande a déjà été traitée.');
                }

                $adminId = 'company-admin:'.$company->id;
                $admin = AuthUser::query()->whereKey($adminId)->first();
                $emailOwner = AuthUser::query()->where('email', $company->email)->first();
                if ($emailOwner && $emailOwner->id !== $adminId) {
                    throw new \DomainException('Cette adresse email est déjà utilisée.');
                }

                $values = [
                    'email' => $company->email,
                    'password_hash' => $companyRequest->admin_password_hash,
                    'display_name' => $company->manager,
                    'role' => 'company_admin',
                    'company_id' => $company->id,
                    'employee_id' => null,
                    'sector_ids' => [],
                    'permissions' => [],
                    'status' => 'ACTIF',
                    'updated_at' => now(),
                ];
                if ($admin) {
                    $admin->update($values);
                    AuthSession::query()->where('user_id', $admin->id)->delete();
                } else {
                    AuthUser::query()->create([...$values, 'id' => $adminId, 'created_at' => now()]);
                }

                ModuleCatalog::ensureCatalog();
                foreach ($company->requested_modules ?? [] as $moduleId) {
                    DB::table('maximus_company_modules')->updateOrInsert(
                        ['company_id' => $company->id, 'module_id' => $moduleId],
                        [
                            'id' => 'company-module-'.Str::slug($company->id.'-'.$moduleId),
                            'status' => 'ACTIF',
                            'feature_ids' => json_encode($company->requested_module_features[$moduleId] ?? [], JSON_UNESCAPED_UNICODE),
                            'configuration' => json_encode($company->requested_module_permissions[$moduleId] ?? [], JSON_UNESCAPED_UNICODE),
                            'updated_at' => now(),
                            'created_at' => now(),
                        ],
                    );
                }

                $company->update(['status' => 'ACTIF', 'rejection_reason' => null]);
                $companyRequest->update(['status' => 'APPROVED', 'rejection_reason' => null]);

                return [$company->fresh(), $companyRequest->fresh()];
            });
        } catch (\RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 404);
        } catch (\DomainException $exception) {
            return response()->json(['error' => $exception->getMessage()], 409);
        }

        return response()->json([
            'ok' => true,
            'company' => $this->companyPayload($result[0]),
            'request' => $this->requestPayload($result[1]),
        ]);
    }

    public function reject(Request $request, string $companyId): JsonResponse
    {
        if (($request->attributes->get('authActor')['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Accès réservé à MAXIMUS.'], 403);
        }

        $reason = trim((string) $request->input('reason', ''));
        try {
            $company = DB::transaction(function () use ($companyId, $reason): Company {
            $company = Company::query()->whereKey($companyId)->lockForUpdate()->first();
            $companyRequest = CompanyRequest::query()->where('company_id', $companyId)->lockForUpdate()->first();
            if (! $company || ! $companyRequest) {
                throw new \RuntimeException('Demande d’entreprise introuvable.');
            }
            if ($companyRequest->status !== 'PENDING') {
                throw new \DomainException('Cette demande a déjà été traitée.');
            }
            $companyRequest->update(['status' => 'REJECTED', 'rejection_reason' => $reason !== '' ? $reason : null]);
            $company->update(['status' => 'REFUSÉ', 'rejection_reason' => $reason !== '' ? $reason : null]);
            return $company->fresh();
            });
        } catch (\RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 404);
        } catch (\DomainException $exception) {
            return response()->json(['error' => $exception->getMessage()], 409);
        }

        return response()->json(['ok' => true, 'company' => $this->companyPayload($company)]);
    }

    public function update(Request $request, string $companyId): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'maximus_admin' && ($actor['companyId'] ?? null) !== $companyId) {
            return response()->json(['error' => 'Accès à cette entreprise non autorisé.'], 403);
        }
        $input = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:2', 'max:160'],
            'manager' => ['required', 'string', 'min:2', 'max:180'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'max:100'],
            'sector' => ['nullable', 'string', 'max:120'],
            'primaryColor' => ['sometimes', 'required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'accentColor' => ['sometimes', 'required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'sidebarColor' => ['sometimes', 'required', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ])->validate();

        $email = Str::lower(trim($input['email']));
        $company = Company::query()->whereKey($companyId)->whereNull('deleted_at')->first();
        if (!$company) {
            return response()->json(['error' => 'Entreprise introuvable ou inactive.'], 404);
        }
        if (Company::query()->where('email', $email)->where('id', '!=', $companyId)->whereNull('deleted_at')->exists()) {
            return response()->json(['error' => 'Une autre entreprise utilise déjà cette adresse email.'], 409);
        }

        try {
            $updated = DB::transaction(function () use ($company, $input, $email): Company {
                $changes = [
                    'name' => trim($input['name']),
                    'manager' => trim($input['manager']),
                    'email' => $email,
                    'phone' => trim((string) ($input['phone'] ?? '')),
                    'country' => trim((string) ($input['country'] ?? '')),
                    'sector' => trim((string) ($input['sector'] ?? '')),
                ];
                foreach ([
                    'primaryColor' => 'primary_color',
                    'accentColor' => 'accent_color',
                    'sidebarColor' => 'sidebar_color',
                ] as $inputKey => $column) {
                    if (array_key_exists($inputKey, $input)) {
                        $changes[$column] = strtoupper((string) $input[$inputKey]);
                    }
                }
                $company->update($changes);
                AuthUser::query()
                    ->where('company_id', $company->id)
                    ->where('role', 'company_admin')
                    ->update([
                        'email' => $email,
                        'display_name' => trim($input['manager']),
                        'updated_at' => now(),
                    ]);
                $this->synchronizeCompanyModules($company->fresh());

                return $company->fresh();
            });
        } catch (\Illuminate\Database\QueryException $exception) {
            if (str_contains($exception->getMessage(), 'unique')) {
                return response()->json(['error' => 'Cette adresse email est déjà utilisée.'], 409);
            }
            throw $exception;
        }

        return response()->json(['ok' => true, 'company' => $this->companyPayload($updated)]);
    }

    public function destroy(Request $request, string $companyId): JsonResponse
    {
        if (($request->attributes->get('authActor')['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Accès réservé à MAXIMUS.'], 403);
        }

        DB::transaction(function () use ($companyId): void {
            $company = Company::query()->whereKey($companyId)->lockForUpdate()->first();
            if (! $company) {
                return;
            }
            $company->update(['status' => 'ARCHIVÉ', 'deleted_at' => now()]);
            CompanyRegistry::removeTenantData($companyId);
        });

        return response()->json(['ok' => true]);
    }

    public function uploadProfilePhoto(Request $request, string $companyId): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'maximus_admin' && ($actor['companyId'] ?? null) !== $companyId) {
            return response()->json(['error' => 'Accès à cette entreprise non autorisé.'], 403);
        }

        $company = Company::query()->whereKey($companyId)->whereNull('deleted_at')->first();
        if (! $company) {
            return response()->json(['error' => 'Entreprise introuvable ou inactive.'], 404);
        }

        $input = Validator::make($request->all(), [
            'photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ])->validate();

        $contents = $input['photo']->get();
        if (! is_string($contents) || $contents === '') {
            return response()->json(['error' => 'La photo n’a pas pu être enregistrée.'], 500);
        }

        $extension = strtolower($input['photo']->getClientOriginalExtension() ?: 'bin');
        $filename = Str::uuid()->toString().'.'.$extension;
        $photoUrl = '/api/company-profile-images/'.rawurlencode($companyId).'/'.rawurlencode($filename);
        $previousUrl = $company->profile_photo;
        $company->update([
            'profile_photo' => $photoUrl,
            'profile_photo_data' => base64_encode($contents),
            'profile_photo_mime' => $input['photo']->getMimeType() ?: 'application/octet-stream',
        ]);
        $this->removeStoredProfilePhoto($previousUrl, $photoUrl);

        return response()->json(['ok' => true, 'company' => $this->companyPayload($company->fresh())]);
    }

    public function deleteProfilePhoto(Request $request, string $companyId): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'maximus_admin' && ($actor['companyId'] ?? null) !== $companyId) {
            return response()->json(['error' => 'Accès à cette entreprise non autorisé.'], 403);
        }

        $company = Company::query()->whereKey($companyId)->whereNull('deleted_at')->first();
        if (! $company) {
            return response()->json(['error' => 'Entreprise introuvable ou inactive.'], 404);
        }

        $previousUrl = $company->profile_photo;
        $company->update([
            'profile_photo' => null,
            'profile_photo_data' => null,
            'profile_photo_mime' => null,
        ]);
        $this->removeStoredProfilePhoto($previousUrl, null);

        return response()->json(['ok' => true, 'company' => $this->companyPayload($company->fresh())]);
    }

    public function serveProfilePhoto(string $companyId, string $filename)
    {
        if (! preg_match('/^[A-Za-z0-9_-]+$/', $companyId) || ! preg_match('/^[A-Za-z0-9_.-]+$/', $filename)) {
            abort(404);
        }

        $company = Company::query()->whereKey($companyId)->whereNull('deleted_at')->first();
        if ($company && is_string($company->profile_photo_data) && $company->profile_photo_data !== '') {
            $contents = base64_decode($company->profile_photo_data, true);
            if (is_string($contents)) {
                return response($contents, 200, [
                    'Content-Type' => $company->profile_photo_mime ?: 'application/octet-stream',
                    'Cache-Control' => 'public, max-age=31536000, immutable',
                ]);
            }
        }

        $path = 'companies/'.$companyId.'/'.$filename;
        if (! Storage::disk('public')->exists($path)) {
            abort(404);
        }

        return response()->file(Storage::disk('public')->path($path), [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    private function removeStoredProfilePhoto(?string $photoUrl, ?string $replacement): void
    {
        if (! is_string($photoUrl) || $photoUrl === '' || $photoUrl === $replacement) {
            return;
        }
        $parts = explode('/', trim($photoUrl, '/'));
        $filename = end($parts);
        if (count($parts) === 4 && $parts[0] === 'api' && $parts[1] === 'company-profile-images') {
            Storage::disk('public')->delete('companies/'.$parts[2].'/'.$filename);
        }
    }

    private function companyPayload(Company $company): array
    {
        return [
            'id' => $company->id,
            'name' => (string) ($company->name ?? ''),
            'manager' => (string) ($company->manager ?? ''),
            'email' => (string) ($company->email ?? ''),
            'phone' => (string) ($company->phone ?? ''),
            'country' => (string) ($company->country ?? ''),
            'sector' => (string) ($company->sector ?? ''),
            'status' => $company->status,
            'requestedModules' => $company->requested_modules ?? [],
            'requestedModulePackIds' => $company->requested_module_pack_ids ?? [],
            'requestedModuleFeatures' => $company->requested_module_features ?? [],
            'requestedModulePermissions' => $company->requested_module_permissions ?? [],
            'allowedModules' => $company->status === 'ACTIF' ? ($company->requested_modules ?? []) : [],
            'refusedModules' => [],
            'createdAt' => optional($company->created_at)->toISOString(),
            'profilePhoto' => $company->profile_photo,
            'primaryColor' => $company->primary_color,
            'accentColor' => $company->accent_color,
            'sidebarColor' => $company->sidebar_color,
        ];
    }

    private function synchronizeCompanyModules(Company $company): void
    {
        if ($company->status !== 'ACTIF') {
            return;
        }

        ModuleCatalog::ensureCatalog();
        foreach ($company->requested_modules ?? [] as $moduleId) {
            $existing = DB::table('maximus_company_modules')
                ->where('company_id', $company->id)
                ->where('module_id', $moduleId)
                ->first();
            DB::table('maximus_company_modules')->updateOrInsert(
                ['company_id' => $company->id, 'module_id' => $moduleId],
                [
                    'id' => $existing?->id ?? 'company-module-'.Str::slug($company->id.'-'.$moduleId),
                    'status' => $existing?->status ?? 'ACTIF',
                    'feature_ids' => json_encode($company->requested_module_features[$moduleId] ?? [], JSON_UNESCAPED_UNICODE),
                    'configuration' => json_encode($company->requested_module_permissions[$moduleId] ?? [], JSON_UNESCAPED_UNICODE),
                    'updated_at' => now(),
                    'created_at' => $existing?->created_at ?? now(),
                ],
            );
        }
    }

    private function requestPayload(CompanyRequest $request): array
    {
        return [
            'id' => $request->company_id,
            'requestId' => $request->id,
            'status' => $request->status,
            'company' => $request->company ? $this->companyPayload($request->company) : null,
            'createdAt' => optional($request->created_at)->toISOString(),
            'rejectionReason' => $request->rejection_reason,
        ];
    }
}