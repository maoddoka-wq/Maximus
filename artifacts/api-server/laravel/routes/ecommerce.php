<?php

use App\Http\Controllers\Api\EcommerceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['maximus.auth', 'maximus.company', 'maximus.module:ecommerce'])
    ->prefix('ecommerce')
    ->group(function (): void {
        Route::get('/bootstrap', [EcommerceController::class, 'bootstrap']);
        Route::patch('/store', [EcommerceController::class, 'updateStore']);
        Route::post('/products', [EcommerceController::class, 'createProduct']);
        Route::patch('/products/{id}', [EcommerceController::class, 'updateProduct']);
        Route::delete('/products/{id}', [EcommerceController::class, 'archiveProduct']);
        Route::patch('/orders/{id}/status', [EcommerceController::class, 'updateOrderStatus']);
    });

Route::prefix('shop/{slug}')->group(function (): void {
    Route::get('/', [EcommerceController::class, 'publicBootstrap']);
    Route::post('/orders', [EcommerceController::class, 'createPublicOrder'])->middleware('throttle:orders');
});