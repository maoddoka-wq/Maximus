<?php

namespace App\Support;

use App\Models\AuthSession;
use App\Models\AuthUser;

final class AuthIdentityRetirement
{
    /**
     * Retire a login identity without deleting the user or its tenant history.
     *
     * The caller is responsible for opening a transaction when this operation is
     * part of a larger archive/delete workflow.
     */
    public function retireUser(AuthUser $user): void
    {
        $user->update([
            'email' => 'archived+'.hash('sha256', (string) $user->getKey()).'@identity.invalid',
            'status' => 'SUSPENDU',
            'updated_at' => now(),
        ]);

        AuthSession::query()->where('user_id', $user->getKey())->delete();
    }
}