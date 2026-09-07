<?php

use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PaymentWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/webhooks/diamanopay', [PaymentWebhookController::class, 'diamanopay'])
    ->middleware('throttle:payment-webhooks');

Route::middleware(['maximus.auth', 'maximus.company'])->prefix('payments')->group(function (): void {
    Route::get('/', [PaymentController::class, 'index']);
    Route::post('/', [PaymentController::class, 'create'])->middleware('throttle:orders');
    Route::get('/{id}', [PaymentController::class, 'show']);
    Route::post('/{id}/refunds', [PaymentController::class, 'refund']);
});

Route::middleware(['maximus.auth', 'maximus.company'])->prefix('wallet')->group(function (): void {
    Route::get('/', [PaymentController::class, 'wallet']);
    Route::get('/payout-accounts', [PaymentController::class, 'payoutAccounts']);
    Route::post('/payout-accounts', [PaymentController::class, 'createPayoutAccount']);
    Route::get('/withdrawals', [PaymentController::class, 'withdrawals']);
    Route::post('/withdrawals', [PaymentController::class, 'createWithdrawal']);
});