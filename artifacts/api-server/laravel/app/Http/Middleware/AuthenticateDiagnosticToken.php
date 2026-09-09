<?php

namespace App\Http\Middleware;

use App\Services\DiagnosticTokenService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateDiagnosticToken
{
    public function __construct(private readonly DiagnosticTokenService $tokens) {}

    public function handle(Request $request, Closure $next): Response
    {
        $authorization = (string) $request->header('Authorization');
        if (! preg_match('/^Bearer\s+(\S+)$/i', $authorization, $matches)) {
            return response()->json(['error' => 'Token de diagnostic absent.'], 401);
        }

        $token = $this->tokens->resolve($matches[1]);
        if (! $token || $token->scope !== DiagnosticTokenService::SCOPE) {
            return response()->json(['error' => 'Token de diagnostic invalide, expiré ou révoqué.'], 401);
        }

        $request->attributes->set('diagnosticToken', $token);
        $request->attributes->set('authActor', [
            'role' => 'maximus_admin',
            'displayName' => 'Accès diagnostic',
            'companyId' => null,
            'employeeId' => null,
            'sectorIds' => [],
            'permissions' => [],
        ]);

        return $next($request);
    }
}