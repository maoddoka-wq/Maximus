<?php

use App\Http\Controllers\PublicPageController;
use Illuminate\Support\Facades\Route;

Route::get('/shop/{slug}/{path?}', [PublicPageController::class, 'shop'])
    ->where('path', '.*');

Route::get('/{path?}', [PublicPageController::class, 'root'])
    ->where('path', '.*');
