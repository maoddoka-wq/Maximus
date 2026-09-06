<?php

namespace App\Console\Commands;

use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Support\MaximusPassword;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProvisionMaximusAdmin extends Command
{
    protected $signature = 'maximus:provision-admin
        {--user= : Adresse email de l’administrateur MAXIMUS}
        {--password= : Mot de passe initial, à éviter en production car visible dans la ligne de commande}';

    protected $description = 'Crée ou met à jour l’administrateur MAXIMUS depuis ADMIN_USER et ADMIN_PASSWORD';

    public function handle(): int
    {
        $email = Str::lower(trim((string) ($this->option('user') ?: env('ADMIN_USER', ''))));
        $password = (string) ($this->option('password') ?: env('ADMIN_PASSWORD', ''));

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('ADMIN_USER doit être une adresse email valide.');

            return self::FAILURE;
        }

        if (strlen($password) < 8) {
            $this->error('ADMIN_PASSWORD doit contenir au moins 8 caractères.');

            return self::FAILURE;
        }

        $emailOwner = AuthUser::query()
            ->where('email', $email)
            ->where('id', '!=', 'maximus-admin')
            ->exists();

        if ($emailOwner) {
            $this->error('ADMIN_USER est déjà utilisé par un autre compte.');

            return self::FAILURE;
        }

        $admin = AuthUser::query()->find('maximus-admin');
        $unchanged = $admin
            && $admin->email === $email
            && $admin->display_name === 'Administration MAXIMUS'
            && $admin->role === 'maximus_admin'
            && $admin->company_id === null
            && $admin->employee_id === null
            && ($admin->sector_ids ?? []) === []
            && ($admin->permissions ?? []) === []
            && $admin->status === 'ACTIF'
            && ! MaximusPassword::needsRehash($admin->password_hash)
            && MaximusPassword::check($password, $admin->password_hash);

        if ($unchanged) {
            $this->info('Administrateur MAXIMUS déjà conforme.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($admin, $email, $password): void {
            $values = [
                'email' => $email,
                'password_hash' => MaximusPassword::hash($password),
                'display_name' => 'Administration MAXIMUS',
                'role' => 'maximus_admin',
                'company_id' => null,
                'employee_id' => null,
                'sector_ids' => [],
                'permissions' => [],
                'status' => 'ACTIF',
                'updated_at' => now(),
            ];

            if ($admin) {
                $admin->update($values);
                AuthSession::query()->where('user_id', $admin->id)->delete();

                return;
            }

            AuthUser::query()->create(array_merge($values, [
                'id' => 'maximus-admin',
                'created_at' => now(),
            ]));
        });

        $this->info('Administrateur MAXIMUS provisionné.');

        return self::SUCCESS;
    }
}