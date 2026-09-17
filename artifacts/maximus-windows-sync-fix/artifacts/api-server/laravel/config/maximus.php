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
    'installation_login_slug' => env('MAXIMUS_INSTALLATION_LOGIN_SLUG'),
    'central_url' => env('MAXIMUS_CENTRAL_URL'),
    'central_public_url' => env('MAXIMUS_CENTRAL_PUBLIC_URL', env('APP_URL', 'http://localhost')),
    'installation_token' => env('MAXIMUS_INSTALLATION_TOKEN'),
];