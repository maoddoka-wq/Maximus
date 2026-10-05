<?php

namespace Tests\Support;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

abstract class NotificationPushTestCase extends TestCase
{
    /** @var list<string> */
    protected array $testUserIds = [];

    protected ?object $previousWorkspaceState = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ensureNotificationTables();
        $this->previousWorkspaceState = DB::table('maximus_app_states')
            ->where('scope', 'workspace')
            ->first();
    }

    protected function tearDown(): void
    {
        if ($this->previousWorkspaceState === null) {
            DB::table('maximus_app_states')->where('scope', 'workspace')->delete();
        } else {
            DB::table('maximus_app_states')->updateOrInsert(
                ['scope' => 'workspace'],
                [
                    'company_id' => $this->previousWorkspaceState->company_id,
                    'payload' => $this->previousWorkspaceState->payload,
                    'version' => $this->previousWorkspaceState->version,
                    'created_at' => $this->previousWorkspaceState->created_at,
                    'updated_at' => $this->previousWorkspaceState->updated_at,
                ],
            );
        }

        if ($this->testUserIds !== []) {
            DB::table('maximus_push_subscriptions')->whereIn('auth_user_id', $this->testUserIds)->delete();
            DB::table('auth_sessions')->whereIn('user_id', $this->testUserIds)->delete();
            DB::table('auth_users')->whereIn('id', $this->testUserIds)->delete();
        }

        parent::tearDown();
    }

    protected function createPushTestUser(
        string $role,
        ?string $companyId = null,
        string $status = 'ACTIF',
    ): AuthUser {
        $id = 'push-test-'.str()->uuid();
        $this->testUserIds[] = $id;

        return AuthUser::query()->create([
            'id' => $id,
            'email' => $id.'@notifications.test',
            'password_hash' => 'unused-test-only',
            'display_name' => $id,
            'role' => $role,
            'company_id' => $companyId,
            'sector_ids' => [],
            'status' => $status,
        ]);
    }

    protected function loginAsPushTestUser(AuthUser $user): void
    {
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }

    private function ensureNotificationTables(): void
    {
        if (! Schema::hasTable('auth_users')) {
            Schema::create('auth_users', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('email')->unique();
                $table->text('password_hash');
                $table->string('display_name');
                $table->string('phone')->nullable();
                $table->string('role');
                $table->string('company_id')->nullable();
                $table->string('employee_id')->nullable();
                $table->json('sector_ids')->default('[]');
                $table->json('permissions')->default('{}');
                $table->string('status')->default('ACTIF');
                $table->timestampsTz();
            });
        }

        if (! Schema::hasTable('auth_sessions')) {
            Schema::create('auth_sessions', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('token_hash')->unique();
                $table->string('user_id');
                $table->timestampTz('expires_at');
                $table->timestampTz('created_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('maximus_app_states')) {
            Schema::create('maximus_app_states', function (Blueprint $table): void {
                $table->string('scope')->primary();
                $table->string('company_id')->nullable()->index();
                $table->json('payload')->default('{}');
                $table->unsignedBigInteger('version')->default(1);
                $table->timestampsTz();
            });
        }

        if (! Schema::hasTable('maximus_push_notification_settings')) {
            Schema::create('maximus_push_notification_settings', function (Blueprint $table): void {
                $table->unsignedTinyInteger('id')->primary();
                $table->string('public_key', 128)->nullable();
                $table->longText('private_key_encrypted')->nullable();
                $table->timestampsTz();
            });
        }
        DB::table('maximus_push_notification_settings')->insertOrIgnore([
            'id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (! Schema::hasTable('maximus_push_subscriptions')) {
            Schema::create('maximus_push_subscriptions', function (Blueprint $table): void {
                $table->char('endpoint_hash', 64)->primary();
                $table->text('endpoint_encrypted');
                $table->text('p256dh_encrypted');
                $table->text('auth_secret_encrypted');
                $table->string('auth_user_id');
                $table->timestampsTz();
                $table->foreign('auth_user_id')->references('id')->on('auth_users')->cascadeOnDelete();
            });
        }
    }
}
