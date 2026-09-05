<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\AuthSession;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaximusAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_is_available(): void
    {
        $this->getJson('/api/healthz')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }

    public function test_laravel_accepts_the_existing_maximus_scrypt_format(): void
    {
        $this->assertTrue(MaximusPassword::check(
            'Admin123!',
            '00112233445566778899aabbccddeeff:7d58074f125b628bb6ab7efe859197b97dfdd595cf3e2a94157706bbee17271cd456d4234ecded4d1e199891d780bbc6df38b9cee2bf4a7e719bb15bc78c128b',
        ));

        $hash = MaximusPassword::hash('Admin123!', '00112233445566778899aabbccddeeff');

        $this->assertTrue(MaximusPassword::check('Admin123!', $hash));
        $this->assertFalse(MaximusPassword::check('wrong-password', $hash));
    }

    public function test_login_creates_a_compatible_session_cookie(): void
    {
        AuthUser::query()->create([
            'id' => 'maximus-admin',
            'email' => 'admin@maximus.demo',
            'password_hash' => MaximusPassword::hash('Admin123!', '00112233445566778899aabbccddeeff'),
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);

        $login = $this->postJson('/api/auth/login', [
            'email' => 'ADMIN@MAXIMUS.DEMO',
            'password' => 'Admin123!',
        ]);

        $login
            ->assertOk()
            ->assertJsonPath('user.role', 'maximus_admin')
            ->assertJsonPath('user.displayName', 'Administration MAXIMUS')
            ->assertCookie('maximus_session');

        $cookie = $login->getCookie('maximus_session', false)->getValue();
        $storedSession = AuthSession::query()->first();
        $this->assertNotNull($storedSession);
        $this->assertSame($storedSession->token_hash, MaximusAuth::hashToken($cookie));
        $session = $this
            ->withCredentials()
            ->withUnencryptedCookie('maximus_session', $cookie)
            ->getJson('/api/auth/session');

        $session
            ->assertOk()
            ->assertJsonPath('user.role', 'maximus_admin')
            ->assertJsonPath('user.displayName', 'Administration MAXIMUS');
    }
}