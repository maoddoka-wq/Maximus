<?php

use App\Http\Controllers\Api\ControlController;
use App\Http\Controllers\Api\SystemHealthController;
use Illuminate\Support\Facades\Route;

Route::middleware(['maximus.auth', 'maximus.company'])->prefix('control')->group(function (): void {
    Route::get('/bootstrap', [ControlController::class, 'bootstrap']);
    Route::get('/health', [SystemHealthController::class, 'show']);
    Route::post('/tasks', [ControlController::class, 'createTask']);
    Route::patch('/tasks/{id}/status', [ControlController::class, 'updateStatus']);
});