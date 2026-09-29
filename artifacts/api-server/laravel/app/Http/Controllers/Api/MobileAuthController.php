<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthUser;
use App\Models\Company;
use App\Models\MobileAuthToken;
use App\Support\InstallationContext;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use App\Support\ModuleAuthorization;
use App\Support\ModuleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MobileAuthController extends Controller
{
    private const TOKEN_LIFETIME_DAYS = 30;

    public function login(Request $request): JsonResponse
    {
        $input = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:200'],
            'companySlug' => ['sometimes', 'nullable', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'deviceName' => ['sometimes', 'string', 'max:100'],
        ]);

        $companySlug = isset($input['companySlug']) ? Str::lower(trim($input['companySlug'])) : null;
        $userQuery = AuthUser::query()
            ->where('email', Str::lower(trim($input['email'])))
            ->where('status', 'ACTIF');

        if ($companySlug !== null && $companySlug !== '') {
            $requestedCompany = Company::query()
                ->where('login_slug', $companySlug)
                ->where('status', 'ACTIF')
                ->whereNull('deleted_at')
                ->first();
            if (! $requestedCompany) {
                return $this->invalidCredentials();
            }
            $userQuery->where('company_id', $requestedCompany->id);
        }

        if (InstallationContext::isCompanyOnly()) {
            $companyId = InstallationContext::companyId();
            if ($companyId === null) {
                return response()->json([
                    'error' => 'L’installation entreprise n’est pas encore configurée.',
                    'code' => 'INSTALLATION_NOT_CONFIGURED',
                ], 503);
            }
            $userQuery->where('company_id', $companyId);
        }

        $user = $userQuery->first();
        if (! $user || ! MaximusPassword::check($input['password'], $user->password_hash)) {
            return $this->invalidCredentials();
        }

        if (($denial = MaximusAuth::dedicatedAccessDenial($user)) !== null) {
            return response()->json($denial, 403);
        }
        if (! MaximusAuth::canAuthenticate($user)) {
            return $this->invalidCredentials();
        }

        if ($user->role !== 'employee' || empty($user->company_id) || empty($user->employee_id)) {
            return response()->json([
                'error' => 'Cette application est réservée aux chauffeurs avec un compte employé MAXIMUS.',
            ], 403);
        }

        $company = Company::query()
            ->whereKey($user->company_id)
            ->where('status', 'ACTIF')
            ->whereNull('deleted_at')
            ->first();
        if (! $company) {
            return response()->json(['error' => 'Cette entreprise n’est pas active.'], 403);
        }

        if (
            (bool) $company->login_custom_allowed
            && ($company->login_mode ?: 'MAXIMUS') === 'CUSTOM'
            && $companySlug !== $company->login_slug
        ) {
            return response()->json([
                'code' => 'COMPANY_CUSTOM_LOGIN',
                'error' => 'Saisissez le code de connexion de votre entreprise pour continuer.',
            ], 403);
        }

        $driver = DB::table('transport_drivers')
            ->where('company_id', $company->id)
            ->where('employee_id', $user->employee_id)
            ->where('status', 'ACTIVE')
            ->first();
        if (! $driver) {
            return response()->json([
                'error' => 'Aucun profil chauffeur actif n’est lié à ce compte. Demandez à votre administrateur de vérifier votre accès Transport.',
            ], 403);
        }

        if (
            ! ModuleCatalog::isEnabled((string) $company->id, 'transport')
            || ! ModuleAuthorization::allows(MaximusAuth::actor($user), 'transport', 'view', 'drivers')
        ) {
            return response()->json([
                'error' => 'Le module Transport ou votre accès chauffeur n’est pas activé pour ce compte.',
            ], 403);
        }

        $plainToken = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $expiresAt = Carbon::now()->addDays(self::TOKEN_LIFETIME_DAYS);
        MobileAuthToken::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'token_hash' => MaximusAuth::hashToken($plainToken),
            'device_name' => trim((string) ($input['deviceName'] ?? 'MAXIMUS Chauffeur')) ?: 'MAXIMUS Chauffeur',
            'expires_at' => $expiresAt,
            'created_at' => Carbon::now(),
        ]);

        return response()->json($this->sessionPayload($user, $company, $expiresAt) + [
            'token' => $plainToken,
        ]);
    }

    public function session(Request $request): JsonResponse
    {
        $user = $request->attributes->get('authUser');
        $token = $request->attributes->get('mobileAuthToken');
        if (! $user instanceof AuthUser || ! $token instanceof MobileAuthToken) {
            return response()->json(['error' => 'Session chauffeur absente ou expirée.'], 401);
        }

        return response()->json($this->sessionPayload(
            $user,
            Company::query()->whereKey($user->company_id)->firstOrFail(),
            $token->expires_at,
        ));
    }

    public function logout(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        $token = $request->attributes->get('mobileAuthToken');
        if ($token instanceof MobileAuthToken) {
            DB::transaction(function () use ($token): void {
                $user = AuthUser::query()->find($token->user_id);
                if (
                    $user
                    && $user->role === 'employee'
                    && ! empty($user->company_id)
                    && ! empty($user->employee_id)
                ) {
                    DB::table('transport_drivers')
                        ->where('company_id', $user->company_id)
                        ->where('employee_id', $user->employee_id)
                        ->where('status', 'ACTIVE')
                        ->where('availability', 'AVAILABLE')
                        ->update([
                            'availability' => 'PAUSED',
                            'updated_at' => Carbon::now(),
                        ]);
                }

                $token->delete();
            });
        }

        return response()->noContent();
    }

    private function sessionPayload(AuthUser $user, Company $company, Carbon $expiresAt): array
    {
        $actor = MaximusAuth::actor($user);

        return [
            'expiresAt' => $expiresAt->toISOString(),
            'user' => $actor,
            'company' => [
                'id' => (string) $company->id,
                'name' => (string) $company->name,
                'profilePhoto' => $company->profile_photo,
                'primaryColor' => $company->primary_color,
                'accentColor' => $company->accent_color,
            ],
            'capabilities' => [
                'updateLocation' => ModuleAuthorization::allows($actor, 'transport', 'modify', 'drivers'),
                'updateAvailability' => ModuleAuthorization::allows($actor, 'transport', 'modify', 'drivers'),
                'updateTrips' => ModuleAuthorization::allows($actor, 'transport', 'modify', 'trips'),
            ],
        ];
    }

    private function invalidCredentials(): JsonResponse
    {
        return response()->json(['error' => 'Email ou mot de passe incorrect.'], 401);
    }
}