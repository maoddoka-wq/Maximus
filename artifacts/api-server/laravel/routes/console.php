<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Support\InstallationContext;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Configuration only, not application updates. Failed attempts retain local
// access and are retried on the next tick; an external scheduler must be enabled.
Schedule::command('maximus:sync-central-installation')
    ->everyFifteenMinutes()
    ->withoutOverlapping(60)
    ->when(fn (): bool => InstallationContext::isCompanyOnly());
