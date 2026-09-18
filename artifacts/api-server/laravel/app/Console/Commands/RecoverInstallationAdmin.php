<?php

namespace App\Console\Commands;

use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Support\InstallationContext;
use App\Support\MaximusPassword;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class RecoverInstallationAdmin extends Command
{
    protected $signature = 'maximus:recover-admin';

    protected $description = 'Récupère hors ligne un administrateur existant de cette entreprise uniquement';

    public function handle(): int
    {
        if (! InstallationContext::isCompanyOnly() || InstallationContext::companyId() === null) {
            $this->error('Récupération réservée à une installation entreprise configurée ; jamais à MAXIMUS central.');
            return self::FAILURE;
        }
        if (! $this->input->isInteractive()) {
            $this->error('Un terminal interactif est requis. Aucun mot de passe par argument ou variable d’environnement.');
            return self::FAILURE;
        }
        $companyId = InstallationContext::companyId();
        $email = strtolower(trim((string) $this->ask('Email de l’administrateur entreprise local')));
        $admin = AuthUser::query()->where('company_id', $companyId)
            ->where('role', 'company_admin')->where('email', $email)->first();
        if (! $admin) {
            $this->error('Aucun administrateur de cette entreprise ne correspond. Aucun compte ne sera créé ou promu.');
            return self::FAILURE;
        }
        $this->line('Récupération locale pour '.$email.' ; toutes ses sessions seront révoquées.');
        // false explicitly forbids Symfony's visible-input fallback on terminals
        // without hidden input support. Passwords never come from argv or env.
        $password = (string) $this->secret('Nouveau mot de passe (12 à 72 octets)', false);
        if (strlen($password) < 12 || strlen($password) > 72) {
            $this->error('Le mot de passe doit contenir entre 12 et 72 octets.');
            return self::FAILURE;
        }
        $confirmation = (string) $this->secret('Confirmer le nouveau mot de passe', false);
        if (! hash_equals($password, $confirmation)) {
            $this->error('Les mots de passe ne correspondent pas.');
            return self::FAILURE;
        }
        $hash = MaximusPassword::hash($password);
        unset($password, $confirmation);
        DB::transaction(function () use ($admin, $companyId, $hash): void {
            $current = AuthUser::query()->whereKey($admin->id)->where('company_id', $companyId)
                ->where('role', 'company_admin')->lockForUpdate()->firstOrFail();
            $current->update(['password_hash' => $hash]);
            AuthSession::query()->where('user_id', $current->id)->delete();
        });
        $this->info('Mot de passe local remplacé et sessions révoquées. Aucun appel à MAXIMUS principal.');
        return self::SUCCESS;
    }
}