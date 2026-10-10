<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('auth_users')) {
            return;
        }

        Schema::table('auth_users', function (Blueprint $table): void {
            if (! Schema::hasColumn('auth_users', 'last_login_at')) {
                $table->timestampTz('last_login_at')->nullable();
            }
            if (! Schema::hasColumn('auth_users', 'last_seen_at')) {
                $table->timestampTz('last_seen_at')->nullable()->index();
            }
        });

        if (Schema::hasTable('auth_sessions')) {
            DB::statement(
                'UPDATE auth_users
                 SET last_login_at = (
                    SELECT MAX(auth_sessions.created_at)
                    FROM auth_sessions
                    WHERE auth_sessions.user_id = auth_users.id
                 )
                 WHERE last_login_at IS NULL
                   AND EXISTS (
                    SELECT 1 FROM auth_sessions WHERE auth_sessions.user_id = auth_users.id
                 )',
            );
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('auth_users')) {
            return;
        }

        Schema::table('auth_users', function (Blueprint $table): void {
            if (Schema::hasColumn('auth_users', 'last_seen_at')) {
                $table->dropIndex(['last_seen_at']);
                $table->dropColumn('last_seen_at');
            }
            if (Schema::hasColumn('auth_users', 'last_login_at')) {
                $table->dropColumn('last_login_at');
            }
        });
    }
};
