<?php

use App\Http\Controllers\Api\PresenceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['maximus.auth', 'maximus.company', 'maximus.module:presences'])->prefix('presence')->group(function (): void {
    Route::get('/bootstrap', [PresenceController::class, 'bootstrap']);
    Route::post('/items', [PresenceController::class, 'create']);
    Route::patch('/items/{id}', [PresenceController::class, 'update']);
    Route::delete('/items/{id}', [PresenceController::class, 'delete']);
    Route::get('/clock-qr', [PresenceController::class, 'clockQr']);
    Route::post('/clock', [PresenceController::class, 'clock']);
    Route::post('/clock-scan', [PresenceController::class, 'clockScan']);
});