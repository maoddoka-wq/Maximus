<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ControlTask extends Model
{
    protected $table = 'control_tasks';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'requires_approval' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}