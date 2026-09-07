<?php

namespace Tests\Feature;

use App\Http\Controllers\PublicPageController;
use Illuminate\Http\Request;
use Tests\TestCase;

class PublicPageTest extends TestCase
{
    public function test_public_urls_use_the_forwarded_https_origin_without_backend_port(): void
    {
        $request = Request::create(
            'http://maximus-erp.onrender.com/payment/callback',
            'GET',
            [],
            [],
            [],
            [
                'HTTP_X_FORWARDED_PROTO' => 'https',
                'HTTP_X_FORWARDED_PORT' => '443',
            ],
        );
        $response = app(PublicPageController::class)->root($request, 'payment/callback');

        self::assertSame(200, $response->getStatusCode());
        self::assertStringContainsString(
            'https://maximus-erp.onrender.com/payment/callback',
            (string) $response->getContent(),
        );
        self::assertStringNotContainsString(
            'https://maximus-erp.onrender.com:80',
            (string) $response->getContent(),
        );
    }
}