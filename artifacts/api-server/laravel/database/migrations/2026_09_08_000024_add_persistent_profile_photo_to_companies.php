<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            if (! Schema::hasColumn('companies', 'profile_photo_data')) {
                $table->text('profile_photo_data')->nullable();
            }
            if (! Schema::hasColumn('companies', 'profile_photo_mime')) {
                $table->string('profile_photo_mime', 100)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            $columns = [];
            if (Schema::hasColumn('companies', 'profile_photo_data')) {
                $columns[] = 'profile_photo_data';
            }
            if (Schema::hasColumn('companies', 'profile_photo_mime')) {
                $columns[] = 'profile_photo_mime';
            }
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};