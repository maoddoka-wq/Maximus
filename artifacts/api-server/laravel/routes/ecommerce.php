<?php

use App\Http\Controllers\Api\EcommerceController;
use App\Http\Controllers\Api\EcommerceCustomerController;
use App\Http\Controllers\Api\EcommercePaymentController;
use App\Http\Controllers\Api\SellerWalletController;
use Illuminate\Support\Facades\Route;

Route::post('/payments/diamanopay/webhook', [SellerWalletController::class, 'webhook']);

Route::middleware(['maximus.auth', 'maximus.company', 'maximus.module:ecommerce'])
    ->prefix('ecommerce')
    ->group(function (): void {
        Route::get('/bootstrap', [EcommerceController::class, 'bootstrap']);
        Route::get('/wallet', [SellerWalletController::class, 'bootstrap']);
        Route::patch('/wallet/payout-account', [SellerWalletController::class, 'updatePayoutAccount']);
        Route::post('/wallet/withdrawals', [SellerWalletController::class, 'requestWithdrawal'])->middleware('throttle:withdrawals');
        Route::patch('/store', [EcommerceController::class, 'updateStore']);
        Route::post('/categories', [EcommerceController::class, 'createCategory']);
        Route::patch('/categories/{id}', [EcommerceController::class, 'updateCategory']);
        Route::delete('/categories/{id}', [EcommerceController::class, 'deleteCategory']);
        Route::post('/domains', [EcommerceController::class, 'createDomain']);
        Route::post('/domains/{id}/verify', [EcommerceController::class, 'verifyDomain']);
        Route::delete('/domains/{id}', [EcommerceController::class, 'deleteDomain']);
        Route::post('/products', [EcommerceController::class, 'createProduct']);
        Route::post('/products/{id}/image', [EcommerceController::class, 'uploadProductImage']);
        Route::patch('/products/{id}', [EcommerceController::class, 'updateProduct']);
        Route::delete('/products/{id}', [EcommerceController::class, 'archiveProduct']);
        Route::patch('/orders/{id}/status', [EcommerceController::class, 'updateOrderStatus']);
    });

Route::get('/shop-domain', [EcommerceController::class, 'publicBootstrapByDomain']);
Route::post('/shop-domain/orders', [EcommerceController::class, 'createPublicDomainOrder'])->middleware('throttle:orders');
Route::get('/product-images/{company}/{filename}', [EcommerceController::class, 'serveProductImage'])
    ->where(['company' => '[A-Za-z0-9_-]+', 'filename' => '[A-Za-z0-9_.-]+']);

Route::prefix('shop/{slug}')->group(function (): void {
    Route::get('/', [EcommerceController::class, 'publicBootstrap']);
    Route::post('/orders', [EcommerceController::class, 'createPublicOrder'])->middleware('throttle:orders');
    Route::post('/orders/{orderId}/payment', [EcommercePaymentController::class, 'create'])->middleware('throttle:orders');
    Route::get('/customer/session', [EcommerceCustomerController::class, 'session']);
    Route::post('/customer/register', [EcommerceCustomerController::class, 'register'])->middleware('throttle:login');
    Route::post('/customer/login', [EcommerceCustomerController::class, 'login'])->middleware('throttle:login');
    Route::get('/customer/bootstrap', [EcommerceCustomerController::class, 'bootstrap']);
    Route::patch('/customer/profile', [EcommerceCustomerController::class, 'updateProfile']);
    Route::patch('/customer/password', [EcommerceCustomerController::class, 'changePassword']);
    Route::get('/customer/addresses', [EcommerceCustomerController::class, 'listAddresses']);
    Route::post('/customer/addresses', [EcommerceCustomerController::class, 'createAddress']);
    Route::patch('/customer/addresses/{id}', [EcommerceCustomerController::class, 'updateAddress']);
    Route::delete('/customer/addresses/{id}', [EcommerceCustomerController::class, 'deleteAddress']);
    Route::get('/customer/favorites', [EcommerceCustomerController::class, 'favorites']);
    Route::post('/customer/favorites/{productSlug}', [EcommerceCustomerController::class, 'toggleFavorite']);
    Route::get('/customer/cart', [EcommerceCustomerController::class, 'cart']);
    Route::put('/customer/cart', [EcommerceCustomerController::class, 'putCartItem']);
    Route::delete('/customer/cart', [EcommerceCustomerController::class, 'clearCart']);
    Route::get('/customer/orders', [EcommerceCustomerController::class, 'orders']);
    Route::get('/customer/orders/{id}', [EcommerceCustomerController::class, 'order']);
});

Route::get('/shop-domain/customer/session', [EcommerceCustomerController::class, 'session']);
Route::post('/shop-domain/customer/register', [EcommerceCustomerController::class, 'register'])->middleware('throttle:login');
Route::post('/shop-domain/customer/login', [EcommerceCustomerController::class, 'login'])->middleware('throttle:login');
Route::get('/shop-domain/customer/bootstrap', [EcommerceCustomerController::class, 'bootstrap']);
Route::patch('/shop-domain/customer/profile', [EcommerceCustomerController::class, 'updateProfile']);
Route::patch('/shop-domain/customer/password', [EcommerceCustomerController::class, 'changePassword']);
Route::get('/shop-domain/customer/addresses', [EcommerceCustomerController::class, 'listAddresses']);
Route::post('/shop-domain/customer/addresses', [EcommerceCustomerController::class, 'createAddress']);
Route::patch('/shop-domain/customer/addresses/{id}', [EcommerceCustomerController::class, 'updateAddress']);
Route::delete('/shop-domain/customer/addresses/{id}', [EcommerceCustomerController::class, 'deleteAddress']);
Route::get('/shop-domain/customer/favorites', [EcommerceCustomerController::class, 'favorites']);
Route::post('/shop-domain/customer/favorites/{productSlug}', [EcommerceCustomerController::class, 'toggleFavorite']);
Route::get('/shop-domain/customer/cart', [EcommerceCustomerController::class, 'cart']);
Route::put('/shop-domain/customer/cart', [EcommerceCustomerController::class, 'putCartItem']);
Route::delete('/shop-domain/customer/cart', [EcommerceCustomerController::class, 'clearCart']);
Route::get('/shop-domain/customer/orders', [EcommerceCustomerController::class, 'orders']);
Route::get('/shop-domain/customer/orders/{id}', [EcommerceCustomerController::class, 'order']);
Route::post('/shop-domain/orders/{orderId}/payment', [EcommercePaymentController::class, 'createByDomain'])->middleware('throttle:orders');
Route::post('/shop-domain/customer/logout', [EcommerceCustomerController::class, 'logout']);
Route::post('/shop/{slug}/customer/logout', [EcommerceCustomerController::class, 'logout']);