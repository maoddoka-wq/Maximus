<?php

use App\Http\Controllers\Api\PresenceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['maximus.auth', 'maximus.company'])->prefix('presence')->group(function (): void {
    Route::get('/bootstrap', [PresenceController::class, 'bootstrap']);
    Route::post('/items', [PresenceController::class, 'create']);
    Route::patch('/items/{id}', [PresenceController::class, 'update']);
    Route::delete('/items/{id}', [PresenceController::class, 'delete']);
    Route::post('/clock', [PresenceController::class, 'clock']);
});