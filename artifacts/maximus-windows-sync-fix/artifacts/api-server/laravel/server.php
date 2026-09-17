<?php

$publicPath = __DIR__.'/public';
$requestPath = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$requestedFile = realpath($publicPath.$requestPath);

if (
    !str_starts_with($requestPath, '/api')
    && $requestPath !== '/up'
) {
    header('Content-Security-Policy: default-src \'self\'; base-uri \'self\'; object-src \'none\'; frame-ancestors \'none\'; form-action \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; font-src \'self\' https://fonts.gstatic.com data:; img-src \'self\' data: blob: https:; connect-src \'self\' https:; manifest-src \'self\'; worker-src \'self\' blob:; frame-src \'none\'; upgrade-insecure-requests');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');

    if ((string) ($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: '') === 'production') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

if (
    !str_starts_with($requestPath, '/api')
    && $requestPath !== '/up'
    && is_file($publicPath.'/index.html')
) {
    if (
        $requestPath !== '/'
        && $requestedFile !== false
        && str_starts_with($requestedFile, $publicPath.DIRECTORY_SEPARATOR)
        && is_file($requestedFile)
    ) {
        return false;
    }

    readfile($publicPath.'/index.html');
    return true;
}

if (
    $requestPath !== '/'
    && $requestedFile !== false
    && str_starts_with($requestedFile, $publicPath.DIRECTORY_SEPARATOR)
    && is_file($requestedFile)
) {
    return false;
}

require $publicPath.'/index.php';