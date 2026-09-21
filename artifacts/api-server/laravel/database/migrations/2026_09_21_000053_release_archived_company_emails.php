<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_email_unique');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS companies_active_email_unique ON companies (email) WHERE deleted_at IS NULL');

            DB::statement('ALTER TABLE auth_users DROP CONSTRAINT IF EXISTS auth_users_email_unique');
            DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS auth_users_active_email_unique ON auth_users (email) WHERE status = 'ACTIF'");
            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS companies_email_unique');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS companies_active_email_unique ON companies (email) WHERE deleted_at IS NULL');
            DB::statement('DROP INDEX IF EXISTS auth_users_email_unique');
            DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS auth_users_active_email_unique ON auth_users (email) WHERE status = 'ACTIF'");
            return;
        }

        throw new \RuntimeException('La libération conditionnelle des emails nécessite PostgreSQL ou SQLite.');
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS companies_active_email_unique');
            DB::statement('CREATE UNIQUE INDEX companies_email_unique ON companies (email)');
            DB::statement('DROP INDEX IF EXISTS auth_users_active_email_unique');
            DB::statement('CREATE UNIQUE INDEX auth_users_email_unique ON auth_users (email)');
            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS companies_active_email_unique');
            DB::statement('CREATE UNIQUE INDEX companies_email_unique ON companies (email)');
            DB::statement('DROP INDEX IF EXISTS auth_users_active_email_unique');
            DB::statement('CREATE UNIQUE INDEX auth_users_email_unique ON auth_users (email)');
            return;
        }

        throw new \RuntimeException('La restauration des contraintes email nécessite PostgreSQL ou SQLite.');
    }
};