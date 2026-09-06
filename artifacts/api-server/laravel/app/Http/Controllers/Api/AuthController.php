<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Support\CompanyAuthorization;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:200'],
        ]);

        $user = AuthUser::query()
            ->where('email', Str::lower(trim($data['email'])))
            ->where('status', 'ACTIF')
            ->first();

        if (! $user || ! MaximusPassword::check($data['password'], $user->password_hash)) {
            return response()->json([
                'error' => 'Email ou mot de passe incorrect.',
            ], 401);
        }

        if (MaximusPassword::needsRehash($user->password_hash)) {
            $user->update([
                'password_hash' => MaximusPassword::hash($data['password']),
                'updated_at' => now(),
            ]);
        }

        $token = MaximusAuth::issueSession($user);

        return response()
            ->json(['user' => MaximusAuth::actor($user)])
            ->withCookie(cookie(
                MaximusAuth::COOKIE,
                $token,
                480,
                '/',
                null,
                app()->environment('production'),
                true,
                false,
                'lax',
            ));
    }

    public function createAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required', 'string', 'min:1'],
            'email' => ['required', 'email', 'max:255'],
            'displayName' => ['required', 'string', 'min:1', 'max:180'],
            'companyId' => ['required', 'string', 'min:1'],
            'employeeId' => ['required', 'string', 'min:1'],
            'sectorIds' => ['required', 'array', 'min:1'],
            'sectorIds.*' => ['string', 'min:1'],
            'role' => ['required', 'in:sector_manager,employee'],
            'password' => ['nullable', 'string', 'min:8', 'max:200'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['array'],
            'permissions.*.*' => ['string', 'min:1'],
        ]);
        $actor = $request->attributes->get('authActor');
        if (! CompanyAuthorization::canManageAccount($actor, $data['companyId'], $data['sectorIds'])) {
            return response()->json(['error' => 'Provisionnement du compte hors périmètre autorisé.'], 403);
        }
        if (! CompanyAuthorization::canAssignPermissions($actor, $data['permissions'] ?? [])) {
            return response()->json(['error' => 'Permissions du compte hors périmètre autorisé.'], 403);
        }

        $existingQuery = AuthUser::query()->where('employee_id', $data['employeeId']);
        if (($actor['role'] ?? null) !== 'maximus_admin') {
            $existingQuery->where('company_id', $data['companyId']);
        }
        $existing = $existingQuery->first();
        if (! $existing && empty($data['password'])) {
            return response()->json(['error' => 'Un mot de passe initial est requis pour ce compte.'], 400);
        }

        $values = [
            'email' => Str::lower(trim($data['email'])),
            'display_name' => trim($data['displayName']),
            'role' => $data['role'],
            'company_id' => $data['companyId'],
            'employee_id' => $data['employeeId'],
            'sector_ids' => $data['sectorIds'],
            'permissions' => $data['permissions'] ?? [],
            'status' => 'ACTIF',
            'updated_at' => now(),
        ];
        if (! empty($data['password'])) {
            $values['password_hash'] = MaximusPassword::hash($data['password']);
        }

        try {
            if ($existing) {
                $existing->update($values);
                if (! empty($data['password'])) {
                    AuthSession::query()->where('user_id', $existing->id)->delete();
                }
            } else {
                AuthUser::query()->create(array_merge($values, [
                    'id' => $data['id'],
                    'created_at' => now(),
                ]));
            }
        } catch (QueryException $exception) {
            if (str_contains($exception->getMessage(), 'unique')) {
                return response()->json(['error' => 'Cette adresse email est déjà utilisée.'], 409);
            }
            throw $exception;
        }

        return response()->json(['ok' => true], $existing ? 200 : 201);
    }

    public function provisionCompanyAdmin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required', 'string', 'min:1'],
            'email' => ['required', 'email', 'max:255'],
            'displayName' => ['required', 'string', 'min:1', 'max:180'],
            'companyId' => ['required', 'string', 'min:1'],
            'password' => ['required', 'string', 'min:8', 'max:200'],
        ]);
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Seule l’administration MAXIMUS peut activer un compte entreprise.'], 403);
        }

        $email = Str::lower(trim($data['email']));
        $existing = AuthUser::query()->whereKey($data['id'])->first();
        $emailOwner = AuthUser::query()->where('email', $email)->first();
        if ($emailOwner && (! $existing || $emailOwner->id !== $existing->id)) {
            return response()->json(['error' => 'Cette adresse email est déjà utilisée.'], 409);
        }

        $values = [
            'email' => $email,
            'password_hash' => MaximusPassword::hash($data['password']),
            'display_name' => trim($data['displayName']),
            'role' => 'company_admin',
            'company_id' => $data['companyId'],
            'employee_id' => null,
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
            'updated_at' => now(),
        ];

        if ($existing) {
            $existing->update($values);
            AuthSession::query()->where('user_id', $existing->id)->delete();
        } else {
            AuthUser::query()->create(array_merge($values, [
                'id' => $data['id'],
                'created_at' => now(),
            ]));
        }

        return response()->json(['ok' => true], $existing ? 200 : 201);
    }

    public function deleteAccount(Request $request, string $employeeId): Response|JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        $user = AuthUser::query()->where('employee_id', $employeeId)->first();
        if (! $user) {
            return response()->noContent();
        }

        $target = [
            'companyId' => $user->company_id ?? '',
            'employeeId' => $user->employee_id ?? $employeeId,
            'sectorIds' => $user->sector_ids ?? [],
        ];
        if (! CompanyAuthorization::canManageAccount($actor, (string) $target['companyId'], $target['sectorIds'])) {
            return response()->json(['error' => 'Révocation du compte hors périmètre autorisé.'], 403);
        }

        DB::transaction(function () use ($user): void {
            $user->update(['status' => 'SUSPENDU', 'updated_at' => now()]);
            AuthSession::query()->where('user_id', $user->id)->delete();
        });

        return response()->noContent();
    }

    public function session(Request $request): JsonResponse
    {
        $user = MaximusAuth::userFromRequest($request);

        return response()->json([
            'user' => $user ? MaximusAuth::actor($user) : null,
        ]);
    }

    public function logout(Request $request): Response
    {
        if ($token = $request->cookie(MaximusAuth::COOKIE)) {
            AuthSession::query()
                ->where('token_hash', MaximusAuth::hashToken($token))
                ->delete();
        }

        return response()->noContent()->withCookie(cookie()->forget(MaximusAuth::COOKIE));
    }
}
