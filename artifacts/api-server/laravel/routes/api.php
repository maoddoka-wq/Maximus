<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AppStateController;
use App\Http\Controllers\Api\CompanyController;
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

Route::post('/company-requests', [CompanyController::class, 'createRequest'])->middleware('throttle:login');

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::get('/session', [AuthController::class, 'session']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::middleware('maximus.auth')->prefix('company-requests')->group(function (): void {
    Route::get('/', [CompanyController::class, 'index']);
    Route::post('/{companyId}/approve', [CompanyController::class, 'approve']);
    Route::post('/{companyId}/reject', [CompanyController::class, 'reject']);
});

Route::middleware('maximus.auth')->prefix('companies')->group(function (): void {
    Route::patch('/{companyId}', [CompanyController::class, 'update']);
    Route::post('/{companyId}/profile-photo', [CompanyController::class, 'uploadProfilePhoto']);
    Route::delete('/{companyId}/profile-photo', [CompanyController::class, 'deleteProfilePhoto']);
    Route::delete('/{companyId}', [CompanyController::class, 'destroy']);
});

Route::get('/company-profile-images/{companyId}/{filename}', [CompanyController::class, 'serveProfilePhoto'])
    ->where(['companyId' => '[A-Za-z0-9_-]+', 'filename' => '[A-Za-z0-9_.-]+']);

Route::middleware('maximus.auth')->prefix('auth/accounts')->group(function (): void {
    Route::post('/', [AuthController::class, 'createAccount']);
    Route::delete('/{employeeId}', [AuthController::class, 'deleteAccount']);
});

Route::middleware('maximus.auth')->prefix('auth/company-admins')->group(function (): void {
    Route::post('/', [AuthController::class, 'provisionCompanyAdmin']);
});

Route::middleware('maximus.auth')->patch('/auth/company-password', [AuthController::class, 'updateCompanyPassword']);

Route::middleware(['maximus.auth', 'maximus.company'])->prefix('modules')->group(function (): void {
    Route::get('/bootstrap', [ModuleController::class, 'bootstrap']);
    Route::patch('/{moduleId}/access', [ModuleController::class, 'setAccess']);
});

Route::middleware('maximus.auth')->prefix('app-state')->group(function (): void {
    Route::get('/bootstrap', [AppStateController::class, 'bootstrap']);
    Route::put('/', [AppStateController::class, 'save']);
});

require __DIR__.'/control.php';
require __DIR__.'/presence.php';
require __DIR__.'/stock.php';
require __DIR__.'/ecommerce.php';
require __DIR__.'/payments.php';