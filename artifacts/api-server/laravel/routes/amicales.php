<?php

use App\Http\Controllers\Api\AmicaleController;
use Illuminate\Support\Facades\Route;

Route::middleware(['maximus.auth', 'maximus.company', 'maximus.subscription', 'maximus.demo-data', 'maximus.module:amicales'])
    ->prefix('amicales')
    ->group(function (): void {
        Route::get('/bootstrap', [AmicaleController::class, 'bootstrap']);
        Route::post('/members', [AmicaleController::class, 'createMember']);
        Route::patch('/members/{id}', [AmicaleController::class, 'updateMember']);
        Route::post('/members/{id}/archive', [AmicaleController::class, 'archiveMember']);
        Route::post('/contributions', [AmicaleController::class, 'createContribution']);
        Route::post('/dues-periods', [AmicaleController::class, 'createDuesPeriod']);
        Route::patch('/dues-periods/{id}', [AmicaleController::class, 'updateDuesPeriod']);
        Route::post('/contributions/checkout', [AmicaleController::class, 'createMemberCheckout']);
        Route::get('/contributions/{id}/payment-status', [AmicaleController::class, 'checkMemberPayment']);
        Route::post('/expenses', [AmicaleController::class, 'createExpense']);
        Route::post('/expenses/{id}/decision', [AmicaleController::class, 'decideExpense']);
        Route::post('/expenses/{id}/paid', [AmicaleController::class, 'markExpensePaid']);
        Route::post('/activities', [AmicaleController::class, 'createActivity']);
        Route::patch('/activities/{id}', [AmicaleController::class, 'updateActivity']);
        Route::post('/announcements', [AmicaleController::class, 'createAnnouncement']);
        Route::patch('/announcements/{id}', [AmicaleController::class, 'updateAnnouncement']);
    });

Route::post('/payments/diamanopay/amicales-webhook', [AmicaleController::class, 'amicalePaymentWebhook']);
