<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maximus_push_notification_settings', function (Blueprint $table): void {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('public_key', 128)->nullable();
            $table->longText('private_key_encrypted')->nullable();
            $table->timestampsTz();
        });

        DB::table('maximus_push_notification_settings')->insert([
            'id' => 1,
            'public_key' => null,
            'private_key_encrypted' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::create('maximus_push_subscriptions', function (Blueprint $table): void {
            $table->char('endpoint_hash', 64)->primary();
            $table->text('endpoint_encrypted');
            $table->text('p256dh_encrypted');
            $table->text('auth_secret_encrypted');
            $table->string('auth_user_id');
            $table->timestampsTz();
            $table->foreign('auth_user_id')->references('id')->on('auth_users')->cascadeOnDelete();
            $table->index('auth_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maximus_push_subscriptions');
        Schema::dropIfExists('maximus_push_notification_settings');
    }
};
