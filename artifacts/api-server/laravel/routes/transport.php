<?php

use App\Http\Controllers\Api\TransportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['maximus.auth', 'maximus.company', 'maximus.module:transport'])->prefix('transport')->group(function (): void {
    Route::get('/bootstrap', [TransportController::class, 'bootstrap']);
    Route::post('/drivers', [TransportController::class, 'createDriver']);
    Route::patch('/drivers/{id}/location', [TransportController::class, 'updateDriverLocation']);
    Route::patch('/settings', [TransportController::class, 'updateSettings']);
    Route::post('/vehicles', [TransportController::class, 'createVehicle']);
    Route::post('/trips', [TransportController::class, 'createTrip']);
    Route::patch('/trips/{id}/status', [TransportController::class, 'updateTripStatus']);
});

Route::post('/shop/{slug}/transport/trips', [TransportController::class, 'createPublicTrip'])->middleware('throttle:orders');
Route::get('/shop/{slug}/transport/trips/{id}', [TransportController::class, 'getPublicTrip'])->middleware('throttle:orders');
Route::post('/shop-domain/transport/trips', [TransportController::class, 'createPublicDomainTrip'])->middleware('throttle:orders');
Route::get('/shop-domain/transport/trips/{id}', [TransportController::class, 'publicDomainTrip'])->middleware('throttle:orders');