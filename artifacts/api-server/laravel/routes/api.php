<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ModuleController;
use Illuminate\Support\Facades\Route;

Route::get('/healthz', function () {
    return response()->json(['ok' => true]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/session', [AuthController::class, 'session']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::middleware('maximus.auth')->prefix('auth/accounts')->group(function (): void {
    Route::post('/', [AuthController::class, 'createAccount']);
    Route::delete('/{employeeId}', [AuthController::class, 'deleteAccount']);
});

Route::middleware(['maximus.auth', 'maximus.company'])->prefix('modules')->group(function (): void {
    Route::get('/catalog', [ModuleController::class, 'catalog']);
    Route::get('/bootstrap', [ModuleController::class, 'bootstrap']);
    Route::patch('/{moduleId}/access', [ModuleController::class, 'setAccess']);
    Route::post('/{moduleId}/features', [ModuleController::class, 'addFeature']);
});

require __DIR__.'/control.php';
require __DIR__.'/presence.php';
require __DIR__.'/stock.php';