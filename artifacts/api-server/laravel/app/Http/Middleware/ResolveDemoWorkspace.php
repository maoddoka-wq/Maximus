<?php

namespace App\Http\Middleware;

use App\Support\DemoWorkspace;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ResolveDemoWorkspace
{
    public function handle(Request $request, Closure $next): Response
    {
        $companyId = $request->attributes->get('companyId');
        $actor = $request->attributes->get('authActor');
        if ((! is_string($companyId) || $companyId === '')
            && is_array($actor)
            && ($actor['role'] ?? null) !== 'maximus_admin'
            && is_string($actor['companyId'] ?? null)) {
            $companyId = $actor['companyId'];
        }
        if (! is_string($companyId) || $companyId === '') {
            return $next($request);
        }

        $demoEnabled = DemoWorkspace::isEnabled($companyId);
        $expectedDataset = $demoEnabled ? 'demo' : 'real';
        $requestedDataset = $request->header('X-Maximus-Dataset');

        if ($request->attributes->has('mobileAuthToken')) {
            if ($requestedDataset !== null && $requestedDataset !== 'real') {
                return response()->json([
                    'error' => 'L’application Chauffeur reste connectée aux données opérationnelles réelles.',
                    'code' => 'DATASET_MODE_CHANGED',
                    'dataset' => 'real',
                ], 409);
            }

            $request->attributes->set('realCompanyId', $companyId);
            $request->attributes->set('demoMode', false);

            return $next($request);
        }

        if (($demoEnabled && $requestedDataset !== 'demo')
            || ($requestedDataset !== null && $requestedDataset !== $expectedDataset)) {
            return response()->json([
                'error' => 'Le mode de données de cette entreprise a changé. Rechargez l’espace avant de continuer.',
                'code' => 'DATASET_MODE_CHANGED',
                'dataset' => $expectedDataset,
            ], 409);
        }

        $request->attributes->set('realCompanyId', $companyId);
        $request->attributes->set('demoMode', $demoEnabled);
        if ($demoEnabled) {
            $datasetCompanyId = DemoWorkspace::datasetCompanyId($companyId);
            $request->attributes->set('companyId', $datasetCompanyId);
            $request->merge(['companyId' => $datasetCompanyId]);
            $request->query->set('companyId', $datasetCompanyId);
        }

        return $next($request);
    }
}
