<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class ModuleProductImageStorage
{
    public function store(string $module, string $companyId, string $productId, UploadedFile $image): string
    {
        $path = $this->path($module, $companyId, $productId);
        $temporaryPath = dirname($path).'/.upload-'.Str::uuid();
        $disk = Storage::disk('module-product-images');
        $stream = fopen($image->getRealPath(), 'rb');

        if ($stream === false) {
            throw new RuntimeException('La photo n’a pas pu être lue après son envoi.');
        }

        try {
            if (! $disk->put($temporaryPath, $stream) || ! $disk->move($temporaryPath, $path)) {
                throw new RuntimeException('La photo n’a pas pu être enregistrée sur le disque.');
            }
        } finally {
            fclose($stream);
            $disk->delete($temporaryPath);
        }

        return $this->url($module, $productId);
    }

    public function delete(string $module, string $companyId, string $productId): void
    {
        Storage::disk('module-product-images')->delete($this->path($module, $companyId, $productId));
    }

    public function exists(string $module, string $companyId, string $productId): bool
    {
        return Storage::disk('module-product-images')->exists($this->path($module, $companyId, $productId));
    }

    public function response(string $module, string $companyId, string $productId)
    {
        $disk = Storage::disk('module-product-images');
        $path = $this->path($module, $companyId, $productId);

        if (! $disk->exists($path)) {
            abort(404);
        }

        return response()->file($disk->path($path), [
            'Content-Type' => $disk->mimeType($path) ?: 'application/octet-stream',
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function url(string $module, string $productId): string
    {
        $this->assertPart($productId);

        return match ($module) {
            'commerce' => '/api/commerce/products/'.rawurlencode($productId).'/image',
            'stocks' => '/api/stock/products/'.rawurlencode($productId).'/image',
            default => throw new InvalidArgumentException('Module de stockage photo invalide.'),
        };
    }

    private function path(string $module, string $companyId, string $productId): string
    {
        if (! in_array($module, ['commerce', 'stocks'], true)) {
            throw new InvalidArgumentException('Module de stockage photo invalide.');
        }

        $this->assertPart($companyId);
        $this->assertPart($productId);

        return $module.'/'.$companyId.'/'.$productId.'/photo';
    }

    private function assertPart(string $value): void
    {
        if (! preg_match('/^[A-Za-z0-9_-]+$/', $value)) {
            throw new InvalidArgumentException('Identifiant de photo invalide.');
        }
    }
}