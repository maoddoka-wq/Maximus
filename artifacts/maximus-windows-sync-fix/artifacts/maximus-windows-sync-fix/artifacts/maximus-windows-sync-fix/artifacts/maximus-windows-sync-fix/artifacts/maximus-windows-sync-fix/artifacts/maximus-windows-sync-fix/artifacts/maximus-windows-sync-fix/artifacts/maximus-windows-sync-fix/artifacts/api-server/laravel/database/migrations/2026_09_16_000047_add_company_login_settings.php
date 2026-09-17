<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('companies', 'login_custom_allowed')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->boolean('login_custom_allowed')->default(false);
            });
        }

        if (! Schema::hasColumn('companies', 'login_mode')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->string('login_mode', 16)->default('MAXIMUS');
            });
        }

        if (! Schema::hasColumn('companies', 'login_slug')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->string('login_slug', 180)->nullable()->unique();
            });
        }

        $used = [];
        DB::table('companies')
            ->select(['id', 'name', 'login_slug'])
            ->orderBy('created_at')
            ->get()
            ->each(function (object $company) use (&$used): void {
                $slug = is_string($company->login_slug) && $company->login_slug !== ''
                    ? $company->login_slug
                    : (Str::slug((string) $company->name) ?: 'entreprise');
                $base = $slug;
                $suffix = 2;
                while (isset($used[$slug])) {
                    $slug = $base.'-'.$suffix++;
                }
                $used[$slug] = true;
                if ($company->login_slug !== $slug) {
                    DB::table('companies')->where('id', $company->id)->update([
                        'login_slug' => $slug,
                        'updated_at' => now(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        $columns = [];
        foreach (['login_custom_allowed', 'login_mode', 'login_slug'] as $column) {
            if (Schema::hasColumn('companies', $column)) {
                $columns[] = $column;
            }
        }
        if ($columns !== []) {
            Schema::table('companies', function (Blueprint $table) use ($columns): void {
                $table->dropColumn($columns);
            });
        }
    }
};