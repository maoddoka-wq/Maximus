<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DemoPreviewController
{
    private const ANA_SCOPE = 'demo-preview:ana';
    private const PREVIEW_DATABASE = 'heliumdb';

    public function ana(): JsonResponse
    {
        if (! app()->environment('local')) {
            return $this->notFound();
        }

        try {
            if (DB::connection()->getDatabaseName() !== self::PREVIEW_DATABASE) {
                return $this->notFound();
            }

            $row = DB::table('maximus_app_states')
                ->where('scope', self::ANA_SCOPE)
                ->first();
        } catch (\Throwable) {
            return $this->notFound();
        }

        if (! $row) {
            return $this->notFound();
        }

        $payload = is_string($row->payload)
            ? json_decode($row->payload, true)
            : $row->payload;

        if (! is_array($payload) || ! isset($payload['company'], $payload['profiles'])) {
            return $this->notFound();
        }

        return response()
            ->json([...$payload, 'readOnly' => true])
            ->header('Cache-Control', 'no-store')
            ->header('X-Robots-Tag', 'noindex, nofollow');
    }

    private function notFound(): JsonResponse
    {
        return response()
            ->json(['error' => 'Aperçu indisponible.'], 404)
            ->header('Cache-Control', 'no-store')
            ->header('X-Robots-Tag', 'noindex, nofollow');
    }
}