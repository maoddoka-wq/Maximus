<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicSiteAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_company_admin_cannot_read_or_change_the_maximus_public_site_grant(): void
    {
        $user = AuthUser::query()->create([
            'id' => 'public-site-company-admin',
            'email' => 'public-site-company-admin@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administrateur KORA',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);

        $request = $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));

        $request->getJson('/api/companies/kora/public-site-access')->assertForbidden();
        $request->putJson('/api/companies/kora/public-site-access', ['authorized' => true])->assertForbidden();
    }
}