<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MobileAuthToken extends Model
{
    protected $table = 'auth_mobile_tokens';

    public $timestamps = false;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'token_hash',
        'device_name',
        'expires_at',
        'created_at',
        'last_used_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'created_at' => 'datetime',
            'last_used_at' => 'datetime',
        ];
    }
}