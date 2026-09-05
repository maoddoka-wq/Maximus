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