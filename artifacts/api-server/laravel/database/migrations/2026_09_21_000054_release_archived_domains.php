<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('ecommerce_domains', 'deleted_at')) {
            Schema::table('ecommerce_domains', function (Blueprint $table): void {
                $table->timestampTz('deleted_at')->nullable()->index();
            });
        }

        $driver = DB::connection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE ecommerce_domains DROP CONSTRAINT IF EXISTS ecommerce_domains_domain_unique');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS ecommerce_domains_active_domain_unique ON ecommerce_domains (domain) WHERE deleted_at IS NULL');
            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS ecommerce_domains_domain_unique');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS ecommerce_domains_active_domain_unique ON ecommerce_domains (domain) WHERE deleted_at IS NULL');
            return;
        }

        throw new \RuntimeException('La libération conditionnelle des domaines nécessite PostgreSQL ou SQLite.');
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'pgsql' || $driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS ecommerce_domains_active_domain_unique');
            DB::statement('CREATE UNIQUE INDEX ecommerce_domains_domain_unique ON ecommerce_domains (domain)');
            Schema::table('ecommerce_domains', function (Blueprint $table): void {
                $table->dropColumn('deleted_at');
            });
            return;
        }

        throw new \RuntimeException('La restauration de la contrainte domaine nécessite PostgreSQL ou SQLite.');
    }
};