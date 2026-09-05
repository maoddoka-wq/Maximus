<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        if (!$user || !MaximusPassword::check($data['password'], $user->password_hash)) {
            return response()->json([
                'error' => 'Email ou mot de passe incorrect.',
            ], 401);
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
        ]);
        $actor = $request->attributes->get('authActor');
        $canManage = ($actor['role'] ?? null) === 'maximus_admin'
            || (($actor['companyId'] ?? null) === $data['companyId']
                && (($actor['role'] ?? null) === 'company_admin'
                    || (($actor['role'] ?? null) === 'sector_manager'
                        && array_intersect($data['sectorIds'], $actor['sectorIds'] ?? []))));

        if (!$canManage) {
            return response()->json(['error' => 'Provisionnement du compte hors périmètre autorisé.'], 403);
        }

        $existing = AuthUser::query()->where('employee_id', $data['employeeId'])->first();
        if (!$existing && empty($data['password'])) {
            return response()->json(['error' => 'Un mot de passe initial est requis pour ce compte.'], 400);
        }

        $values = [
            'email' => Str::lower(trim($data['email'])),
            'display_name' => trim($data['displayName']),
            'role' => $data['role'],
            'company_id' => $data['companyId'],
            'employee_id' => $data['employeeId'],
            'sector_ids' => $data['sectorIds'],
            'status' => 'ACTIF',
            'updated_at' => now(),
        ];
        if (!empty($data['password'])) {
            $values['password_hash'] = MaximusPassword::hash($data['password']);
        }

        try {
            if ($existing) {
                $existing->update($values);
                if (!empty($data['password'])) {
                    AuthSession::query()->where('user_id', $existing->id)->delete();
                }
            } else {
                AuthUser::query()->create(array_merge($values, [
                    'id' => $data['id'],
                    'created_at' => now(),
                ]));
            }
        } catch (\Illuminate\Database\QueryException $exception) {
            if (str_contains($exception->getMessage(), 'unique')) {
                return response()->json(['error' => 'Cette adresse email est déjà utilisée.'], 409);
            }
            throw $exception;
        }

        return response()->json(['ok' => true], $existing ? 200 : 201);
    }

    public function deleteAccount(Request $request, string $employeeId): \Illuminate\Http\Response|JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        $user = AuthUser::query()->where('employee_id', $employeeId)->first();
        if (!$user) {
            return response()->noContent();
        }

        $target = [
            'companyId' => $user->company_id ?? '',
            'employeeId' => $user->employee_id ?? $employeeId,
            'sectorIds' => $user->sector_ids ?? [],
        ];
        $canManage = ($actor['role'] ?? null) === 'maximus_admin'
            || (($actor['companyId'] ?? null) === $target['companyId']
                && (($actor['role'] ?? null) === 'company_admin'
                    || (($actor['role'] ?? null) === 'sector_manager'
                        && array_intersect($target['sectorIds'], $actor['sectorIds'] ?? []))));
        if (!$canManage) {
            return response()->json(['error' => 'Révocation du compte hors périmètre autorisé.'], 403);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($user): void {
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

    public function logout(Request $request): \Illuminate\Http\Response
    {
        if ($token = $request->cookie(MaximusAuth::COOKIE)) {
            AuthSession::query()
                ->where('token_hash', MaximusAuth::hashToken($token))
                ->delete();
        }

        return response()->noContent()->withCookie(cookie()->forget(MaximusAuth::COOKIE));
    }
}