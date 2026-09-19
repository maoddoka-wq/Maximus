<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            $table->dropUnique('companies_email_unique');
        });
        DB::statement('CREATE UNIQUE INDEX companies_email_active_unique ON companies (email) WHERE deleted_at IS NULL');

        DB::transaction(function (): void {
            $archivedUsers = DB::table('auth_users')
                ->join('companies', 'companies.id', '=', 'auth_users.company_id')
                ->whereNotNull('companies.deleted_at')
                ->select('auth_users.id')
                ->get();

            foreach ($archivedUsers as $user) {
                DB::table('auth_users')->where('id', $user->id)->update([
                    'email' => 'archived+'.hash('sha256', (string) $user->id).'@identity.invalid',
                    'status' => 'SUSPENDU',
                    'updated_at' => now(),
                ]);
                DB::table('auth_sessions')->where('user_id', $user->id)->delete();
            }
        });
    }

    public function down(): void
    {
        if (DB::table('companies')->select('email')->groupBy('email')->havingRaw('COUNT(*) > 1')->exists()) {
            throw new RuntimeException('Les emails réutilisés doivent être rendus uniques avant de restaurer la contrainte globale.');
        }

        DB::statement('DROP INDEX IF EXISTS companies_email_active_unique');
        Schema::table('companies', function (Blueprint $table): void {
            $table->unique('email');
        });
    }
};