<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SystemHealthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemHealthController extends Controller
{
    public function show(Request $request, SystemHealthService $health): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'maximus_admin' && ! $request->attributes->has('diagnosticToken')) {
            return response()->json(['error' => 'La surveillance système est réservée à l’administration MAXIMUS.'], 403);
        }

        return response()->json($health->run());
    }
}