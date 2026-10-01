<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ModuleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class TransportMobileReleaseController extends Controller
{
    private const APK_ASSET_NAME = 'maximus-chauffeur.apk';
    private const APK_MAX_BYTES = 157286400;

    public function latest(Request $request): JsonResponse
    {
        if (! $this->isDriver($request)) {
            return response()->json(['error' => 'Le téléchargement est réservé aux chauffeurs.'], 403);
        }

        $release = $this->latestRelease();
        if ($release instanceof JsonResponse) {
            return $release;
        }

        $asset = $release['asset'];
        $digest = (string) ($asset['digest'] ?? '');

        $releaseDetails = $release['release'];
        $tagName = (string) ($releaseDetails['tag_name'] ?? '');
        $releaseVersion = preg_replace('/^chauffeur-v/', '', $tagName) ?? $tagName;
        $releaseName = $releaseDetails['name'] ?? ($tagName !== '' ? $tagName : 'MAXIMUS Chauffeur');

        return response()->json([
            'version' => $releaseVersion,
            'name' => (string) $releaseName,
            'publishedAt' => (string) ($releaseDetails['published_at'] ?? now()->toISOString()),
            'sizeBytes' => (int) ($asset['size'] ?? 0),
            'sha256' => preg_match('/^sha256:([a-f0-9]{64})$/i', $digest, $matches) ? strtolower($matches[1]) : null,
        ]);
    }

    public function download(Request $request)
    {
        if (! $this->isDriver($request)) {
            return response()->json(['error' => 'Le téléchargement est réservé aux chauffeurs.'], 403);
        }

        $release = $this->latestRelease();
        if ($release instanceof JsonResponse) {
            return $release;
        }

        $asset = $release['asset'];
        $size = (int) ($asset['size'] ?? 0);
        if ($size < 1 || $size > self::APK_MAX_BYTES) {
            return response()->json(['error' => 'La taille de l’APK publié est invalide.'], 502);
        }

        $temporaryPath = tempnam(sys_get_temp_dir(), 'maximus-chauffeur-');
        if ($temporaryPath === false) {
            return response()->json(['error' => 'Le téléchargement est momentanément indisponible.'], 503);
        }

        try {
            $download = Http::withToken((string) config('services.github.mobile_release_token'))
                ->withHeaders([
                    'Accept' => 'application/octet-stream',
                    'X-GitHub-Api-Version' => '2022-11-28',
                    'User-Agent' => 'MAXIMUS-Chauffeur',
                ])
                ->timeout(120)
                ->sink($temporaryPath)
                ->get((string) ($asset['url'] ?? ''));

            if (! $download->successful() || filesize($temporaryPath) < 1 || filesize($temporaryPath) > self::APK_MAX_BYTES) {
                @unlink($temporaryPath);
                return response()->json(['error' => 'GitHub n’a pas fourni un APK valide.'], 502);
            }

            return response()
                ->download($temporaryPath, self::APK_ASSET_NAME, [
                    'Content-Type' => 'application/vnd.android.package-archive',
                    'Cache-Control' => 'no-store, private',
                    'X-Content-Type-Options' => 'nosniff',
                ])
                ->deleteFileAfterSend(true);
        } catch (\Throwable $exception) {
            report($exception);
            @unlink($temporaryPath);

            return response()->json(['error' => 'Le téléchargement de l’APK est momentanément indisponible.'], 502);
        }
    }

    private function latestRelease(): array|JsonResponse
    {
        $repository = (string) config('services.github.mobile_release_repository');
        $token = trim((string) config('services.github.mobile_release_token'));
        if ($token === '' || ! preg_match('#^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$#', $repository)) {
            return response()->json(['error' => 'L’accès aux versions de l’application n’est pas configuré.'], 503);
        }

        $response = Http::withToken($token)
            ->acceptJson()
            ->withHeaders([
                'X-GitHub-Api-Version' => '2022-11-28',
                'User-Agent' => 'MAXIMUS-Chauffeur',
            ])
            ->timeout(20)
            ->get("https://api.github.com/repos/{$repository}/releases?per_page=100");

        if ($response->status() === 404) {
            return response()->json(['error' => 'Aucune version APK n’a encore été publiée.'], 404);
        }
        if (! $response->successful()) {
            return response()->json(['error' => 'GitHub est momentanément indisponible.'], 502);
        }

        $releases = $response->json();
        if (! is_array($releases)) {
            return response()->json(['error' => 'GitHub a renvoyé une liste de versions invalide.'], 502);
        }

        $latestRelease = null;
        $latestVersion = null;

        foreach ($releases as $release) {
            if (! is_array($release)
                || ! empty($release['draft'])
                || ! empty($release['prerelease'])
                || ! preg_match(
                    '/^chauffeur-v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/',
                    (string) ($release['tag_name'] ?? ''),
                    $matches,
                )) {
                continue;
            }

            $asset = collect($release['assets'] ?? [])->first(
                fn (array $candidate): bool => ($candidate['name'] ?? null) === self::APK_ASSET_NAME,
            );
            if (! is_array($asset) || empty($asset['url'])) {
                continue;
            }

            $version = $matches[1];
            if ($latestVersion !== null && version_compare($version, $latestVersion, '<=')) {
                continue;
            }

            $latestRelease = ['release' => $release, 'asset' => $asset];
            $latestVersion = $version;
        }

        if ($latestRelease !== null) {
            return $latestRelease;
        }

        return response()->json(['error' => 'Aucune version APK MAXIMUS Chauffeur n’a encore été publiée.'], 404);
    }

    private function isDriver(Request $request): bool
    {
        $actor = $request->attributes->get('authActor');

        return is_array($actor)
            && ($actor['role'] ?? null) === 'employee'
            && ! empty($actor['employeeId'])
            && ! empty($actor['companyId'])
            && ModuleAuthorization::allows($actor, 'transport', 'view', 'drivers');
    }
}