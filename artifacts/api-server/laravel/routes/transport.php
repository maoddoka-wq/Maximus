<?php

use App\Http\Controllers\Api\TransportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['maximus.auth', 'maximus.company', 'maximus.module:transport'])->prefix('transport')->group(function (): void {
    Route::get('/bootstrap', [TransportController::class, 'bootstrap']);
    Route::post('/drivers', [TransportController::class, 'createDriver']);
    Route::post('/vehicles', [TransportController::class, 'createVehicle']);
    Route::post('/trips', [TransportController::class, 'createTrip']);
    Route::patch('/trips/{id}/status', [TransportController::class, 'updateTripStatus']);
});