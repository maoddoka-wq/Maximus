<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $table = 'companies';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'manager',
        'email',
        'phone',
        'country',
        'sector',
        'status',
        'requested_modules',
        'requested_module_pack_ids',
        'requested_module_features',
        'requested_module_permissions',
        'profile_photo',
        'primary_color',
        'accent_color',
        'sidebar_color',
        'rejection_reason',
        'deleted_at',
    ];

    protected function casts(): array
    {
        return [
            'requested_modules' => 'array',
            'requested_module_pack_ids' => 'array',
            'requested_module_features' => 'array',
            'requested_module_permissions' => 'array',
            'deleted_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}