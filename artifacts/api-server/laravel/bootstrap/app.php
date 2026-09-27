<?php

use App\Http\Middleware\AuthenticateDiagnosticToken;
use App\Http\Middleware\AuthenticateInstallationToken;
use App\Http\Middleware\AuthenticateMaximus;
use App\Http\Middleware\EnsureModuleEnabled;
use App\Http\Middleware\NoStoreApiResponses;
use App\Http\Middleware\RequireCentralInstallation;
use App\Http\Middleware\RequireInstallationHost;
use App\Http\Middleware\RequireInstallationPublicCompany;
use App\Http\Middleware\ResolveCompanyContext;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\VerifyCookieRequestOrigin;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(SecurityHeaders::class);

        $middleware->appendToGroup('api', [
            NoStoreApiResponses::class,
            RequireInstallationHost::class,
            VerifyCookieRequestOrigin::class,
        ]);

        $middleware->encryptCookies([
            MaximusAuth::COOKIE,
        ]);

        $middleware->alias([
            'maximus.auth' => AuthenticateMaximus::class,
            'maximus.diagnostic' => AuthenticateDiagnosticToken::class,
            'maximus.company' => ResolveCompanyContext::class,
            'maximus.module' => EnsureModuleEnabled::class,
            'maximus.central' => RequireCentralInstallation::class,
            'maximus.installation.token' => AuthenticateInstallationToken::class,
            'maximus.installation.public' => RequireInstallationPublicCompany::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
