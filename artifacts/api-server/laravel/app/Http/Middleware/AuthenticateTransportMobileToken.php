<?php

namespace App\Http\Middleware;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateTransportMobileToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = (string) $request->header('Authorization');
        if (! preg_match('/^\s*Bearer\s+(\S+)\s*$/i', $header, $match)) {
            return response()->json(['error' => 'Jeton mobile absent ou invalide.'], 401);
        }
        $token = DB::table('transport_mobile_tokens')->where('token_hash', hash('sha256', $match[1]))
            ->whereNull('revoked_at')->where('expires_at', '>', Carbon::now())->first();
        if (! $token) {
            return response()->json(['error' => 'Jeton mobile absent, révoqué ou expiré.'], 401);
        }
        if (! ModuleCatalog::allowsFeature((string) $token->company_id, 'transport', 'overview')) {
            return response()->json(['error' => 'Le module Transport n’est pas activé pour cette entreprise.'], 403);
        }
        $employee = AuthUser::query()->whereKey($token->employee_id)->where('status', 'ACTIF')
            ->where('role', 'employee')->where('company_id', $token->company_id)->first();
        $driver = DB::table('transport_drivers')->where('id', $token->driver_id)
            ->where('company_id', $token->company_id)->where('employee_id', $token->employee_id)
            ->where('status', 'ACTIVE')->first();
        if (! $employee || ! $driver) {
            return response()->json(['error' => 'Le compte chauffeur ou son profil n’est plus actif.'], 403);
        }
        DB::table('transport_mobile_tokens')->where('id', $token->id)->update(['last_used_at' => Carbon::now()]);
        $request->attributes->set('authActor', MaximusAuth::actor($employee));
        $request->attributes->set('transportMobileToken', $token);
        $request->attributes->set('transportMobileDriver', $driver);
        $request->attributes->set('companyId', $token->company_id);
        return $next($request);
    }
}