<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthUser;
use App\Models\DiagnosticToken;
use App\Services\DiagnosticTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class DiagnosticTokenController extends Controller
{
    public function __construct(private readonly DiagnosticTokenService $tokens) {}

    public function index(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Les accès de diagnostic sont réservés à l’administration MAXIMUS.'], 403);
        }

        return response()->json([
            'tokens' => DiagnosticToken::query()
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (DiagnosticToken $token): array => $this->tokens->summary($token))
                ->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Les accès de diagnostic sont réservés à l’administration MAXIMUS.'], 403);
        }

        $input = $request->validate([
            'label' => ['required', 'string', 'min:2', 'max:120'],
            'expiresInHours' => ['required', 'integer', 'min:1', 'max:168'],
        ]);
        $user = $request->attributes->get('authUser');
        if (! $user instanceof AuthUser) {
            return response()->json(['error' => 'Session MAXIMUS absente ou expirée.'], 401);
        }

        return response()->json($this->tokens->issue($user, trim($input['label']), (int) $input['expiresInHours']), 201);
    }

    public function revoke(Request $request, string $id): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Les accès de diagnostic sont réservés à l’administration MAXIMUS.'], 403);
        }

        $token = DiagnosticToken::query()->find($id);
        if (! $token) {
            return response()->json(['error' => 'Accès de diagnostic introuvable.'], 404);
        }

        $token->forceFill([
            'revoked_at' => now(),
            'updated_at' => now(),
        ])->save();

        return response()->json(['ok' => true]);
    }

    private function isMaximusAdmin(Request $request): bool
    {
        return ($request->attributes->get('authActor')['role'] ?? null) === 'maximus_admin';
    }
}