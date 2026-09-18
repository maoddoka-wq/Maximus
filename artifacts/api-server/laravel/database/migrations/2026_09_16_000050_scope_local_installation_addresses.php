<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maximus_installation_addresses', function (Blueprint $table): void {
            $table->dropUnique(['hostname']);
            $table->unique(['installation_id', 'url'], 'maximus_erp_installation_url_unique');
        });
        // PostgreSQL and SQLite both support partial unique indexes. Local origins
        // belong to an installation/network, not a globally routable hostname.
        DB::statement("CREATE UNIQUE INDEX maximus_erp_public_hostname_unique ON maximus_installation_addresses (hostname) WHERE validation_method = 'public'");
    }

    public function down(): void
    {
        if (DB::table('maximus_installation_addresses')->select('hostname')->groupBy('hostname')->havingRaw('COUNT(*) > 1')->exists()) {
            throw new RuntimeException('Supprimez les doublons locaux avant de restaurer l’unicité globale des hôtes.');
        }
        DB::statement('DROP INDEX maximus_erp_public_hostname_unique');
        Schema::table('maximus_installation_addresses', function (Blueprint $table): void {
            $table->dropUnique('maximus_erp_installation_url_unique');
            $table->unique('hostname');
        });
    }
};