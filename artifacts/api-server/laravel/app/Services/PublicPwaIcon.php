<?php

namespace App\Services;

use InvalidArgumentException;
use RuntimeException;

final class PublicPwaIcon
{
    public static function manifestIcons(?string $logoUrl): array
    {
        $logoUrl = trim((string) $logoUrl);
        $icons = [];

        if (
            $logoUrl !== ''
            && function_exists('imagecreatefromstring')
            && preg_match('#^/api/store-logos/[^/?]+/[^/?]+$#', $logoUrl)
        ) {
            foreach ([192, 512] as $size) {
                $icons[] = [
                    'src' => $logoUrl.'?pwa_size='.$size,
                    'sizes' => $size.'x'.$size,
                    'type' => 'image/png',
                    'purpose' => 'any',
                ];
            }
        } elseif ($logoUrl !== '' && $logoUrl !== '/admin-logo.png') {
            $icons[] = [
                'src' => $logoUrl,
                'purpose' => 'any',
            ];
        }

        foreach ([192, 512] as $size) {
            $icons[] = [
                'src' => '/pwa-icon-'.$size.'.png',
                'sizes' => $size.'x'.$size,
                'type' => 'image/png',
                'purpose' => 'any',
            ];
        }

        return $icons;
    }

    public static function renderPng(string $imageBytes, int $size): string
    {
        if (! in_array($size, [192, 512], true)) {
            throw new InvalidArgumentException('La taille d’icône PWA doit être 192 ou 512 pixels.');
        }
        if (! function_exists('imagecreatefromstring') || ! function_exists('imagepng')) {
            throw new RuntimeException('L’extension GD est nécessaire pour produire les icônes PWA.');
        }

        $dimensions = @getimagesizefromstring($imageBytes);
        if (! is_array($dimensions) || ($dimensions[0] ?? 0) < 1 || ($dimensions[1] ?? 0) < 1
            || $dimensions[0] > 10000 || $dimensions[1] > 10000) {
            throw new RuntimeException('Le fichier du logo ne contient pas une image de dimensions valides.');
        }

        $source = @imagecreatefromstring($imageBytes);
        if ($source === false) {
            throw new RuntimeException('Le logo ne peut pas être lu pour créer une icône PWA.');
        }

        $canvas = imagecreatetruecolor($size, $size);
        if ($canvas === false) {
            imagedestroy($source);
            throw new RuntimeException('Le canevas de l’icône PWA ne peut pas être créé.');
        }

        try {
            imagealphablending($canvas, false);
            imagesavealpha($canvas, true);
            $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
            imagefill($canvas, 0, 0, $transparent);
            imagealphablending($canvas, true);

            $sourceWidth = imagesx($source);
            $sourceHeight = imagesy($source);
            $scale = min(($size * 0.8) / $sourceWidth, ($size * 0.8) / $sourceHeight);
            $targetWidth = max(1, (int) round($sourceWidth * $scale));
            $targetHeight = max(1, (int) round($sourceHeight * $scale));
            $targetX = (int) floor(($size - $targetWidth) / 2);
            $targetY = (int) floor(($size - $targetHeight) / 2);

            if (! imagecopyresampled(
                $canvas,
                $source,
                $targetX,
                $targetY,
                0,
                0,
                $targetWidth,
                $targetHeight,
                $sourceWidth,
                $sourceHeight,
            )) {
                throw new RuntimeException('Le logo n’a pas pu être redimensionné.');
            }

            ob_start();
            $encoded = imagepng($canvas);
            $png = ob_get_clean();
            if (! $encoded || ! is_string($png) || $png === '') {
                throw new RuntimeException('L’icône PWA ne peut pas être encodée en PNG.');
            }

            return $png;
        } finally {
            imagedestroy($source);
            imagedestroy($canvas);
        }
    }
}