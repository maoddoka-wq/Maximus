<?php

namespace Tests\Feature;

use App\Http\Middleware\VerifyCookieRequestOrigin;
use App\Support\EcommerceCustomerAuth;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class CookieRequestOriginTest extends TestCase
{
    use RefreshDatabase;

    public function test_cross_site_mutation_with_maximus_cookie_is_rejected(): void
    {
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, 'session-token')
            ->withHeader('Origin', 'https://attacker.example')
            ->postJson('/api/auth/logout')
            ->assertForbidden()
            ->assertJsonPath('code', 'COOKIE_REQUEST_ORIGIN_FORBIDDEN');
    }

    public function test_mutation_with_cookie_and_no_origin_or_referer_is_rejected(): void
    {
        $this->withCredentials()
            ->withoutHeader('Origin')
            ->withUnencryptedCookie(MaximusAuth::COOKIE, 'session-token')
            ->postJson('/api/auth/logout')
            ->assertForbidden()
            ->assertJsonPath('code', 'COOKIE_REQUEST_ORIGIN_FORBIDDEN');
    }

    public function test_same_origin_mutation_with_maximus_cookie_is_allowed(): void
    {
        config(['app.url' => 'http://localhost']);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, 'session-token')
            ->withHeader('Origin', 'http://localhost')
            ->postJson('/api/auth/logout')
            ->assertNoContent();
    }

    public function test_same_origin_referer_is_accepted_when_origin_is_absent(): void
    {
        config(['app.url' => 'http://localhost']);

        $this->withCredentials()
            ->withoutHeader('Origin')
            ->withUnencryptedCookie(MaximusAuth::COOKIE, 'session-token')
            ->withHeader('Referer', 'http://localhost/account')
            ->postJson('/api/auth/logout')
            ->assertNoContent();
    }

    public function test_explicitly_allowed_store_origin_is_accepted(): void
    {
        config([
            'app.url' => 'http://localhost',
            'maximus.allowed_origins' => ['https://shop.example'],
        ]);

        $this->withCredentials()
            ->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, 'customer-session')
            ->withHeader('Origin', 'https://shop.example')
            ->postJson('/api/auth/logout')
            ->assertNoContent();
    }

    public function test_bearer_request_without_cookie_is_not_blocked_by_origin_guard(): void
    {
        $request = Request::create('http://localhost/api/installations/sync', 'POST', [], [], [], [
            'HTTP_ORIGIN' => 'https://machine.example',
            'HTTP_AUTHORIZATION' => 'Bearer machine-token',
        ]);

        $response = app(VerifyCookieRequestOrigin::class)->handle(
            $request,
            static fn () => response()->noContent(),
        );

        $this->assertSame(204, $response->getStatusCode());
    }

    public function test_cross_site_mutation_with_ecommerce_customer_cookie_is_rejected(): void
    {
        $this->withCredentials()
            ->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, 'customer-session')
            ->withHeader('Origin', 'https://attacker.example')
            ->postJson('/api/auth/logout')
            ->assertForbidden()
            ->assertJsonPath('code', 'COOKIE_REQUEST_ORIGIN_FORBIDDEN');
    }
}
