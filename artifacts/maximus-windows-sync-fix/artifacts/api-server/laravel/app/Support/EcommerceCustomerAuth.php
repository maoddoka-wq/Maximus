<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class EcommerceCustomerAuth
{
    public const COOKIE = 'ecommerce_customer_session';

    public static function customerFromRequest(Request $request, string $companyId): ?object
    {
        $token = $request->cookie(self::COOKIE);
        if (! is_string($token) || $token === '') {
            return null;
        }

        $session = DB::table('ecommerce_customer_sessions')
            ->where('token_hash', self::hashToken($token))
            ->where('company_id', $companyId)
            ->where('expires_at', '>', Carbon::now())
            ->first();
        if (! $session) {
            return null;
        }

        return DB::table('ecommerce_customers')
            ->where('id', $session->customer_id)
            ->where('company_id', $companyId)
            ->where('status', 'ACTIF')
            ->first();
    }

    public static function issueSession(object $customer): string
    {
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        DB::table('ecommerce_customer_sessions')->insert([
            'id' => (string) Str::uuid(),
            'customer_id' => $customer->id,
            'company_id' => $customer->company_id,
            'token_hash' => self::hashToken($token),
            'expires_at' => Carbon::now()->addDays(30),
            'created_at' => Carbon::now(),
        ]);

        return $token;
    }

    public static function forget(Request $request): void
    {
        $token = $request->cookie(self::COOKIE);
        if (is_string($token) && $token !== '') {
            DB::table('ecommerce_customer_sessions')
                ->where('token_hash', self::hashToken($token))
                ->delete();
        }
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }
}