<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Installation scope
    |--------------------------------------------------------------------------
    |
    | "central" keeps the current multi-company MAXIMUS behavior. Dedicated
    | and on-premise installations expose one company workspace only.
    |
    */
    'deployment_mode' => env('MAXIMUS_DEPLOYMENT_MODE', 'central'),
    'installation_company_id' => env('MAXIMUS_INSTALLATION_COMPANY_ID'),
    'installation_id' => env('MAXIMUS_INSTALLATION_ID'),
    // Exact runtime-provided hosts only; no suffix or client-forwarded-host trust.
    'preview_hosts' => array_values(array_filter(array_map('trim', explode(',', (string) env('MAXIMUS_PREVIEW_HOSTS', env('REPLIT_DOMAINS', env('REPLIT_DEV_DOMAIN', ''))))))),
    'installation_login_slug' => env('MAXIMUS_INSTALLATION_LOGIN_SLUG'),
    'central_url' => env('MAXIMUS_CENTRAL_URL'),
    'central_public_url' => env('MAXIMUS_CENTRAL_PUBLIC_URL', env('APP_URL', 'http://localhost')),
    'installation_token' => env('MAXIMUS_INSTALLATION_TOKEN'),
    'application_version' => env('MAXIMUS_APPLICATION_VERSION', env('RENDER_GIT_COMMIT', 'unknown')),
    'expected_application_version' => env('MAXIMUS_EXPECTED_APPLICATION_VERSION'),
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('MAXIMUS_ALLOWED_ORIGINS', '')),
    ))),
];
