<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/healthz', function () {
    return response()->json(['ok' => true]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/session', [AuthController::class, 'session']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

require __DIR__.'/control.php';
require __DIR__.'/presence.php';
require __DIR__.'/stock.php';