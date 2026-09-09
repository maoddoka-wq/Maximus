<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AppStateController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DiagnosticTokenController;
use App\Http\Controllers\Api\ModuleController;
use App\Http\Controllers\Api\PlatformSettingsController;
use App\Http\Controllers\Api\SystemHealthController;
use App\Services\SystemHealthService;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

Route::get('/healthz', function () {
    try {
        $health = app(SystemHealthService::class)->run();
        $database = collect($health['checks'])->firstWhere('key', 'database');
        $ok = $health['status'] === 'OPERATIONAL';

        return response()->json([
            'ok' => $ok,
            'database' => ($database['status'] ?? null) === 'UP',
            'status' => $health['status'],
            'checkedAt' => $health['checkedAt'],
        ], $ok ? 200 : 503);
    } catch (\Throwable $exception) {
        report($exception);

        return response()->json(['ok' => false, 'database' => false, 'status' => 'DOWN'], 503);
    }
});

Route::get('/registration-catalog', [AppStateController::class, 'registrationCatalog']);
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

Route::middleware('maximus.auth')->prefix('platform-settings')->group(function (): void {
    Route::get('/seller-wallet-maturity', [PlatformSettingsController::class, 'sellerWalletMaturity']);
    Route::put('/seller-wallet-maturity', [PlatformSettingsController::class, 'updateSellerWalletMaturity']);
    Route::get('/diagnostic-tokens', [DiagnosticTokenController::class, 'index']);
    Route::post('/diagnostic-tokens', [DiagnosticTokenController::class, 'store']);
    Route::delete('/diagnostic-tokens/{id}', [DiagnosticTokenController::class, 'revoke']);
});

Route::middleware('maximus.diagnostic')->get('/diagnostics/health', [SystemHealthController::class, 'show']);

require __DIR__.'/control.php';
require __DIR__.'/presence.php';
require __DIR__.'/stock.php';
require __DIR__.'/ecommerce.php';