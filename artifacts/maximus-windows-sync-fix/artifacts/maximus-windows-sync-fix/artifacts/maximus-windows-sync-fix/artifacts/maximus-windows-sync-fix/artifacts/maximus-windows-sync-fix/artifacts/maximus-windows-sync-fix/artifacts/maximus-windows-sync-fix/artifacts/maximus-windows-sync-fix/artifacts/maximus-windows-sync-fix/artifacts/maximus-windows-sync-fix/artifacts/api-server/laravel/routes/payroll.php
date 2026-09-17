<?php

use App\Http\Controllers\Api\PayrollController;
use Illuminate\Support\Facades\Route;

Route::middleware(['maximus.auth', 'maximus.company', 'maximus.module:paie'])->prefix('payroll')->group(function (): void {
    Route::get('/bootstrap', [PayrollController::class, 'bootstrap']);
    Route::post('/beneficiaries', [PayrollController::class, 'createBeneficiary']);
    Route::patch('/beneficiaries/{id}', [PayrollController::class, 'updateBeneficiary']);
    Route::delete('/beneficiaries/{id}', [PayrollController::class, 'archiveBeneficiary']);
    Route::post('/batches', [PayrollController::class, 'createBatch']);
    Route::post('/batches/{id}/submit', [PayrollController::class, 'submitBatch']);
    Route::post('/batches/{id}/approve', [PayrollController::class, 'approveBatch']);
    Route::post('/batches/{id}/payout', [PayrollController::class, 'payoutBatch']);
    Route::post('/wallet/topups', [PayrollController::class, 'topup'])->middleware('throttle:withdrawals');
});