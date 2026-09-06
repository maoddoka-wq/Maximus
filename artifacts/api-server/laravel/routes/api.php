<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ModuleController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

Route::get('/healthz', function () {
    try {
        DB::connection()->getPdo();

        return response()->json(['ok' => true, 'database' => true]);
    } catch (\Throwable $exception) {
        report($exception);

        return response()->json(['ok' => false, 'database' => false], 503);
    }
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::get('/session', [AuthController::class, 'session']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::middleware('maximus.auth')->prefix('auth/accounts')->group(function (): void {
    Route::post('/', [AuthController::class, 'createAccount']);
    Route::delete('/{employeeId}', [AuthController::class, 'deleteAccount']);
});

Route::middleware('maximus.auth')->prefix('auth/company-admins')->group(function (): void {
    Route::post('/', [AuthController::class, 'provisionCompanyAdmin']);
});

Route::middleware(['maximus.auth', 'maximus.company'])->prefix('modules')->group(function (): void {
    Route::get('/bootstrap', [ModuleController::class, 'bootstrap']);
    Route::patch('/{moduleId}/access', [ModuleController::class, 'setAccess']);
});

require __DIR__.'/control.php';
require __DIR__.'/presence.php';
require __DIR__.'/stock.php';