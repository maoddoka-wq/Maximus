<?php

namespace Tests\Unit;

use App\Services\PublicPwaIcon;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class PublicPwaIconTest extends TestCase
{
    public function test_manifest_icons_use_only_the_uploaded_brand_logo(): void
    {
        $icons = PublicPwaIcon::manifestIcons('/api/store-logos/kora/logo.png');

        if (! function_exists('imagecreatefromstring')) {
            $this->assertSame([
                ['src' => '/api/store-logos/kora/logo.png', 'purpose' => 'any'],
            ], $icons);
            return;
        }

        $this->assertCount(2, $icons);
        $this->assertSame('/api/store-logos/kora/logo.png?pwa_size=192', $icons[0]['src']);
        $this->assertSame('192x192', $icons[0]['sizes']);
        $this->assertSame('/api/store-logos/kora/logo.png?pwa_size=512', $icons[1]['src']);
        $this->assertSame('512x512', $icons[1]['sizes']);
    }

    public function test_manifest_icons_use_maximus_defaults_only_when_no_brand_logo_exists(): void
    {
        $icons = PublicPwaIcon::manifestIcons(null);

        $this->assertSame('/pwa-icon-192.png', $icons[0]['src']);
        $this->assertSame('/pwa-icon-512.png', $icons[1]['src']);
    }

    public function test_direct_brand_logo_does_not_add_maximus_fallback_icons(): void
    {
        $icons = PublicPwaIcon::manifestIcons('https://cdn.example.test/logo.png');

        $this->assertSame([
            ['src' => 'https://cdn.example.test/logo.png', 'purpose' => 'any'],
        ], $icons);
    }

    public function test_icon_renderer_outputs_square_png_at_the_requested_size(): void
    {
        if (! function_exists('imagecreatetruecolor')) {
            $this->markTestSkipped('L’extension GD n’est pas disponible.');
        }

        $source = imagecreatetruecolor(48, 24);
        $color = imagecolorallocate($source, 25, 80, 150);
        imagefill($source, 0, 0, $color);
        ob_start();
        imagepng($source);
        $sourceBytes = ob_get_clean();
        imagedestroy($source);

        $png = PublicPwaIcon::renderPng((string) $sourceBytes, 192);
        $dimensions = getimagesizefromstring($png);

        $this->assertIsArray($dimensions);
        $this->assertSame(192, $dimensions[0]);
        $this->assertSame(192, $dimensions[1]);
        $this->assertSame('image/png', $dimensions['mime']);
    }

    public function test_icon_renderer_rejects_unadvertised_sizes(): void
    {
        $this->expectException(InvalidArgumentException::class);

        PublicPwaIcon::renderPng('not-an-image', 256);
    }
}