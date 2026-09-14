<?php

use App\Http\Controllers\Api\TransportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['maximus.auth', 'maximus.company', 'maximus.module:transport'])->prefix('transport')->group(function (): void {
    Route::get('/bootstrap', [TransportController::class, 'bootstrap']);
    Route::post('/drivers', [TransportController::class, 'createDriver']);
    Route::patch('/drivers/{id}/location', [TransportController::class, 'updateDriverLocation']);
    Route::patch('/settings', [TransportController::class, 'updateSettings']);
    Route::get('/settings/hero-image', [TransportController::class, 'transportHeroImage']);
    Route::post('/vehicles', [TransportController::class, 'createVehicle']);
    Route::patch('/vehicles/{id}', [TransportController::class, 'updateVehicle']);
    Route::delete('/vehicles/{id}', [TransportController::class, 'deleteVehicle']);
    Route::get('/vehicles/{id}/image', [TransportController::class, 'vehicleImage']);
    Route::post('/trips', [TransportController::class, 'createTrip']);
    Route::patch('/trips/{id}/status', [TransportController::class, 'updateTripStatus']);
});

Route::post('/shop/{slug}/transport/trips', [TransportController::class, 'createPublicTrip'])->middleware('throttle:orders');
Route::post('/shop/{slug}/transport/quote', [TransportController::class, 'quotePublicTrip'])->middleware('throttle:orders');
Route::get('/shop/{slug}/transport/trips/{id}', [TransportController::class, 'getPublicTrip'])->middleware('throttle:orders');
Route::post('/shop/{slug}/transport/trips/{id}/cancel', [TransportController::class, 'cancelPublicTrip'])->middleware('throttle:orders');
Route::get('/shop/{slug}/transport/vehicles/{id}/image', [TransportController::class, 'publicVehicleImage'])->middleware('throttle:orders');
Route::get('/shop/{slug}/transport/settings', [TransportController::class, 'publicTransportSettings'])->middleware('throttle:orders');
Route::get('/shop/{slug}/transport/hero-image', [TransportController::class, 'publicTransportHeroImage'])->middleware('throttle:orders');
Route::post('/shop-domain/transport/trips', [TransportController::class, 'createPublicDomainTrip'])->middleware('throttle:orders');
Route::post('/shop-domain/transport/quote', [TransportController::class, 'quotePublicDomainTrip'])->middleware('throttle:orders');
Route::get('/shop-domain/transport/trips/{id}', [TransportController::class, 'publicDomainTrip'])->middleware('throttle:orders');
Route::post('/shop-domain/transport/trips/{id}/cancel', [TransportController::class, 'cancelPublicDomainTrip'])->middleware('throttle:orders');
Route::get('/shop-domain/transport/vehicles/{id}/image', [TransportController::class, 'publicDomainVehicleImage'])->middleware('throttle:orders');
Route::get('/shop-domain/transport/settings', [TransportController::class, 'publicDomainTransportSettings'])->middleware('throttle:orders');
Route::get('/shop-domain/transport/hero-image', [TransportController::class, 'publicDomainTransportHeroImage'])->middleware('throttle:orders');