<?php

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
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);

        $middleware->appendToGroup('api', [
            \App\Http\Middleware\NoStoreApiResponses::class,
            \App\Http\Middleware\RequireInstallationHost::class,
        ]);

        $middleware->encryptCookies([
            \App\Support\MaximusAuth::COOKIE,
        ]);

        $middleware->alias([
            'maximus.auth' => \App\Http\Middleware\AuthenticateMaximus::class,
            'maximus.diagnostic' => \App\Http\Middleware\AuthenticateDiagnosticToken::class,
            'maximus.company' => \App\Http\Middleware\ResolveCompanyContext::class,
            'maximus.module' => \App\Http\Middleware\EnsureModuleEnabled::class,
            'maximus.central' => \App\Http\Middleware\RequireCentralInstallation::class,
             'maximus.installation.token' => \App\Http\Middleware\AuthenticateInstallationToken::class,
             'maximus.installation.public' => \App\Http\Middleware\RequireInstallationPublicCompany::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
