<?php

use App\Http\Controllers\Api\ControlController;
use Illuminate\Support\Facades\Route;

Route::middleware('maximus.auth')->prefix('control')->group(function (): void {
    Route::get('/bootstrap', [ControlController::class, 'bootstrap']);
    Route::post('/tasks', [ControlController::class, 'createTask']);
    Route::patch('/tasks/{id}/status', [ControlController::class, 'updateStatus']);
});