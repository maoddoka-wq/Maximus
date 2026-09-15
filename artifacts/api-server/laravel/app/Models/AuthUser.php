<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuthUser extends Model
{
    protected $table = 'auth_users';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'email',
        'password_hash',
        'display_name',
        'phone',
        'role',
        'company_id',
        'employee_id',
        'sector_ids',
        'permissions',
        'is_general_direction',
        'status',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected function casts(): array
    {
        return [
            'sector_ids' => 'array',
            'permissions' => 'array',
            'is_general_direction' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
