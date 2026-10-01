<?php

namespace App\Http\Middleware;

use App\Support\EcommerceCustomerAuth;
use App\Support\MaximusAuth;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class VerifyCookieRequestOrigin
{
    private const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

    public function handle(Request $request, Closure $next): Response
    {
        if (in_array(strtoupper($request->method()), self::SAFE_METHODS, true)) {
            return $next($request);
        }

        $hasCookieSession = $request->cookies->has(MaximusAuth::COOKIE)
            || $request->cookies->has(EcommerceCustomerAuth::COOKIE);
        if (! $hasCookieSession) {
            return $next($request);
        }

        $source = $request->headers->has('Origin')
            ? (string) $request->headers->get('Origin')
            : (string) $request->headers->get('Referer', '');
        $requestOrigin = $this->normalizeOrigin($source);

        $allowedOrigins = [
            $this->normalizeOrigin((string) config('app.url', '')),
            $this->normalizeOrigin($request->getSchemeAndHttpHost()),
        ];
        foreach (config('maximus.allowed_origins', []) as $origin) {
            $allowedOrigins[] = $this->normalizeOrigin((string) $origin);
        }

        $allowedOrigins = array_values(array_filter($allowedOrigins));
        if ($requestOrigin === null || ! in_array($requestOrigin, $allowedOrigins, true)) {
            return response()->json([
                'error' => 'Origine de requête non autorisée.',
                'code' => 'COOKIE_REQUEST_ORIGIN_FORBIDDEN',
            ], 403);
        }

        return $next($request);
    }

    private function normalizeOrigin(string $url): ?string
    {
        $parts = parse_url(trim($url));
        if (! is_array($parts) || ! isset($parts['scheme'], $parts['host'])) {
            return null;
        }

        $scheme = strtolower((string) $parts['scheme']);
        $host = strtolower(rtrim((string) $parts['host'], '.'));
        if (! in_array($scheme, ['http', 'https'], true) || $host === '' || isset($parts['user']) || isset($parts['pass'])) {
            return null;
        }

        $port = $parts['port'] ?? null;
        if ($port !== null && ($port < 1 || $port > 65535)) {
            return null;
        }

        $defaultPort = $scheme === 'https' ? 443 : 80;
        $authority = $host.($port !== null && $port !== $defaultPort ? ':'.$port : '');

        return $scheme.'://'.$authority;
    }
}
