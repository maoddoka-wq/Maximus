<?php

use App\Http\Controllers\Api\ImmobilierController;
use Illuminate\Support\Facades\Route;

Route::middleware(['maximus.auth', 'maximus.company', 'maximus.module:immobilier'])
    ->prefix('immobilier')
    ->group(function (): void {
        Route::get('/bootstrap', [ImmobilierController::class, 'bootstrap']);
        Route::post('/listings', [ImmobilierController::class, 'storeListing']);
        Route::patch('/listings/{id}', [ImmobilierController::class, 'updateListing']);
        Route::delete('/listings/{id}', [ImmobilierController::class, 'archiveListing']);
        Route::patch('/leads/{id}', [ImmobilierController::class, 'updateLead']);
    });

Route::middleware('maximus.installation.public')->group(function (): void {
    Route::post('/shop/{slug}/immobilier/leads', [ImmobilierController::class, 'publicLead'])->middleware('throttle:orders');
    Route::post('/shop-domain/immobilier/leads', [ImmobilierController::class, 'publicDomainLead'])->middleware('throttle:orders');
});