<?php

$publicPath = realpath(__DIR__.'/public');
if ($publicPath === false) {
    http_response_code(503);
    exit('Le dossier public de cette installation est introuvable.');
}
$requestPath = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$requestedFile = realpath($publicPath.$requestPath);
$isPublicFile = $requestPath !== '/'
    && $requestedFile !== false
    && str_starts_with($requestedFile, $publicPath.DIRECTORY_SEPARATOR)
    && is_file($requestedFile);

// Serve assets from public even when php -S was launched from the Laravel root.
// A missing asset must never be answered with the SPA HTML (module MIME error).
if (!str_starts_with($requestPath, '/api') && $requestPath !== '/up') {
    $extension = strtolower(pathinfo($requestPath, PATHINFO_EXTENSION));
    $contentTypes = [
        'js' => 'text/javascript; charset=utf-8', 'mjs' => 'text/javascript; charset=utf-8',
        'css' => 'text/css; charset=utf-8', 'json' => 'application/json',
        'webmanifest' => 'application/manifest+json', 'svg' => 'image/svg+xml',
        'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
        'webp' => 'image/webp', 'gif' => 'image/gif', 'ico' => 'image/x-icon',
        'woff' => 'font/woff', 'woff2' => 'font/woff2', 'ttf' => 'font/ttf',
        'txt' => 'text/plain; charset=utf-8', 'wasm' => 'application/wasm',
    ];
    if (isset($contentTypes[$extension])) {
        header('X-Content-Type-Options: nosniff');
        if (!$isPublicFile) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            exit('Ressource introuvable.');
        }
        header('Content-Type: '.$contentTypes[$extension]);
        header('Content-Length: '.filesize($requestedFile));
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') readfile($requestedFile);
        return true;
    }
}

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
    readfile($publicPath.'/index.html');
    return true;
}

require $publicPath.'/index.php';