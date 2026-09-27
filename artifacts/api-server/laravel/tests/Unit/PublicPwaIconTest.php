<?php

namespace Tests\Unit;

use App\Services\PublicPwaIcon;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class PublicPwaIconTest extends TestCase
{
    public function test_manifest_icons_include_exact_sizes_and_a_brand_logo_variant(): void
    {
        $icons = PublicPwaIcon::manifestIcons('/api/store-logos/kora/logo.png');

        $this->assertSame('/api/store-logos/kora/logo.png?pwa_size=192', $icons[0]['src']);
        $this->assertSame('192x192', $icons[0]['sizes']);
        $this->assertSame('/api/store-logos/kora/logo.png?pwa_size=512', $icons[1]['src']);
        $this->assertSame('512x512', $icons[1]['sizes']);
        $this->assertSame('/pwa-icon-192.png', $icons[2]['src']);
        $this->assertSame('/pwa-icon-512.png', $icons[3]['src']);
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