<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiagnosticToken extends Model
{
    protected $table = 'diagnostic_tokens';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}